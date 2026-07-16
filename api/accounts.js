// /api/accounts — user/partner/subadmin management
import { getMany, getOne, query } from '../lib/db.js';
import { hashPassword, sanitizeString, sanitizeEmail, sanitizePhone, auditLog } from '../lib/security.js';
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
  const{type}=req.query||{};

  if(req.method==='GET'){
    if(type==='subadmins'){const rows=await getMany('SELECT s.*,p.* FROM subadmins s LEFT JOIN subadmin_permissions p ON p.subadmin_id=s.id ORDER BY s.created_at DESC');return jsonRes({accounts:rows},200,origin);}
    if(type==='partners'){const rows=await getMany('SELECT p.*,pp.*,w.available_balance FROM partners p LEFT JOIN partner_permissions pp ON pp.partner_id=p.id LEFT JOIN wallets w ON w.partner_id=p.id ORDER BY p.created_at DESC');return jsonRes({accounts:rows},200,origin);}
    if(type==='customers'){const rows=await getMany('SELECT id,full_name,email,phone,is_active,last_login,created_at FROM customers ORDER BY created_at DESC LIMIT 100');return jsonRes({users:rows},200,origin);}
    return jsonRes({error:'Specify type'},400,origin);
  }

  if(session.user_type!=='superadmin')return jsonRes({error:'Super admin only'},401,origin);

  if(req.method==='POST'){
    const{accountType,username,password,email,phone,fullName,businessName}=body;
    if(!accountType||!password||!email||!phone)return jsonRes({error:'Missing fields'},400,origin);
    const cleanEmail=sanitizeEmail(email),cleanPhone=sanitizePhone(phone),cleanUsername=sanitizeString(username||email.split('@')[0],50);
    if(!cleanEmail)return jsonRes({error:'Invalid email'},400,origin);
    const passwordHash=await hashPassword(password);
    if(accountType==='subadmin'){
      const ex=await getOne('SELECT id FROM subadmins WHERE email=$1 OR username=$2',[cleanEmail,cleanUsername]);
      if(ex)return jsonRes({error:'Already exists'},409,origin);
      const r=await query('INSERT INTO subadmins (username,password_hash,email,phone,full_name,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',[cleanUsername,passwordHash,cleanEmail,cleanPhone,sanitizeString(fullName||'',100),session.user_id]);
      await query('INSERT INTO subadmin_permissions (subadmin_id) VALUES ($1)',[r.rows[0].id]);
      await auditLog(session.user_id,'superadmin','CREATE_SUBADMIN','subadmins',r.rows[0].id,{email:cleanEmail},ip);
      const{password_hash,...safe}=r.rows[0];
      return jsonRes({account:safe},200,origin);
    }
    if(accountType==='partner'){
      if(!businessName)return jsonRes({error:'Business name required'},400,origin);
      const cleanBiz=sanitizeString(businessName,100);
      const slug=cleanBiz.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
      const ex=await getOne('SELECT id FROM partners WHERE email=$1 OR slug=$2',[cleanEmail,slug]);
      if(ex)return jsonRes({error:'Already exists'},409,origin);
      const r=await query('INSERT INTO partners (username,password_hash,email,phone,business_name,slug,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',[cleanUsername,passwordHash,cleanEmail,cleanPhone,cleanBiz,slug,session.user_id]);
      await query('INSERT INTO partner_permissions (partner_id) VALUES ($1)',[r.rows[0].id]);
      await query('INSERT INTO wallets (partner_id) VALUES ($1)',[r.rows[0].id]);
      await auditLog(session.user_id,'superadmin','CREATE_PARTNER','partners',r.rows[0].id,{email:cleanEmail},ip);
      const{password_hash,...safe}=r.rows[0];
      return jsonRes({account:safe},200,origin);
    }
    return jsonRes({error:'Invalid accountType'},400,origin);
  }

  if(req.method==='PUT'){
    const{accountId,accountType,permissions,isActive}=body;
    if(!accountId||!accountType)return jsonRes({error:'Missing fields'},400,origin);
    if(permissions){
      const fields=Object.keys(permissions).filter(k=>typeof permissions[k]==='boolean');
      if(fields.length){
        const tbl=accountType==='subadmin'?'subadmin_permissions':'partner_permissions';
        const idCol=accountType==='subadmin'?'subadmin_id':'partner_id';
        const setClause=fields.map((f,i)=>`${f}=$${i+2}`).join(',');
        await query(`UPDATE ${tbl} SET ${setClause},updated_at=NOW() WHERE ${idCol}=$1`,[accountId,...fields.map(f=>permissions[f])]);
        await auditLog(session.user_id,'superadmin','UPDATE_PERMISSIONS',tbl,accountId,permissions,ip);
      }
    }
    if(typeof isActive==='boolean'){
      const tbl={subadmin:'subadmins',partner:'partners',customer:'customers'}[accountType];
      if(tbl){await query(`UPDATE ${tbl} SET is_active=$1 WHERE id=$2`,[isActive,accountId]);await auditLog(session.user_id,'superadmin',isActive?'ACTIVATE':'SUSPEND',tbl,accountId,{},ip);}
    }
    return jsonRes({ok:true},200,origin);
  }

  return jsonRes({error:'Method not allowed'},405,origin);
}
