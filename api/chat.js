// /api/chat?action=rooms|messages|send
import { getMany, getOne, query } from '../lib/db.js';
import { sanitizeString } from '../lib/security.js';
import { corsHeaders } from '../lib/cors.js';

function jsonRes(d,s=200,o=''){return new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json',...corsHeaders(o)}});}
async function getSession(req){const t=(req.headers['authorization']||'').replace('Bearer ','').trim();if(!t)return null;return getOne('SELECT * FROM sessions WHERE token=$1 AND expires_at>NOW()',[t]);}

export default async function handler(req,res){
  const origin=req.headers['origin']||'';
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(origin)});
  const session=await getSession(req);
  if(!session)return jsonRes({error:'Unauthorized'},401,origin);
  const action=req.query?.action;
  const body=req.body||{};

  if(action==='rooms'&&req.method==='GET'){
    const where=session.user_type==='partner'?'WHERE cr.partner_id=$1':'';
    const params=session.user_type==='partner'?[session.user_id]:[];
    const rooms=await getMany(`SELECT cr.*,COALESCE(c.full_name,c.phone) as customer_name,COUNT(CASE WHEN cm.is_read=FALSE AND cm.sender_type='customer' THEN 1 END) as unread FROM chat_rooms cr LEFT JOIN customers c ON c.id=cr.customer_id LEFT JOIN chat_messages cm ON cm.room_id=cr.id ${where} GROUP BY cr.id,c.full_name,c.phone ORDER BY cr.last_message_at DESC NULLS LAST`,params);
    return jsonRes({rooms},200,origin);
  }

  if(action==='messages'&&req.method==='GET'){
    const roomId=req.query?.room;
    if(!roomId)return jsonRes({error:'Room required'},400,origin);
    const messages=await getMany('SELECT * FROM chat_messages WHERE room_id=$1 ORDER BY created_at ASC LIMIT 100',[roomId]);
    if(session.user_type==='partner')await query("UPDATE chat_messages SET is_read=TRUE WHERE room_id=$1 AND sender_type='customer'",[roomId]);
    return jsonRes({messages},200,origin);
  }

  if(action==='send'&&req.method==='POST'){
    const{roomId,message}=body;
    if(!roomId||!message)return jsonRes({error:'Room and message required'},400,origin);
    const clean=sanitizeString(message,2000);
    const senderType=session.user_type==='customer'?'customer':'partner';
    await query('INSERT INTO chat_messages (room_id,sender_id,sender_type,message) VALUES ($1,$2,$3,$4)',[roomId,session.user_id,senderType,clean]);
    await query('UPDATE chat_rooms SET last_message=$1,last_message_at=NOW() WHERE id=$2',[clean.slice(0,100),roomId]);
    return jsonRes({ok:true},200,origin);
  }

  return jsonRes({error:'Unknown action'},400,origin);
}
