// /api/orders
import { getMany, getOne, query } from '../lib/db.js';
import { auditLog } from '../lib/security.js';
import { corsHeaders } from '../lib/cors.js';

function jsonRes(data,status=200,origin=''){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...corsHeaders(origin)}});}
async function getSession(req){const t=(req.headers['authorization']||'').replace('Bearer ','').trim();if(!t)return null;return getOne('SELECT * FROM sessions WHERE token=$1 AND expires_at>NOW()',[t]);}

export default async function handler(req,res){
  const origin=req.headers['origin']||'';
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(origin)});
  const ip=req.headers['x-forwarded-for']||'unknown';
  const session=await getSession(req);
  if(!session)return jsonRes({error:'Unauthorized'},401,origin);
  const action=req.query?.action;
  const body=req.body||{};

  if(req.method==='GET'){
    let orders;
    if(session.user_type==='partner'){
      orders=await getMany(`SELECT o.*,oi.quantity,oi.unit_price FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE oi.partner_id=$1 ORDER BY o.created_at DESC LIMIT 100`,[session.user_id]);
    } else {
      orders=await getMany(`SELECT o.*,c.full_name as customer_name,c.phone as customer_phone FROM orders o LEFT JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 100`);
    }
    return jsonRes({orders},200,origin);
  }

  if(req.method==='POST'&&action==='status'){
    const{orderId,status}=body;
    const allowed=['confirmed','shipped','delivered','cancelled'];
    if(!orderId||!allowed.includes(status))return jsonRes({error:'Invalid'},400,origin);
    await query('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2',[status,orderId]);
    if(status==='delivered'){
      const escrow=await getOne('SELECT * FROM escrow WHERE order_id=$1 AND status=$2',[orderId,'held']);
      if(escrow){
        await query('UPDATE wallets SET available_balance=available_balance+$1,pending_balance=GREATEST(0,pending_balance-$1),total_earned=total_earned+$1,updated_at=NOW() WHERE partner_id=$2',[escrow.amount,escrow.partner_id]);
        await query("UPDATE escrow SET status='released',released_at=NOW() WHERE id=$1",[escrow.id]);
      }
    }
    await auditLog(session.user_id,session.user_type,'ORDER_'+status.toUpperCase(),'orders',orderId,{},ip);
    return jsonRes({ok:true},200,origin);
  }

  return jsonRes({error:'Unknown action'},400,origin);
}
