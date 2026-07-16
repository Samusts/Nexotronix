// /api/products?action=list|create|approve|reject
import { getMany, getOne, query } from '../lib/db.js';
import { sanitizeString, auditLog, checkRateLimit } from '../lib/security.js';
import { corsHeaders, handleOptions } from '../lib/cors.js';

function jsonRes(data, status=200, origin='') { return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...corsHeaders(origin)}}); }
async function getSession(req) { const t=(req.headers['authorization']||'').replace('Bearer ','').trim(); if(!t) return null; return getOne('SELECT * FROM sessions WHERE token=$1 AND expires_at>NOW()',[t]); }

export default async function handler(req, res) {
  const origin = req.headers['origin']||'';
  if (req.method==='OPTIONS') return new Response(null,{status:204,headers:corsHeaders(origin)});
  const ip = req.headers['x-forwarded-for']||'unknown';
  const action = req.query?.action;
  const body = req.body||{};

  if (req.method==='GET') {
    const { category, condition, search, minPrice, maxPrice, sort='created_at', order='DESC', limit=50, offset=0, ownerId, status='approved' } = req.query||{};
    let where = `WHERE p.status='approved'`; const params=[]; let i=1;
    if (category){where+=` AND c.slug=$${i++}`;params.push(category);}
    if (condition){where+=` AND p.condition=$${i++}`;params.push(condition);}
    if (minPrice){where+=` AND p.price>=$${i++}`;params.push(Number(minPrice));}
    if (maxPrice){where+=` AND p.price<=$${i++}`;params.push(Number(maxPrice));}
    if (search){where+=` AND (p.name ILIKE $${i} OR p.description ILIKE $${i})`;params.push('%'+search+'%');i++;}
    if (ownerId){where+=` AND p.owner_id=$${i++}`;params.push(ownerId);}
    if (status&&status!=='approved'&&(await getSession(req))){ where=`WHERE p.status=$${i++}`;params.push(status); }
    const valid=['price','created_at','sold_count','rating','view_count'];
    const safeSort=valid.includes(sort)?sort:'created_at';
    const safeOrder=order==='ASC'?'ASC':'DESC';
    const products = await getMany(`SELECT p.*,c.name as category_name,c.slug as category_slug,COALESCE(pr.business_name,'Nexotronix') as seller_name,COALESCE(pr.slug,'') as seller_slug,pr.is_verified as seller_verified,pi.url as primary_image FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN partners pr ON pr.id=p.owner_id AND p.owner_type='partner' LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=TRUE ${where} ORDER BY p.${safeSort} ${safeOrder} LIMIT $${i++} OFFSET $${i++}`,[...params,Number(limit),Number(offset)]);
    return jsonRes({products},200,origin);
  }

  const session = await getSession(req);
  if (!session) return jsonRes({error:'Unauthorized'},401,origin);

  if (req.method==='POST'&&action==='create') {
    const {name,description,price,originalPrice,condition,categoryId,stock,emoji,specs,tags,allowOffers,images}=body;
    if (!name||!price) return jsonRes({error:'Name and price required'},400,origin);
    const ownerType=session.user_type==='superadmin'?'superadmin':'partner';
    const productStatus=ownerType==='partner'?'pending':'approved';
    const r = await query(`INSERT INTO products (owner_id,owner_type,name,description,price,original_price,condition,category_id,stock,emoji,specs,tags,allow_offers,status,approved_by,approved_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,[session.user_id,ownerType,sanitizeString(name,200),sanitizeString(description||'',5000),Number(price),originalPrice?Number(originalPrice):null,condition||'new',categoryId||null,Number(stock||0),emoji||'📦',JSON.stringify(specs||{}),tags||[],allowOffers===true,productStatus,productStatus==='approved'?session.user_id:null,productStatus==='approved'?new Date():null]);
    const product=r.rows[0];
    if (images&&Array.isArray(images)) { for(let i=0;i<Math.min(images.length,5);i++) await query('INSERT INTO product_images (product_id,url,is_primary,sort_order) VALUES ($1,$2,$3,$4)',[product.id,images[i],i===0,i]); }
    await auditLog(session.user_id,session.user_type,'CREATE_PRODUCT','products',product.id,{name,status:productStatus},ip);
    return jsonRes({product,status:productStatus},200,origin);
  }

  if (req.method==='POST'&&action==='approve') {
    if (!['superadmin','subadmin'].includes(session.user_type)) return jsonRes({error:'Unauthorized'},401,origin);
    const {productId,decision,reason}=body;
    if (!productId||!['approve','reject'].includes(decision)) return jsonRes({error:'Invalid'},400,origin);
    if (decision==='approve') await query(`UPDATE products SET status='approved',approved_by=$1,approved_at=NOW() WHERE id=$2`,[session.user_id,productId]);
    else await query(`UPDATE products SET status='rejected',rejection_reason=$1 WHERE id=$2`,[sanitizeString(reason||'',500),productId]);
    await auditLog(session.user_id,session.user_type,decision.toUpperCase()+'_PRODUCT','products',productId,{},ip);
    return jsonRes({ok:true},200,origin);
  }

  return jsonRes({error:'Unknown action'},400,origin);
}
