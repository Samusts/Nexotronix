// /api/categories
import { getMany, getOne, query } from '../lib/db.js';
import { sanitizeString, auditLog } from '../lib/security.js';
import { corsHeaders } from '../lib/cors.js';

function jsonRes(d,s=200,o=''){return new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json',...corsHeaders(o)}});}
async function getSession(req){const t=(req.headers['authorization']||'').replace('Bearer ','').trim();if(!t)return null;return getOne('SELECT * FROM sessions WHERE token=$1 AND expires_at>NOW()',[t]);}

export default async function handler(req,res){
  const origin=req.headers['origin']||'';
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(origin)});
  if(req.method==='GET'){const categories=await getMany("SELECT * FROM categories WHERE status='approved' ORDER BY name");return jsonRes({categories},200,origin);}
  const session=await getSession(req);
  if(!session)return jsonRes({error:'Unauthorized'},401,origin);
  if(req.method==='POST'){
    const{name,emoji}=req.body||{};
    if(!name)return jsonRes({error:'Name required'},400,origin);
    const clean=sanitizeString(name,100);
    const slug=clean.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    const status=session.user_type==='superadmin'?'approved':'pending';
    const r=await query('INSERT INTO categories (name,emoji,slug,status,suggested_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',[clean,emoji||'📦',slug,status,session.user_id]);
    await auditLog(session.user_id,session.user_type,'SUGGEST_CATEGORY','categories',r.rows[0].id,{name:clean},'');
    return jsonRes({category:r.rows[0],status},200,origin);
  }
  return jsonRes({error:'Method not allowed'},405,origin);
}
