// /api/wallets
import { getOne, getMany, query } from '../lib/db.js';
import { sanitizeString, auditLog } from '../lib/security.js';
import { corsHeaders } from '../lib/cors.js';

function jsonRes(d,s=200,o=''){return new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json',...corsHeaders(o)}});}
async function getSession(req){const t=(req.headers['authorization']||'').replace('Bearer ','').trim();if(!t)return null;return getOne('SELECT * FROM sessions WHERE token=$1 AND expires_at>NOW()',[t]);}

export default async function handler(req,res){
  const origin=req.headers['origin']||'';
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(origin)});
  const ip=req.headers['x-forwarded-for']||'unknown';
  const session=await getSession(req);
  if(!session)return jsonRes({error:'Unauthorized'},401,origin);
  const body=req.body||{};
  const action=req.query?.action;

  if(req.method==='GET'){
    const partnerId=session.user_type==='superadmin'?req.query?.partnerId:session.user_id;
    if(!partnerId){const wallets=await getMany('SELECT w.*,p.business_name,p.email FROM wallets w JOIN partners p ON p.id=w.partner_id ORDER BY w.available_balance DESC');return jsonRes({wallets},200,origin);}
    const wallet=await getOne('SELECT * FROM wallets WHERE partner_id=$1',[partnerId]);
    const transactions=wallet?await getMany('SELECT * FROM wallet_transactions WHERE wallet_id=$1 ORDER BY created_at DESC LIMIT 50',[wallet.id]):[];
    const pendingWithdrawals=await getMany("SELECT * FROM withdrawals WHERE partner_id=$1 AND status IN ('pending','approved') ORDER BY created_at DESC",[partnerId]);
    return jsonRes({wallet,transactions,pendingWithdrawals},200,origin);
  }

  if(req.method==='POST'&&action==='withdraw'&&session.user_type==='partner'){
    const{amount,bankName,accountNumber,accountName}=body;
    if(!amount||!bankName||!accountNumber||!accountName)return jsonRes({error:'All fields required'},400,origin);
    const wallet=await getOne('SELECT * FROM wallets WHERE partner_id=$1',[session.user_id]);
    if(!wallet)return jsonRes({error:'Wallet not found'},404,origin);
    const amt=Number(amount);
    if(isNaN(amt)||amt<=0)return jsonRes({error:'Invalid amount'},400,origin);
    if(amt>Number(wallet.available_balance))return jsonRes({error:'Insufficient balance'},400,origin);
    const r=await query("INSERT INTO withdrawals (partner_id,amount,bank_name,account_number,account_name,status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *",[session.user_id,amt,sanitizeString(bankName,100),sanitizeString(accountNumber,20),sanitizeString(accountName,100)]);
    await auditLog(session.user_id,'partner','WITHDRAWAL_REQUEST','withdrawals',r.rows[0].id,{amount:amt},ip);
    return jsonRes({withdrawal:r.rows[0]},200,origin);
  }

  if(req.method==='POST'&&action==='process'&&session.user_type==='superadmin'){
    const{withdrawalId,decision}=body;
    if(!withdrawalId||!['approve','reject','mark_paid'].includes(decision))return jsonRes({error:'Invalid'},400,origin);
    const wd=await getOne('SELECT w.*,wa.id as wallet_id FROM withdrawals w JOIN wallets wa ON wa.partner_id=w.partner_id WHERE w.id=$1',[withdrawalId]);
    if(!wd)return jsonRes({error:'Not found'},404,origin);
    if(decision==='approve')await query("UPDATE withdrawals SET status='approved',approved_at=NOW() WHERE id=$1",[withdrawalId]);
    if(decision==='reject')await query('UPDATE withdrawals SET status=\'rejected\',rejection_reason=$1 WHERE id=$2',[sanitizeString(body.note||'',500),withdrawalId]);
    if(decision==='mark_paid'){
      if(wd.status!=='approved')return jsonRes({error:'Must be approved first'},400,origin);
      await query('UPDATE wallets SET available_balance=available_balance-$1,total_withdrawn=total_withdrawn+$1,updated_at=NOW() WHERE id=$2',[wd.amount,wd.wallet_id]);
      await query("UPDATE withdrawals SET status='paid',paid_at=NOW() WHERE id=$1",[withdrawalId]);
    }
    await auditLog(session.user_id,'superadmin','WITHDRAWAL_'+decision.toUpperCase(),'withdrawals',withdrawalId,{},ip);
    return jsonRes({ok:true},200,origin);
  }

  return jsonRes({error:'Unknown action'},400,origin);
}
