// GET /api/chat/messages?room=ID — get messages
// POST /api/chat/send — send a message
import { getMany, query, getOne } from '../../lib/db.js';
import { sanitizeString } from '../../lib/security.js';
import { verifySession, successRes, errorRes, unauthorized } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const session = await verifySession(req, ['partner', 'customer', 'superadmin']);
  if (!session) return unauthorized();

  if (req.method === 'GET') {
    const roomId = req.query?.room;
    if (!roomId) return errorRes('Room ID required');

    const messages = await getMany(
      `SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY created_at ASC LIMIT 100`,
      [roomId]
    );
    // Mark as read
    if (session.user_type === 'partner') {
      await query(
        `UPDATE chat_messages SET is_read = TRUE WHERE room_id = $1 AND sender_type = 'customer'`,
        [roomId]
      );
    }
    return successRes({ messages });
  }

  if (req.method === 'POST') {
    const { roomId, message } = req.body || {};
    if (!roomId || !message) return errorRes('Room and message required');

    const cleanMsg = sanitizeString(message, 2000);
    const senderType = session.user_type === 'customer' ? 'customer' : 'partner';

    await query(
      `INSERT INTO chat_messages (room_id, sender_id, sender_type, message)
       VALUES ($1, $2, $3, $4)`,
      [roomId, session.user_id, senderType, cleanMsg]
    );
    await query(
      `UPDATE chat_rooms SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
      [cleanMsg.slice(0, 100), roomId]
    );

    // Trigger Pusher notification
    try {
      const room = await getOne('SELECT * FROM chat_rooms WHERE id = $1', [roomId]);
      if (room) {
        const channelId = senderType === 'customer' ? room.partner_id : room.customer_id;
        const channelType = senderType === 'customer' ? 'partner' : 'customer';
        await pushPusherEvent(`${channelType}-${channelId}`, 'new-message', {
          room_id: roomId, message: { sender_type: senderType, message: cleanMsg, created_at: new Date() }
        });
      }
    } catch (e) { console.error('Pusher error:', e.message); }

    return successRes({ ok: true });
  }

  return errorRes('Method not allowed', 405);
}

async function pushPusherEvent(channel, event, data) {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_APP_KEY;
  const secret = process.env.PUSHER_APP_SECRET;
  const cluster = process.env.PUSHER_APP_CLUSTER || 'ap2';
  if (!appId || !key || !secret) return;

  const body = JSON.stringify({ name: event, channel, data: JSON.stringify(data) });
  const ts = Math.floor(Date.now() / 1000);
  const md5 = require('crypto').createHash('md5').update(body).digest('hex');
  const params = `auth_key=${key}&auth_timestamp=${ts}&auth_version=1.0&body_md5=${md5}`;
  const sig = require('crypto').createHmac('sha256', secret)
    .update(`POST\n/apps/${appId}/events\n${params}`).digest('hex');

  await fetch(`https://api-${cluster}.pusher.com/apps/${appId}/events?${params}&auth_signature=${sig}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body
  });
}
