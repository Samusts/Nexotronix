// ============================================================
// /api/wallets
// GET  — get partner wallet balance + transactions
// POST — request withdrawal
// PUT  — approve/reject/mark-paid withdrawal (superadmin only)
// ============================================================
import { getOne, getMany, query } from '../../lib/db.js';
import { sanitizeString, auditLog } from '../../lib/security.js';
import { verifySession, successRes, errorRes, unauthorized } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const session = await verifySession(req, ['superadmin', 'partner']);
  if (!session) return unauthorized();

  // ── GET wallet + transactions ────────────────────────────
  if (req.method === 'GET') {
    const partnerId = session.user_type === 'superadmin'
      ? req.query?.partnerId
      : session.user_id;

    if (!partnerId) {
      // Superadmin: return all wallet summaries
      const wallets = await getMany(
        `SELECT w.*, p.business_name, p.email
         FROM wallets w
         JOIN partners p ON p.id = w.partner_id
         ORDER BY w.available_balance DESC`
      );
      return successRes({ wallets });
    }

    const wallet = await getOne(
      'SELECT * FROM wallets WHERE partner_id = $1',
      [partnerId]
    );

    const transactions = await getMany(
      `SELECT * FROM wallet_transactions
       WHERE wallet_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [wallet?.id]
    );

    const pendingWithdrawals = await getMany(
      `SELECT * FROM withdrawals
       WHERE partner_id = $1 AND status IN ('pending','approved')
       ORDER BY created_at DESC`,
      [partnerId]
    );

    return successRes({ wallet, transactions, pendingWithdrawals });
  }

  // ── POST — Request withdrawal ────────────────────────────
  if (req.method === 'POST' && session.user_type === 'partner') {
    const { amount, bankName, accountNumber, accountName } = req.body || {};
    if (!amount || !bankName || !accountNumber || !accountName) {
      return errorRes('All withdrawal fields are required');
    }

    const wallet = await getOne(
      'SELECT * FROM wallets WHERE partner_id = $1',
      [session.user_id]
    );
    if (!wallet) return errorRes('Wallet not found');

    const withdrawAmount = Number(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return errorRes('Invalid amount');
    }
    if (withdrawAmount > Number(wallet.available_balance)) {
      return errorRes('Insufficient available balance');
    }

    // Check 7-day hold: only funds older than 7 days are withdrawable
    const availableForWithdrawal = await getOne(
      `SELECT COALESCE(SUM(amount), 0) as withdrawable
       FROM wallet_transactions
       WHERE wallet_id = $1
       AND type = 'credit'
       AND (hold_release_at IS NULL OR hold_release_at < NOW())`,
      [wallet.id]
    );

    const withdrawable = Number(availableForWithdrawal?.withdrawable || 0);
    if (withdrawAmount > withdrawable) {
      return errorRes(`Only ₦${withdrawable.toLocaleString()} is available (7-day hold on recent sales)`);
    }

    const withdrawal = await query(
      `INSERT INTO withdrawals
       (partner_id, amount, bank_name, account_number, account_name, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [
        session.user_id, withdrawAmount,
        sanitizeString(bankName, 100),
        sanitizeString(accountNumber, 20),
        sanitizeString(accountName, 100)
      ]
    );

    await auditLog(session.user_id, 'partner', 'WITHDRAWAL_REQUEST',
      'withdrawals', withdrawal.rows[0].id, { amount: withdrawAmount }, ip);

    return successRes({ withdrawal: withdrawal.rows[0] });
  }

  // ── PUT — Approve / Reject / Mark Paid (superadmin only) ─
  if (req.method === 'PUT' && session.user_type === 'superadmin') {
    const { withdrawalId, action, note } = req.body || {};
    if (!withdrawalId || !['approve', 'reject', 'mark_paid'].includes(action)) {
      return errorRes('Missing withdrawalId or invalid action');
    }

    const withdrawal = await getOne(
      'SELECT w.*, wa.id as wallet_id FROM withdrawals w JOIN wallets wa ON wa.partner_id = w.partner_id WHERE w.id = $1',
      [withdrawalId]
    );
    if (!withdrawal) return errorRes('Withdrawal not found');

    if (action === 'approve') {
      await query(
        `UPDATE withdrawals SET status = 'approved', approved_at = NOW() WHERE id = $1`,
        [withdrawalId]
      );
    }

    if (action === 'reject') {
      await query(
        `UPDATE withdrawals SET status = 'rejected', rejection_reason = $1 WHERE id = $2`,
        [sanitizeString(note || 'Rejected by admin', 500), withdrawalId]
      );
    }

    if (action === 'mark_paid') {
      if (withdrawal.status !== 'approved') {
        return errorRes('Withdrawal must be approved before marking as paid');
      }
      // Deduct from wallet
      await query(
        `UPDATE wallets
         SET available_balance = available_balance - $1,
             total_withdrawn = total_withdrawn + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [withdrawal.amount, withdrawal.wallet_id]
      );
      await query(
        `INSERT INTO wallet_transactions
         (wallet_id, type, amount, balance_after, description)
         SELECT $1, 'debit', $2, available_balance, 'Withdrawal paid'
         FROM wallets WHERE id = $1`,
        [withdrawal.wallet_id, withdrawal.amount]
      );
      await query(
        `UPDATE withdrawals SET status = 'paid', paid_at = NOW() WHERE id = $1`,
        [withdrawalId]
      );
    }

    await auditLog(session.user_id, 'superadmin',
      `WITHDRAWAL_${action.toUpperCase()}`, 'withdrawals', withdrawalId, {}, ip);

    return successRes({ ok: true });
  }

  return errorRes('Method not allowed', 405);
}
