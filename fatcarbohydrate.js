const DB={
  g:k=>JSON.parse(localStorage.getItem('nx_erp_'+k)||'[]'),
  s:(k,v)=>localStorage.setItem('nx_erp_'+k,JSON.stringify(v)),
  gO:k=>JSON.parse(localStorage.getItem('nx_erp_'+k)||'{}'),
  sO:(k,v)=>localStorage.setItem('nx_erp_'+k,JSON.stringify(v))
};
let S=DB.gO('settings');
if(!S.name){S={name:'Nexotronix',phone:'+234 903 600 6553',address:'Maiduguri, Borno State, Nigeria',email:'',wa:'2349036006553',currency:'N',tax:7.5,terms:'Payment due within 7 days. All sales are final.'};DB.sO('settings',S);}
const SYMS={'N':'\u20A6','$':'$','E':'\u20AC','L':'\u00A3'};
let CUR=S.currency||'N';
const sym=()=>SYMS[CUR]||CUR;
const fmt=n=>sym()+Number(n||0).toLocaleString();
const td=()=>new Date().toISOString().split('T')[0];
const tdp=d=>new Date(Date.now()+d*864e5).toISOString().split('T')[0];
function gn(p){const y=new Date().getFullYear(),k='nx_seq_'+p;let q=parseInt(localStorage.getItem(k)||'0')+1;localStorage.setItem(k,q);return p+'-'+y+'-'+String(q).padStart(4,'0');}
function setCur(c){CUR=c;S.currency=c;DB.sO('settings',S);}
function go(id){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  const p=document.getElementById('p-'+id);if(p)p.classList.add('active');
  const n=document.querySelector('.ni[onclick*="\''+id+'\'"]');if(n)n.classList.add('active');
  ({dash:rDash,inv:rInv,qtn:rQtn,rcp:rRcp,est:rEst,cust:rCust,proj:rProj,pay:rPay,exp:rExp,stock:rStock,reports:iRptD,profit:rProfit,settings:lS,audit:rAudit}[id]||function(){})();
}
function om(id){document.getElementById(id).classList.add('open');}
function cm(id){document.getElementById(id).classList.remove('open');}
function bdg(s){const m={paid:'bp',unpaid:'bu',partial:'bpa',overdue:'bov',draft:'bdr',sent:'bst',cancelled:'bca',progress:'bpr',completed:'bco',pending:'bpa',approved:'bpr',scheduled:'bpr'};const l={paid:'Paid',unpaid:'Unpaid',partial:'Partial',overdue:'Overdue',draft:'Draft',sent:'Sent',cancelled:'Cancelled',progress:'In Progress',completed:'Completed',pending:'Pending',approved:'Approved',scheduled:'Scheduled'};return '<span class="badge '+( m[s]||'bdr')+'">'+( l[s]||s)+'</span>';}
function aud(a,d){const logs=DB.g('audit');logs.unshift({ts:new Date().toISOString(),action:a,detail:d});DB.s('audit',logs.slice(0,200));}
function toast(m){let t=document.getElementById('xt');if(!t){t=document.createElement('div');t.id='xt';t.style.cssText='position:fixed;bottom:16px;right:16px;background:var(--surface);border:1px solid var(--bG);border-radius:10px;padding:9px 14px;font-size:11.5px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.3);transition:opacity 0.3s;color:var(--text)';document.body.appendChild(t);}t.textContent=m;t.style.opacity='1';clearTimeout(t._t);t._t=setTimeout(()=>{t.style.opacity='0';},3000);}
function cGrand(items,d,tx){const sub=items.reduce((s,i)=>s+Number(i.qty||1)*Number(i.price||0),0);const ad=sub-sub*d/100;return ad+ad*tx/100;}

// DASHBOARD
function rDash(){
  const invs=DB.g('invoices'),exps=DB.g('expenses');
  const rev=invs.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.grand||0),0);
  const out=invs.filter(i=>['unpaid','partial','overdue'].includes(i.status)).reduce((s,i)=>s+(Number(i.grand||0)-Number(i.paid||0)),0);
  const exp=exps.reduce((s,e)=>s+Number(e.amount||0),0);
  document.getElementById('ds').innerHTML=
    '<div class="sc" style="--c:var(--green)"><div class="si">&#128176;</div><div class="sv">'+fmt(rev)+'</div><div class="sl">Revenue</div></div>'+
    '<div class="sc" style="--c:var(--red)"><div class="si">&#9888;</div><div class="sv">'+fmt(out)+'</div><div class="sl">Outstanding</div></div>'+
    '<div class="sc" style="--c:var(--gold)"><div class="si">&#128142;</div><div class="sv">'+fmt(rev-exp)+'</div><div class="sl">Net Profit</div></div>'+
    '<div class="sc" style="--c:var(--blue)"><div class="si">&#129534;</div><div class="sv">'+invs.length+'</div><div class="sl">Invoices</div></div>'+
    '<div class="sc" style="--c:var(--orange)"><div class="si">&#128184;</div><div class="sv">'+fmt(exp)+'</div><div class="sl">Expenses</div></div>'+
    '<div class="sc" style="--c:var(--green)"><div class="si">&#9989;</div><div class="sv">'+invs.filter(i=>i.status==='paid').length+'</div><div class="sl">Paid</div></div>';
  const mo=Array(12).fill(0);
  invs.filter(i=>i.status==='paid').forEach(i=>{mo[new Date(i.date||Date.now()).getMonth()]+=Number(i.grand||0);});
  const mx=Math.max(...mo,1);
  const mns=['J','F','M','A','M','J','J','A','S','O','N','D'];
  document.getElementById('ch-m').innerHTML=mns.map((m,i)=>'<div class="bc"><div class="bf" style="height:'+Math.round(mo[i]/mx*84)+'px" title="'+fmt(mo[i])+'"></div><div class="bl">'+m+'</div></div>').join('');
  const paid=invs.filter(i=>i.status==='paid').length,part=invs.filter(i=>i.status==='partial').length,unp=invs.filter(i=>['unpaid','overdue','draft','sent'].includes(i.status)).length,tot=invs.length||1;
  document.getElementById('ch-s').innerHTML='<div style="font-size:10.5px;display:flex;flex-direction:column;gap:7px">'+
    [['&#9989; Paid',paid,'var(--green)'],['&#8987; Unpaid',unp,'var(--red)'],['&#128992; Partial',part,'var(--orange)']].map(function(x){return '<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;background:var(--surface2);border-radius:4px;height:7px;overflow:hidden"><div style="width:'+Math.round(x[1]/tot*100)+'%;height:100%;background:'+x[2]+'"></div></div><span style="color:'+x[2]+';font-weight:700;min-width:18px">'+x[1]+'</span><span style="color:var(--muted)">'+x[0]+'</span></div>';}).join('')+'</div>';
  document.getElementById('d-rec').innerHTML=invs.slice(0,5).map(i=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:10.5px"><div><div style="font-weight:600">'+( i.customer||'—')+'</div><div style="color:var(--muted)">'+i.num+'</div></div><div style="text-align:right"><div style="color:var(--gold);font-weight:700">'+fmt(i.grand)+'</div>'+bdg(i.status)+'</div></div>').join('')||'<div class="empty">No invoices yet</div>';
  const al=[];
  const ov=invs.filter(i=>i.status==='overdue'||(i.due&&new Date(i.due)<new Date()&&!['paid','cancelled'].includes(i.status)));
  if(ov.length)al.push('<div style="padding:7px;background:rgba(229,62,62,0.1);border-radius:7px;margin-bottom:5px;font-size:10.5px;color:var(--red)">&#9888; '+ov.length+' overdue invoice'+(ov.length>1?'s':'')+'</div>');
  document.getElementById('d-al').innerHTML=al.length?al.join(''):'<div style="font-size:10.5px;color:var(--muted)">&#9989; No alerts</div>';
}

// INVOICES
function oInv(eid){
  const inv=eid?DB.g('invoices').find(function(i){return i.id===eid;}):null;
  document.getElementById('inv-mt').textContent=eid?'Edit Invoice':'New Invoice';
  document.getElementById('inv-num').value=inv&&inv.num?inv.num:gn('INV');
  document.getElementById('inv-st').value=(inv&&inv.status)||'draft';
  document.getElementById('inv-cu').value=(inv&&inv.customer)||'';
  document.getElementById('inv-ph').value=(inv&&inv.phone)||'';
  document.getElementById('inv-ad').value=(inv&&inv.address)||'';
  document.getElementById('inv-dt').value=(inv&&inv.date)||td();
  document.getElementById('inv-du').value=(inv&&inv.due)||tdp(7);
  document.getElementById('inv-tm').value=(inv&&inv.terms)||'7 days';
  document.getElementById('inv-di').value=(inv&&inv.discount)||0;
  document.getElementById('inv-tx').value=(inv&&inv.tax)||0;
  document.getElementById('inv-pd').value=(inv&&inv.paid)||0;
  document.getElementById('inv-nt').value=(inv&&inv.notes)||'';
  document.getElementById('inv-eid').value=eid||'';
  document.getElementById('inv-ib').innerHTML='';
  ((inv&&inv.items)||[{name:'',qty:1,price:0}]).forEach(function(it){aIR(it);});
  cI();uCL();om('m-inv');
}
function aIR(it){
  it=it||{};
  var tr=document.createElement('tr');
  tr.innerHTML='<td><input type="text" value="'+(it.name||'')+'" placeholder="Item name" oninput="cI()"></td><td style="width:55px"><input type="number" value="'+(it.qty||1)+'" min="1" style="width:100%" oninput="cI()"></td><td style="width:110px"><input type="number" value="'+(it.price||0)+'" min="0" style="width:100%" oninput="cI()"></td><td class="rt" style="width:95px">'+fmt((it.qty||1)*(it.price||0))+'</td><td style="width:32px"><button class="db" onclick="this.closest(\'tr\').remove();cI()">&#10005;</button></td>';
  document.getElementById('inv-ib').appendChild(tr);
}
function cI(){
  var sub=0;
  document.querySelectorAll('#inv-ib tr').forEach(function(tr){var ip=tr.querySelectorAll('input');var q=parseFloat(ip[1]&&ip[1].value)||0,p=parseFloat(ip[2]&&ip[2].value)||0,t=q*p;sub+=t;var c=tr.querySelector('.rt');if(c)c.textContent=fmt(t);});
  var di=parseFloat((document.getElementById('inv-di')&&document.getElementById('inv-di').value)||0);
  var tx=parseFloat((document.getElementById('inv-tx')&&document.getElementById('inv-tx').value)||0);
  var pd=parseFloat((document.getElementById('inv-pd')&&document.getElementById('inv-pd').value)||0);
  var ad=sub-sub*di/100,grand=ad+ad*tx/100,bal=grand-pd;
  var b=document.getElementById('inv-tb2');
  if(b)b.innerHTML='<div class="tr2"><span>Subtotal</span><span>'+fmt(sub)+'</span></div>'+(di>0?'<div class="tr2"><span>Discount('+di+'%)</span><span>-'+fmt(sub*di/100)+'</span></div>':'')+(tx>0?'<div class="tr2"><span>Tax('+tx+'%)</span><span>+'+fmt(ad*tx/100)+'</span></div>':'')+(pd>0?'<div class="tr2"><span>Paid</span><span style="color:var(--green)">-'+fmt(pd)+'</span></div>':'')+'<div class="tr2 gd"><span>TOTAL</span><span>'+fmt(grand)+'</span></div>'+(pd>0?'<div class="tr2" style="color:var(--red)"><span>Balance</span><span>'+fmt(bal)+'</span></div>':'');
}
function gIItems(){return Array.from(document.querySelectorAll('#inv-ib tr')).map(function(tr){var ip=tr.querySelectorAll('input');return{name:(ip[0]&&ip[0].value)||'',qty:parseFloat((ip[1]&&ip[1].value)||1),price:parseFloat((ip[2]&&ip[2].value)||0)};}).filter(function(i){return i.name;});}
function sInv(){
  var items=gIItems();if(!items.length){alert('Add at least one item');return;}
  var di=parseFloat(document.getElementById('inv-di').value)||0,tx=parseFloat(document.getElementById('inv-tx').value)||0,pd=parseFloat(document.getElementById('inv-pd').value)||0;
  var grand=cGrand(items,di,tx),eid=document.getElementById('inv-eid').value;
  var inv={id:eid||Date.now()+'',num:document.getElementById('inv-num').value,customer:document.getElementById('inv-cu').value,phone:document.getElementById('inv-ph').value,address:document.getElementById('inv-ad').value,date:document.getElementById('inv-dt').value,due:document.getElementById('inv-du').value,terms:document.getElementById('inv-tm').value,items:items,discount:di,tax:tx,paid:pd,grand:grand,status:document.getElementById('inv-st').value,notes:document.getElementById('inv-nt').value};
  if(pd>=grand&&grand>0)inv.status='paid';else if(pd>0&&pd<grand)inv.status='partial';
  var invs=DB.g('invoices');invs=eid?invs.map(function(i){return i.id===eid?Object.assign({},i,inv):i;}):[inv].concat(invs);
  DB.s('invoices',invs);sCustAuto(inv.customer,inv.phone);
  aud(eid?'Invoice Edited':'Invoice Created',inv.num+' — '+inv.customer+' — '+fmt(grand));
  cm('m-inv');rInv();toast('Invoice saved!');
}
function rInv(){
  var invs=DB.g('invoices');
  var q=(document.getElementById('inv-q')&&document.getElementById('inv-q').value||'').toLowerCase();
  var f=document.getElementById('inv-f')&&document.getElementById('inv-f').value||'';
  if(q)invs=invs.filter(function(i){return(i.customer||'').toLowerCase().includes(q)||(i.num||'').toLowerCase().includes(q);});
  if(f)invs=invs.filter(function(i){return i.status===f;});
  var tb=document.getElementById('inv-tb');if(!tb)return;
  if(!invs.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:22px;color:var(--dim)">No invoices yet. Click "+ New Invoice".</td></tr>';return;}
  tb.innerHTML=invs.map(function(i){return '<tr><td style="color:var(--gold);font-weight:700">'+i.num+'</td><td>'+( i.customer||'—')+'</td><td>'+(i.date||'—')+'</td><td style="'+(i.due&&new Date(i.due)<new Date()&&i.status!=='paid'?'color:var(--red)':'')+'">'+( i.due||'—')+'</td><td style="font-weight:700">'+fmt(i.grand)+'</td><td>'+bdg(i.status)+'</td><td><div style="display:flex;gap:3px;flex-wrap:wrap"><button class="btn bo sm" onclick="oInv(\''+i.id+'\')">&#9998;</button><button class="btn bb sm" onclick="pDocId(\'inv\',\''+i.id+'\')">&#128065;</button><button class="btn bw sm" onclick="wDocId(\'inv\',\''+i.id+'\')">&#128172;</button><button class="btn br sm" onclick="del(\'invoices\',\''+i.id+'\',\'Invoice\')">&#128465;</button></div></td></tr>';}).join('');
}

// QUOTATIONS
function oQtn(eid){
  var qtn=eid?DB.g('quotations').find(function(q){return q.id===eid;}):null;
  document.getElementById('qtn-num').value=qtn&&qtn.num?qtn.num:gn('QTN');
  document.getElementById('qtn-cu').value=(qtn&&qtn.customer)||'';
  document.getElementById('qtn-ph').value=(qtn&&qtn.phone)||'';
  document.getElementById('qtn-dt').value=(qtn&&qtn.date)||td();
  document.getElementById('qtn-vl').value=(qtn&&qtn.valid)||tdp(14);
  document.getElementById('qtn-su').value=(qtn&&qtn.subject)||'';
  document.getElementById('qtn-di').value=(qtn&&qtn.discount)||0;
  document.getElementById('qtn-tx').value=(qtn&&qtn.tax)||0;
  document.getElementById('qtn-nt').value=(qtn&&qtn.notes)||'';
  document.getElementById('qtn-eid').value=eid||'';
  document.getElementById('qtn-ib').innerHTML='';
  ((qtn&&qtn.items)||[{name:'',qty:1,price:0}]).forEach(function(it){aQR(it);});
  cQ();uCL();om('m-qtn');
}
function aQR(it){
  it=it||{};
  var tr=document.createElement('tr');
  tr.innerHTML='<td><input type="text" value="'+(it.name||'')+'" placeholder="Item" oninput="cQ()"></td><td style="width:55px"><input type="number" value="'+(it.qty||1)+'" min="1" style="width:100%" oninput="cQ()"></td><td style="width:110px"><input type="number" value="'+(it.price||0)+'" min="0" style="width:100%" oninput="cQ()"></td><td class="rt" style="width:95px">'+fmt((it.qty||1)*(it.price||0))+'</td><td style="width:32px"><button class="db" onclick="this.closest(\'tr\').remove();cQ()">&#10005;</button></td>';
  document.getElementById('qtn-ib').appendChild(tr);
}
function cQ(){
  var sub=0;
  document.querySelectorAll('#qtn-ib tr').forEach(function(tr){var ip=tr.querySelectorAll('input');var q=parseFloat(ip[1]&&ip[1].value)||0,p=parseFloat(ip[2]&&ip[2].value)||0,t=q*p;sub+=t;var c=tr.querySelector('.rt');if(c)c.textContent=fmt(t);});
  var di=parseFloat(document.getElementById('qtn-di')&&document.getElementById('qtn-di').value||0),tx=parseFloat(document.getElementById('qtn-tx')&&document.getElementById('qtn-tx').value||0);
  var ad=sub-sub*di/100,grand=ad+ad*tx/100;
  var b=document.getElementById('qtn-tb2');
  if(b)b.innerHTML='<div class="tr2"><span>Subtotal</span><span>'+fmt(sub)+'</span></div>'+(di>0?'<div class="tr2"><span>Discount('+di+'%)</span><span>-'+fmt(sub*di/100)+'</span></div>':'')+(tx>0?'<div class="tr2"><span>Tax('+tx+'%)</span><span>+'+fmt(ad*tx/100)+'</span></div>':'')+'<div class="tr2 gd"><span>TOTAL</span><span>'+fmt(grand)+'</span></div>';
}
function gQItems(){return Array.from(document.querySelectorAll('#qtn-ib tr')).map(function(tr){var ip=tr.querySelectorAll('input');return{name:(ip[0]&&ip[0].value)||'',qty:parseFloat((ip[1]&&ip[1].value)||1),price:parseFloat((ip[2]&&ip[2].value)||0)};}).filter(function(i){return i.name;});}
function sQtn(){
  var items=gQItems();if(!items.length){alert('Add at least one item');return;}
  var di=parseFloat(document.getElementById('qtn-di').value)||0,tx=parseFloat(document.getElementById('qtn-tx').value)||0;
  var eid=document.getElementById('qtn-eid').value;
  var qtn={id:eid||Date.now()+'',num:document.getElementById('qtn-num').value,customer:document.getElementById('qtn-cu').value,phone:document.getElementById('qtn-ph').value,date:document.getElementById('qtn-dt').value,valid:document.getElementById('qtn-vl').value,subject:document.getElementById('qtn-su').value,items:items,discount:di,tax:tx,grand:cGrand(items,di,tx),notes:document.getElementById('qtn-nt').value};
  var qtns=DB.g('quotations');qtns=eid?qtns.map(function(q){return q.id===eid?Object.assign({},q,qtn):q;}):[qtn].concat(qtns);
  DB.s('quotations',qtns);sCustAuto(qtn.customer,qtn.phone);
  aud(eid?'Quotation Edited':'Quotation Created',qtn.num+' — '+qtn.customer+' — '+fmt(qtn.grand));
  cm('m-qtn');rQtn();toast('Quotation saved!');
}
function rQtn(){
  var qtns=DB.g('quotations');
  var q=(document.getElementById('qtn-q')&&document.getElementById('qtn-q').value||'').toLowerCase();
  if(q)qtns=qtns.filter(function(i){return(i.customer||'').toLowerCase().includes(q)||(i.num||'').toLowerCase().includes(q);});
  var tb=document.getElementById('qtn-tb');if(!tb)return;
  if(!qtns.length){tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:22px;color:var(--dim)">No quotations yet.</td></tr>';return;}
  tb.innerHTML=qtns.map(function(q){return '<tr><td style="color:var(--gold);font-weight:700">'+q.num+'</td><td>'+( q.customer||'—')+'</td><td>'+( q.date||'—')+'</td><td style="'+(q.valid&&new Date(q.valid)<new Date()?'color:var(--red)':'')+'">'+( q.valid||'—')+'</td><td style="font-weight:700">'+fmt(q.grand)+'</td><td><div style="display:flex;gap:3px;flex-wrap:wrap"><button class="btn bo sm" onclick="oQtn(\''+q.id+'\')">&#9998;</button><button class="btn bb sm" onclick="pDocId(\'qtn\',\''+q.id+'\')">&#128065;</button><button class="btn bw sm" onclick="wDocId(\'qtn\',\''+q.id+'\')">&#128172;</button><button class="btn bgn sm" onclick="qToInvId(\''+q.id+'\')">&#8594;Inv</button><button class="btn br sm" onclick="del(\'quotations\',\''+q.id+'\',\'Quotation\')">&#128465;</button></div></td></tr>';}).join('');
}
function qToInvId(qid){var qtn=DB.g('quotations').find(function(q){return q.id===qid;});if(!qtn)return;document.getElementById('inv-eid').value='';document.getElementById('inv-num').value=gn('INV');document.getElementById('inv-cu').value=qtn.customer||'';document.getElementById('inv-ph').value=qtn.phone||'';document.getElementById('inv-dt').value=td();document.getElementById('inv-du').value=tdp(7);document.getElementById('inv-di').value=qtn.discount||0;document.getElementById('inv-tx').value=qtn.tax||0;document.getElementById('inv-pd').value=0;document.getElementById('inv-st').value='sent';document.getElementById('inv-nt').value='From '+qtn.num;document.getElementById('inv-ib').innerHTML='';(qtn.items||[]).forEach(function(it){aIR(it);});cI();cm('m-qtn');om('m-inv');aud('QTN Converted',qtn.num+'->Invoice');}
function qToInv(){qToInvId(document.getElementById('qtn-eid').value);}

// RECEIPTS
function oRcp(eid){var r=eid?DB.g('receipts').find(function(x){return x.id===eid;}):null;document.getElementById('rcp-num').value=r&&r.num?r.num:gn('RCP');document.getElementById('rcp-cu').value=(r&&r.customer)||'';document.getElementById('rcp-inv').value=(r&&r.invoiceRef)||'';document.getElementById('rcp-dt').value=(r&&r.date)||td();document.getElementById('rcp-am').value=(r&&r.amount)||'';document.getElementById('rcp-mt').value=(r&&r.method)||'Cash';document.getElementById('rcp-nt').value=(r&&r.notes)||'';document.getElementById('rcp-eid').value=eid||'';uCL();om('m-rcp');}
function sRcp(){var am=parseFloat(document.getElementById('rcp-am').value)||0;if(!am){alert('Enter amount');return;}var eid=document.getElementById('rcp-eid').value;var r={id:eid||Date.now()+'',num:document.getElementById('rcp-num').value,customer:document.getElementById('rcp-cu').value,invoiceRef:document.getElementById('rcp-inv').value,date:document.getElementById('rcp-dt').value,amount:am,method:document.getElementById('rcp-mt').value,notes:document.getElementById('rcp-nt').value};var rcps=DB.g('receipts');rcps=eid?rcps.map(function(x){return x.id===eid?r:x;}):[r].concat(rcps);DB.s('receipts',rcps);aud('Receipt Created',r.num+' — '+r.customer+' — '+fmt(am));cm('m-rcp');rRcp();toast('Receipt saved!');}
function rRcp(){var rcps=DB.g('receipts');var tb=document.getElementById('rcp-tb');if(!tb)return;if(!rcps.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:22px;color:var(--dim)">No receipts yet.</td></tr>';return;}tb.innerHTML=rcps.map(function(r){return '<tr><td style="color:var(--gold);font-weight:700">'+r.num+'</td><td>'+(r.customer||'—')+'</td><td style="color:var(--muted)">'+(r.invoiceRef||'—')+'</td><td>'+(r.date||'—')+'</td><td style="font-weight:700;color:var(--green)">'+fmt(r.amount)+'</td><td>'+(r.method||'Cash')+'</td><td><div style="display:flex;gap:3px"><button class="btn bb sm" onclick="pDocId(\'rcp\',\''+r.id+'\')">&#128065;</button><button class="btn bw sm" onclick="wDocId(\'rcp\',\''+r.id+'\')">&#128172;</button><button class="btn br sm" onclick="del(\'receipts\',\''+r.id+'\',\'Receipt\')">&#128465;</button></div></td></tr>';}).join('');}

// ESTIMATES
function oEst(eid){var est=eid?DB.g('estimates').find(function(e){return e.id===eid;}):null;document.getElementById('est-num').value=est&&est.num?est.num:gn('EST');document.getElementById('est-ty').value=(est&&est.type)||'CCTV Installation';document.getElementById('est-cu').value=(est&&est.customer)||'';document.getElementById('est-dt').value=(est&&est.date)||td();document.getElementById('est-mg').value=(est&&est.margin)||20;document.getElementById('est-tr').value=(est&&est.transport)||0;document.getElementById('est-nt').value=(est&&est.notes)||'';document.getElementById('est-eid').value=eid||'';document.getElementById('est-ib').innerHTML='';((est&&est.items)||[{name:'',cat:'Material',qty:1,cost:0}]).forEach(function(it){aER(it);});cE();om('m-est');}
function oCostCalc(){oEst();document.getElementById('est-ib').innerHTML='';[{name:'IP Cameras',cat:'Material',qty:4,cost:25000},{name:'DVR/NVR',cat:'Material',qty:1,cost:45000},{name:'Hard Drive 1TB',cat:'Material',qty:1,cost:15000},{name:'Cabling 100m',cat:'Material',qty:1,cost:8000},{name:'Connectors',cat:'Material',qty:1,cost:5000},{name:'Installation Labour',cat:'Labour',qty:1,cost:20000},{name:'Transportation',cat:'Logistics',qty:1,cost:5000}].forEach(function(it){aER(it);});cE();}
function oSolarCalc(){oEst();document.getElementById('est-ty').value='Solar Installation';document.getElementById('est-ib').innerHTML='';[{name:'Solar Panels 300W x4',cat:'Material',qty:1,cost:120000},{name:'Inverter 5KVA',cat:'Material',qty:1,cost:85000},{name:'Batteries 200AH x4',cat:'Material',qty:1,cost:160000},{name:'Charge Controller',cat:'Material',qty:1,cost:25000},{name:'Mounting Structure',cat:'Material',qty:1,cost:20000},{name:'Wiring & Cables',cat:'Material',qty:1,cost:15000},{name:'Installation Labour',cat:'Labour',qty:1,cost:40000},{name:'Transportation',cat:'Logistics',qty:1,cost:8000}].forEach(function(it){aER(it);});cE();}
function aER(it){it=it||{};var tr=document.createElement('tr');tr.innerHTML='<td><input type="text" value="'+(it.name||'')+'" placeholder="Item" oninput="cE()"></td><td style="width:88px"><select style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:11px;padding:3px;width:100%" onchange="cE()">'+ ['Material','Labour','Logistics','Other'].map(function(c){return '<option'+(it.cat===c?' selected':'')+'>'+c+'</option>';}).join('')+'</select></td><td style="width:50px"><input type="number" value="'+(it.qty||1)+'" min="1" style="width:100%" oninput="cE()"></td><td style="width:110px"><input type="number" value="'+(it.cost||0)+'" min="0" style="width:100%" oninput="cE()"></td><td class="rt" style="width:95px">'+fmt((it.qty||1)*(it.cost||0))+'</td><td style="width:32px"><button class="db" onclick="this.closest(\'tr\').remove();cE()">&#10005;</button></td>';document.getElementById('est-ib').appendChild(tr);}
function cE(){var mat=0,lab=0,log=0,oth=0;document.querySelectorAll('#est-ib tr').forEach(function(tr){var ip=tr.querySelectorAll('input'),sel=tr.querySelector('select'),q=parseFloat(ip[1]&&ip[1].value)||0,c=parseFloat(ip[2]&&ip[2].value)||0,t=q*c;if(sel&&sel.value==='Material')mat+=t;else if(sel&&sel.value==='Labour')lab+=t;else if(sel&&sel.value==='Logistics')log+=t;else oth+=t;var cell=tr.querySelector('.rt');if(cell)cell.textContent=fmt(t);});var tr2=parseFloat(document.getElementById('est-tr')&&document.getElementById('est-tr').value||0),mg=parseFloat(document.getElementById('est-mg')&&document.getElementById('est-mg').value||20),sub=mat+lab+log+oth+tr2,prf=sub*mg/100,tot=sub+prf;var b=document.getElementById('est-tb2');if(b)b.innerHTML='<div class="tr2"><span>Materials</span><span>'+fmt(mat)+'</span></div><div class="tr2"><span>Labour</span><span>'+fmt(lab)+'</span></div><div class="tr2"><span>Logistics+Transport</span><span>'+fmt(log+tr2)+'</span></div>'+(oth>0?'<div class="tr2"><span>Other</span><span>'+fmt(oth)+'</span></div>':'')+'<div class="tr2" style="border-top:1px solid var(--border)"><span>Total Cost</span><span>'+fmt(sub)+'</span></div><div class="tr2" style="color:var(--green)"><span>Profit('+mg+'%)</span><span>+'+fmt(prf)+'</span></div><div class="tr2 gd"><span>Customer Price</span><span>'+fmt(tot)+'</span></div>';}
function gEItems(){return Array.from(document.querySelectorAll('#est-ib tr')).map(function(tr){var ip=tr.querySelectorAll('input'),sel=tr.querySelector('select');return{name:(ip[0]&&ip[0].value)||'',cat:(sel&&sel.value)||'Material',qty:parseFloat((ip[1]&&ip[1].value)||1),cost:parseFloat((ip[2]&&ip[2].value)||0)};}).filter(function(i){return i.name;});}
function sEst(){var items=gEItems();if(!items.length){alert('Add items');return;}var mg=parseFloat(document.getElementById('est-mg').value)||20,tr2=parseFloat(document.getElementById('est-tr').value)||0,sub=items.reduce(function(s,i){return s+i.qty*i.cost;},0)+tr2,total=sub+sub*mg/100,eid=document.getElementById('est-eid').value;var est={id:eid||Date.now()+'',num:document.getElementById('est-num').value,type:document.getElementById('est-ty').value,customer:document.getElementById('est-cu').value,date:document.getElementById('est-dt').value,items:items,margin:mg,transport:tr2,sub:sub,total:total,notes:document.getElementById('est-nt').value};var ests=DB.g('estimates');ests=eid?ests.map(function(e){return e.id===eid?est:e;}):[est].concat(ests);DB.s('estimates',ests);aud('Estimate Created',est.num+' — '+est.customer+' — '+fmt(total));cm('m-est');rEst();toast('Estimate saved!');}
function eToInv(){var items=gEItems(),mg=parseFloat(document.getElementById('est-mg').value)||20,tr2=parseFloat(document.getElementById('est-tr').value)||0,ii=items.map(function(i){return{name:i.name,qty:i.qty,price:i.cost*(1+mg/100)};});if(tr2>0)ii.push({name:'Transportation',qty:1,price:tr2*(1+mg/100)});document.getElementById('inv-eid').value='';document.getElementById('inv-num').value=gn('INV');document.getElementById('inv-cu').value=document.getElementById('est-cu').value;document.getElementById('inv-dt').value=td();document.getElementById('inv-du').value=tdp(7);document.getElementById('inv-st').value='draft';document.getElementById('inv-di').value=0;document.getElementById('inv-tx').value=0;document.getElementById('inv-pd').value=0;document.getElementById('inv-nt').value='From '+document.getElementById('est-num').value;document.getElementById('inv-ib').innerHTML='';ii.forEach(function(it){aIR(it);});cI();cm('m-est');om('m-inv');}
function rEst(){var ests=DB.g('estimates');var tb=document.getElementById('est-tb');if(!tb)return;if(!ests.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:22px;color:var(--dim)">No estimates yet.</td></tr>';return;}tb.innerHTML=ests.map(function(e){return '<tr><td style="color:var(--gold);font-weight:700">'+e.num+'</td><td>'+(e.customer||'—')+'</td><td>'+(e.type||'—')+'</td><td>'+(e.date||'—')+'</td><td style="font-weight:700">'+fmt(e.total)+'</td><td style="color:var(--green)">'+(e.margin||20)+'%</td><td><div style="display:flex;gap:3px;flex-wrap:wrap"><button class="btn bo sm" onclick="oEst(\''+e.id+'\')">&#9998;</button><button class="btn bb sm" onclick="pDocId(\'est\',\''+e.id+'\')">&#128065;</button><button class="btn bw sm" onclick="wDocId(\'est\',\''+e.id+'\')">&#128172;</button><button class="btn br sm" onclick="del(\'estimates\',\''+e.id+'\',\'Estimate\')">&#128465;</button></div></td></tr>';}).join('');}

// CUSTOMERS
function oCust(eid){var c=eid?DB.g('customers').find(function(x){return x.id===eid;}):null;document.getElementById('c-nm').value=(c&&c.name)||'';document.getElementById('c-ph').value=(c&&c.phone)||'';document.getElementById('c-em').value=(c&&c.email)||'';document.getElementById('c-cy').value=(c&&c.city)||'Maiduguri';document.getElementById('c-ad').value=(c&&c.address)||'';document.getElementById('c-eid').value=eid||'';om('m-cust');}
function sCust(){var name=document.getElementById('c-nm').value.trim();if(!name){alert('Enter name');return;}var eid=document.getElementById('c-eid').value;var c={id:eid||Date.now()+'',name:name,phone:document.getElementById('c-ph').value,email:document.getElementById('c-em').value,city:document.getElementById('c-cy').value,address:document.getElementById('c-ad').value};var custs=DB.g('customers');custs=eid?custs.map(function(x){return x.id===eid?c:x;}):(custs.find(function(x){return x.name.toLowerCase()===name.toLowerCase();})?custs:[c].concat(custs));DB.s('customers',custs);aud('Customer Saved',name);cm('m-cust');rCust();uCL();toast('Customer saved!');}
function sCustAuto(name,phone){if(!name)return;var custs=DB.g('customers');if(!custs.find(function(c){return c.name.toLowerCase()===name.toLowerCase();})){custs.unshift({id:Date.now()+'',name:name,phone:phone||'',city:'',email:'',address:''});DB.s('customers',custs);uCL();}}
function uCL(){var dl=document.getElementById('cl');if(!dl)return;dl.innerHTML=DB.g('customers').map(function(c){return '<option value="'+c.name+'">';}).join('');}
function rCust(){
  var custs=DB.g('customers');
  var q=(document.getElementById('cust-q')&&document.getElementById('cust-q').value||'').toLowerCase();
  if(q)custs=custs.filter(function(c){return(c.name||'').toLowerCase().includes(q)||(c.phone||'').includes(q);});
  var invs=DB.g('invoices');
  var tb=document.getElementById('cust-tb');
  if(!tb)return;
  if(!custs.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:22px;color:var(--dim)">No customers yet.</td></tr>';return;}
  tb.innerHTML=custs.map(function(c){
    var ci=invs.filter(function(i){return i.customer===c.name;});
    var tot=ci.reduce(function(s,i){return s+Number(i.grand||0);},0);
    var out=ci.filter(function(i){return['unpaid','partial','overdue'].includes(i.status);}).reduce(function(s,i){return s+(Number(i.grand||0)-Number(i.paid||0));},0);
    var safeId=c.id.replace(/'/g,'');
    var safePhone=(c.phone||'').replace(/[^0-9]/g,'');
    return '<tr>'+
      '<td style="font-weight:600">'+( c.name||'')+'</td>'+
      '<td>'+(c.phone||'')+'</td>'+
      '<td style="color:var(--muted)">'+(c.email||'—')+'</td>'+
      '<td>'+(c.city||'—')+'</td>'+
      '<td style="font-weight:700">'+fmt(tot)+'</td>'+
      '<td style="color:'+(out>0?'var(--red)':'var(--green)')+';font-weight:700">'+fmt(out)+'</td>'+
      '<td><div style="display:flex;gap:3px">'+
        '<button class="btn bo sm" onclick="oCust(\'' + safeId + '\')">&#9998;</button>'+
        '<button class="btn bw sm" data-wa-phone="' + safePhone + '" onclick="var p=this.getAttribute(\'data-wa-phone\');if(p)window.open(\'https://wa.me/\'+p,\'_blank\')">&#128172;</button>'+
        '<button class="btn br sm" onclick="del(\'customers\',\'' + safeId + '\',\'Customer\')">&#128465;</button>'+
      '</div></td>'+
    '</tr>';
  }).join('');
}

// PROJECTS
function oProj(eid){var p=eid?DB.g('projects').find(function(x){return x.id===eid;}):null;document.getElementById('prj-id').value=p&&p.num?p.num:gn('PRJ');document.getElementById('prj-ty').value=(p&&p.type)||'Solar Installation';document.getElementById('prj-cu').value=(p&&p.customer)||'';document.getElementById('prj-tc').value=(p&&p.technician)||'';document.getElementById('prj-sd').value=(p&&p.start)||td();document.getElementById('prj-ed').value=(p&&p.end)||tdp(14);document.getElementById('prj-st').value=(p&&p.status)||'pending';document.getElementById('prj-bu').value=(p&&p.budget)||'';document.getElementById('prj-nt').value=(p&&p.notes)||'';document.getElementById('prj-eid').value=eid||'';uCL();om('m-proj');}
function sProj(){var eid=document.getElementById('prj-eid').value;var prj={id:eid||Date.now()+'',num:document.getElementById('prj-id').value,type:document.getElementById('prj-ty').value,customer:document.getElementById('prj-cu').value,technician:document.getElementById('prj-tc').value,start:document.getElementById('prj-sd').value,end:document.getElementById('prj-ed').value,status:document.getElementById('prj-st').value,budget:parseFloat(document.getElementById('prj-bu').value)||0,notes:document.getElementById('prj-nt').value};var prjs=DB.g('projects');prjs=eid?prjs.map(function(p){return p.id===eid?prj:p;}):[prj].concat(prjs);DB.s('projects',prjs);aud('Project Saved',prj.num+' — '+prj.customer);cm('m-proj');rProj();toast('Project saved!');}
function rProj(){var prjs=DB.g('projects');var tb=document.getElementById('proj-tb');if(!tb)return;if(!prjs.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:22px;color:var(--dim)">No projects yet.</td></tr>';return;}tb.innerHTML=prjs.map(function(p){return '<tr><td style="color:var(--gold);font-weight:700">'+p.num+'</td><td>'+(p.customer||'—')+'</td><td>'+(p.type||'—')+'</td><td>'+(p.technician||'—')+'</td><td>'+(p.start||'—')+'</td><td>'+(p.end||'—')+'</td><td>'+bdg(p.status)+'</td><td><div style="display:flex;gap:3px"><button class="btn bo sm" onclick="oProj(\''+p.id+'\')">&#9998;</button><button class="btn br sm" onclick="del(\'projects\',\''+p.id+'\',\'Project\')">&#128465;</button></div></td></tr>';}).join('');}

// PAYMENTS
function rPay(){var invs=DB.g('invoices'),rev=invs.filter(function(i){return i.status==='paid';}).reduce(function(s,i){return s+Number(i.grand||0);},0),out=invs.filter(function(i){return['unpaid','partial','overdue'].includes(i.status);}).reduce(function(s,i){return s+(Number(i.grand||0)-Number(i.paid||0));},0);document.getElementById('pay-s').innerHTML='<div class="sc" style="--c:var(--green)"><div class="sv">'+fmt(rev)+'</div><div class="sl">Paid</div></div><div class="sc" style="--c:var(--red)"><div class="sv">'+fmt(out)+'</div><div class="sl">Outstanding</div></div><div class="sc" style="--c:var(--orange)"><div class="sv">'+invs.filter(function(i){return i.status==='overdue';}).length+'</div><div class="sl">Overdue</div></div>';var tb=document.getElementById('pay-tb');if(!tb)return;if(!invs.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:22px;color:var(--dim)">No invoices.</td></tr>';return;}tb.innerHTML=invs.map(function(i){var o=Number(i.grand||0)-Number(i.paid||0);return'<tr><td style="color:var(--gold);font-weight:700">'+i.num+'</td><td>'+(i.customer||'—')+'</td><td style="font-weight:700">'+fmt(i.grand)+'</td><td style="color:var(--green)">'+fmt(i.paid||0)+'</td><td style="color:'+(o>0?'var(--red)':'var(--muted)')+';font-weight:700">'+fmt(o)+'</td><td>'+bdg(i.status)+'</td><td>'+(i.due||'—')+'</td><td><button class="btn bgn sm" onclick="mPaid(\''+i.id+'\')">&#9989; Paid</button></td></tr>';}).join('');}
function mPaid(id){var invs=DB.g('invoices');invs=invs.map(function(i){return i.id===id?Object.assign({},i,{status:'paid',paid:i.grand}):i;});DB.s('invoices',invs);aud('Payment','Invoice marked paid');rPay();toast('Marked as paid!');}

// EXPENSES
function oExp(eid){var e=eid?DB.g('expenses').find(function(x){return x.id===eid;}):null;document.getElementById('exp-dt').value=(e&&e.date)||td();document.getElementById('exp-ct').value=(e&&e.cat)||'Transportation';document.getElementById('exp-ds').value=(e&&e.desc)||'';document.getElementById('exp-am').value=(e&&e.amount)||'';document.getElementById('exp-eid').value=eid||'';om('m-exp');}
function sExp(){var am=parseFloat(document.getElementById('exp-am').value)||0;if(!am){alert('Enter amount');return;}var eid=document.getElementById('exp-eid').value;var exp={id:eid||Date.now()+'',date:document.getElementById('exp-dt').value,cat:document.getElementById('exp-ct').value,desc:document.getElementById('exp-ds').value,amount:am};var exps=DB.g('expenses');exps=eid?exps.map(function(e){return e.id===eid?exp:e;}):[exp].concat(exps);DB.s('expenses',exps);aud('Expense Added',exp.cat+' — '+fmt(am));cm('m-exp');rExp();toast('Expense saved!');}
function rExp(){var exps=DB.g('expenses');var te=exps.reduce(function(s,e){return s+Number(e.amount||0);},0),tm=exps.filter(function(e){return e.date&&e.date.startsWith(new Date().toISOString().slice(0,7));}).reduce(function(s,e){return s+Number(e.amount||0);},0);document.getElementById('exp-s').innerHTML='<div class="sc" style="--c:var(--red)"><div class="sv">'+fmt(te)+'</div><div class="sl">Total Expenses</div></div><div class="sc" style="--c:var(--orange)"><div class="sv">'+fmt(tm)+'</div><div class="sl">This Month</div></div>';var tb=document.getElementById('exp-tb');if(!tb)return;if(!exps.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:22px;color:var(--dim)">No expenses yet.</td></tr>';return;}tb.innerHTML=exps.map(function(e){return '<tr><td>'+(e.date||'—')+'</td><td><span style="background:var(--surface2);border-radius:4px;padding:2px 7px;font-size:10px">'+e.cat+'</span></td><td>'+(e.desc||'—')+'</td><td style="font-weight:700;color:var(--red)">'+fmt(e.amount)+'</td><td><div style="display:flex;gap:3px"><button class="btn bo sm" onclick="oExp(\''+e.id+'\')">&#9998;</button><button class="btn br sm" onclick="del(\'expenses\',\''+e.id+'\',\'Expense\')">&#128465;</button></div></td></tr>';}).join('');}

// INVENTORY
function rStock(){
  var el=document.getElementById('stock-out');
  if(!el)return;
  var prods=[];
  try{prods=JSON.parse(localStorage.getItem('nexotronix_products')||'[]');}catch(e){}
  if(!prods.length){
    try{prods=JSON.parse(localStorage.getItem('nx_products')||'[]');}catch(e){}
  }
  if(!prods.length){
    try{
      var dbCache=JSON.parse(localStorage.getItem('nx_db_cache')||'{}');
      if(dbCache.products) prods=dbCache.products;
    }catch(e){}
  }
  if(!prods.length){
    el.innerHTML='<div class="empty"><div style="font-size:34px">&#128230;</div>'+
      '<div style="font-size:13px;font-weight:700;color:var(--muted);margin-top:8px">No inventory data</div>'+
      '<div style="font-size:11px;color:var(--dim);margin-top:4px">Products will appear here after you add them in the main store and save.</div></div>';
    return;
  }
  el.innerHTML='<div class="tw"><table><thead><tr>'+
    '<th>Product</th><th>Category</th><th>Condition</th><th>Price</th><th>Qty</th><th>Status</th>'+
    '</tr></thead><tbody>'+
    prods.map(function(p){
      var qty=Number(p.quantity||p.qty||0);
      var qtyColor=qty<=3&&qty>0?'color:var(--red)':'';
      return '<tr>'+
        '<td><span style="font-size:16px;margin-right:5px">'+(p.emoji||'&#128230;')+'</span>'+(p.name||'—')+'</td>'+
        '<td>'+(p.cat||p.category||'—')+'</td>'+
        '<td>'+(p.condition||'New')+'</td>'+
        '<td style="font-weight:700;color:var(--gold)">'+fmt(p.price)+'</td>'+
        '<td style="font-weight:700;'+qtyColor+'">'+(qty||'—')+'</td>'+
        '<td>'+bdg(p.stock||'available')+'</td>'+
      '</tr>';
    }).join('')+
    '</tbody></table></div>';
}

// REPORTS
function iRptD(){var now=new Date();document.getElementById('rpt-f').value=new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0];document.getElementById('rpt-t2').value=td();}
function rReport(){var from=new Date(document.getElementById('rpt-f').value),to=new Date(document.getElementById('rpt-t2').value);to.setHours(23,59,59);var invs=DB.g('invoices').filter(function(i){return i.date&&new Date(i.date)>=from&&new Date(i.date)<=to;}),exps=DB.g('expenses').filter(function(e){return e.date&&new Date(e.date)>=from&&new Date(e.date)<=to;}),rev=invs.filter(function(i){return i.status==='paid';}).reduce(function(s,i){return s+Number(i.grand||0);},0),exp=exps.reduce(function(s,e){return s+Number(e.amount||0);},0);document.getElementById('rpt-out').innerHTML='<div class="fc"><div class="stats" style="margin-bottom:12px"><div class="sc" style="--c:var(--green)"><div class="sv">'+fmt(rev)+'</div><div class="sl">Revenue</div></div><div class="sc" style="--c:var(--red)"><div class="sv">'+fmt(exp)+'</div><div class="sl">Expenses</div></div><div class="sc" style="--c:var(--gold)"><div class="sv">'+fmt(rev-exp)+'</div><div class="sl">Net Profit</div></div><div class="sc" style="--c:var(--blue)"><div class="sv">'+invs.length+'</div><div class="sl">Invoices</div></div></div><table><thead><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>'+invs.map(function(i){return'<tr><td style="color:var(--gold)">'+i.num+'</td><td>'+(i.customer||'—')+'</td><td>'+(i.date||'—')+'</td><td style="font-weight:700">'+fmt(i.grand)+'</td><td>'+bdg(i.status)+'</td></tr>';}).join('')+'</tbody></table></div>';}
function expCSV(){var invs=DB.g('invoices'),rows=[['Invoice #','Customer','Date','Due','Amount','Status']].concat(invs.map(function(i){return[i.num,i.customer,i.date,i.due,i.grand,i.status];})),csv=rows.map(function(r){return r.join(',');}).join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='nexotronix-report.csv';a.click();}

// PROFIT
function rProfit(){var invs=DB.g('invoices'),exps=DB.g('expenses'),rev=invs.filter(function(i){return i.status==='paid';}).reduce(function(s,i){return s+Number(i.grand||0);},0),exp=exps.reduce(function(s,e){return s+Number(e.amount||0);},0),net=rev-exp;document.getElementById('prf-s').innerHTML='<div class="sc" style="--c:var(--green)"><div class="sv">'+fmt(rev)+'</div><div class="sl">Gross Revenue</div></div><div class="sc" style="--c:var(--red)"><div class="sv">'+fmt(exp)+'</div><div class="sl">Expenses</div></div><div class="sc" style="--c:var(--gold)"><div class="sv">'+fmt(net)+'</div><div class="sl">Net Profit</div></div><div class="sc" style="--c:var(--blue)"><div class="sv">'+(rev>0?(net/rev*100).toFixed(1)+'%':'0%')+'</div><div class="sl">Margin</div></div>';var mo=Array(12).fill(0),me=Array(12).fill(0);invs.filter(function(i){return i.status==='paid';}).forEach(function(i){mo[new Date(i.date||Date.now()).getMonth()]+=Number(i.grand||0);});exps.forEach(function(e){me[new Date(e.date||Date.now()).getMonth()]+=Number(e.amount||0);});var mx=Math.max.apply(null,mo.concat(me).concat([1]));var mns=['J','F','M','A','M','J','J','A','S','O','N','D'];document.getElementById('prf-ch').innerHTML=mns.map(function(m,i){return'<div class="bc"><div style="width:100%;display:flex;gap:2px;align-items:flex-end;height:84px"><div style="flex:1;background:rgba(56,161,105,0.7);border-radius:2px 2px 0 0;height:'+Math.round(mo[i]/mx*84)+'px"></div><div style="flex:1;background:rgba(229,62,62,0.6);border-radius:2px 2px 0 0;height:'+Math.round(me[i]/mx*84)+'px"></div></div><div class="bl">'+m+'</div></div>';}).join('');var tb=document.getElementById('prf-tb');if(!tb)return;tb.innerHTML=invs.filter(function(i){return i.status==='paid';}).map(function(i){var c=Number(i.grand||0)*0.6,gp=Number(i.grand||0)-c;return'<tr><td style="color:var(--gold)">'+i.num+'</td><td>'+(i.customer||'—')+'</td><td>'+fmt(i.grand)+'</td><td style="color:var(--muted)">'+fmt(c)+'</td><td style="color:var(--green);font-weight:700">'+fmt(gp)+'</td><td style="color:var(--gold)">'+(gp/Number(i.grand)*100).toFixed(1)+'%</td></tr>';}).join('')||'<tr><td colspan="6" style="text-align:center;padding:22px;color:var(--dim)">No paid invoices yet</td></tr>';}

// DOC PREVIEW & PRINT
function bDoc(type,doc,pdfMode){var s=DB.gO('settings'),isDark=pdfMode?true:document.documentElement.getAttribute('data-theme')==='dark',logo=isDark?'logo-dark.png':'logo-light.png',TL={inv:'INVOICE',qtn:'QUOTATION',rcp:'RECEIPT',est:'ESTIMATE'}[type]||type.toUpperCase();var items=doc.items||[];var sub=items.reduce(function(s,i){return s+Number(i.qty||1)*Number(i.price||i.cost||0);},0);var sizeClass=type==='rcp'?'dp-receipt':'dp-a4';return '<div class="dp '+sizeClass+'"><div class="dh"><div><img src="'+logo+'" class="dlogo" alt="Nexotronix" onerror="this.style.display=\'none\'"></div><div class="dco"><h3>'+(s.name||'Nexotronix')+'</h3><p>'+(s.address||'Maiduguri, Nigeria')+'</p><p>'+(s.phone||'+234 903 600 6553')+'</p>'+(s.email?'<p>'+s.email+'</p>':'')+'</div></div><div class="dtr"><div><div class="dn">'+TL+'</div><div style="font-size:15px;font-weight:700;color:#333">#'+doc.num+'</div></div><div style="font-size:10.5px;color:#555;text-align:right">'+(doc.date?'<div>Date: '+doc.date+'</div>':'')+(doc.due?'<div>Due: '+doc.due+'</div>':'')+(doc.valid?'<div>Valid: '+doc.valid+'</div>':'')+(doc.invoiceRef?'<div>Invoice: '+doc.invoiceRef+'</div>':'')+(doc.method?'<div>Method: '+doc.method+'</div>':'')+'</div></div><div class="dpa"><div class="dp2"><h4>Bill To</h4><p><b>'+(doc.customer||'Customer')+'</b></p><p>'+(doc.phone||'')+'</p><p>'+(doc.address||'')+'</p></div><div class="dp2"><h4>From</h4><p><b>'+(s.name||'Nexotronix')+'</b></p><p>'+(s.address||'')+'</p><p>WA: +'+(s.wa||'2349036006553')+'</p></div></div>'+(type==='rcp'?'<div style="background:#f9f9f9;border-radius:8px;padding:18px;text-align:center;margin-bottom:14px"><div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Amount Received</div><div style="font-size:30px;font-weight:900;color:#C9A84C">'+sym()+Number(doc.amount||0).toLocaleString()+'</div><div style="font-size:11px;color:#666;margin-top:4px">Method: '+(doc.method||'Cash')+'</div></div>'+'<table class="dit"><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody><tr><td>Payment for '+(doc.invoiceRef||'services')+'</td><td style="text-align:right;font-weight:700">'+sym()+Number(doc.amount||0).toLocaleString()+'</td></tr></tbody></table>':'<table class="dit"><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>'+items.map(function(i){return'<tr><td>'+(i.name||'—')+'</td><td style="text-align:center">'+(i.qty||1)+'</td><td style="text-align:right">'+sym()+Number(i.price||i.cost||0).toLocaleString()+'</td><td style="text-align:right;font-weight:700">'+sym()+(Number(i.qty||1)*Number(i.price||i.cost||0)).toLocaleString()+'</td></tr>';}).join('')+'</tbody></table><div style="text-align:right;margin-bottom:14px"><div class="dtrow"><span>Subtotal</span><span>'+sym()+sub.toLocaleString()+'</span></div>'+(doc.discount>0?'<div class="dtrow"><span>Discount('+doc.discount+'%)</span><span>-'+sym()+(sub*doc.discount/100).toLocaleString()+'</span></div>':'')+(doc.margin>0?'<div class="dtrow" style="color:green"><span>Margin('+doc.margin+'%)</span><span>+'+sym()+(sub*doc.margin/100).toLocaleString()+'</span></div>':'')+(doc.tax>0?'<div class="dtrow"><span>Tax('+doc.tax+'%)</span><span>+'+sym()+((sub*(1-(doc.discount||0)/100))*(doc.tax/100)).toLocaleString()+'</span></div>':'')+'<div class="dtrow gd"><span>TOTAL</span><span>'+sym()+Number(doc.grand||doc.total||sub).toLocaleString()+'</span></div>'+(doc.paid>0?'<div class="dtrow" style="color:green"><span>Paid</span><span>'+sym()+Number(doc.paid).toLocaleString()+'</span></div>':'')+'</div>')+'<div class="dterms" style="margin-bottom:14px"><b>Terms &amp; Conditions</b><br>'+(s.terms||'Payment due within 7 days.')+'</div><div class="df" style="grid-template-columns:1fr 1fr"><div><div class="dsig">Management Signature</div><div style="font-size:9px;color:#999;margin-top:3px">'+(s.name||'Nexotronix')+'</div></div><div><div class="dsig">Client Signature</div><div style="font-size:9px;color:#999;margin-top:3px">'+(doc.customer||'Customer')+'</div></div></div><div style="text-align:center;margin-top:12px;padding-top:10px;border-top:1px solid #eee;font-size:9px;color:#bbb">Generated by Nexotronix ERP — Smart Tech, Reliable Service</div></div>';}

function pDoc(type){var doc={};var items,di,tx;if(type==='inv'){items=gIItems();di=parseFloat(document.getElementById('inv-di').value)||0;tx=parseFloat(document.getElementById('inv-tx').value)||0;doc={num:document.getElementById('inv-num').value,customer:document.getElementById('inv-cu').value,phone:document.getElementById('inv-ph').value,address:document.getElementById('inv-ad').value,date:document.getElementById('inv-dt').value,due:document.getElementById('inv-du').value,items:items,discount:di,tax:tx,paid:parseFloat(document.getElementById('inv-pd').value)||0,grand:cGrand(items,di,tx),notes:document.getElementById('inv-nt').value};}else if(type==='qtn'){items=gQItems();di=parseFloat(document.getElementById('qtn-di').value)||0;tx=parseFloat(document.getElementById('qtn-tx').value)||0;doc={num:document.getElementById('qtn-num').value,customer:document.getElementById('qtn-cu').value,date:document.getElementById('qtn-dt').value,valid:document.getElementById('qtn-vl').value,items:items,discount:di,tax:tx,grand:cGrand(items,di,tx)};}else if(type==='est'){items=gEItems();var mg=parseFloat(document.getElementById('est-mg').value)||20,tr2=parseFloat(document.getElementById('est-tr').value)||0,sub2=items.reduce(function(s,i){return s+i.qty*i.cost;},0)+tr2;doc={num:document.getElementById('est-num').value,customer:document.getElementById('est-cu').value,date:document.getElementById('est-dt').value,items:items,margin:mg,transport:tr2,total:sub2+sub2*mg/100};}else if(type==='rcp'){doc={num:document.getElementById('rcp-num').value,customer:document.getElementById('rcp-cu').value,invoiceRef:document.getElementById('rcp-inv').value,date:document.getElementById('rcp-dt').value,amount:parseFloat(document.getElementById('rcp-am').value)||0,method:document.getElementById('rcp-mt').value};}
document.getElementById('prev-t').textContent=type.toUpperCase()+' Preview';document.getElementById('prev-body').innerHTML=bDoc(type,doc);om('m-prev');}

function pDocId(type,id){var map={inv:'invoices',qtn:'quotations',rcp:'receipts',est:'estimates'};var doc=DB.g(map[type]).find(function(d){return d.id===id;});if(!doc)return;document.getElementById('prev-t').textContent=type.toUpperCase()+' #'+doc.num;document.getElementById('prev-body').innerHTML=bDoc(type,doc);om('m-prev');}
/* prD: superseded by auto-save version below */
/* wDoc: superseded by auto-save + PDF-share version below */
function wDocId(type,id){var map={inv:'invoices',qtn:'quotations',rcp:'receipts',est:'estimates'};var doc=DB.g(map[type]).find(function(d){return d.id===id;});if(!doc)return;var s=DB.gO('settings'),wa=s.wa||'2349036006553';var msg='';if(type==='inv')msg='Hello '+( doc.customer||'Customer')+',\n\nYour invoice *'+doc.num+'* is ready.\n*Total: '+fmt(doc.grand)+'*\nDue: '+(doc.due||'—')+'\n\nNexotronix +'+wa;else if(type==='qtn')msg='Hello '+(doc.customer||'Customer')+',\n\nQuotation *'+doc.num+'*\n*Total: '+fmt(doc.grand)+'*\nValid until: '+(doc.valid||'—')+'\n\nNexotronix +'+wa;else if(type==='rcp')msg='Hello '+(doc.customer||'Customer')+',\n\nPayment Confirmed!\nReceipt: *'+doc.num+'*\nAmount: *'+fmt(doc.amount)+'*\nMethod: '+(doc.method||'Cash')+'\n\nNexotronix +'+wa;window.open('https://wa.me/?text='+encodeURIComponent(msg));}

// DELETE
function del(key,id,label){if(!confirm('Delete this '+label+'?'))return;DB.s(key,DB.g(key).filter(function(d){return d.id!==id;}));aud(label+' Deleted',id);toast(label+' deleted');var m={invoices:rInv,quotations:rQtn,receipts:rRcp,estimates:rEst,customers:rCust,projects:rProj,expenses:rExp};if(m[key])m[key]();}

// AUDIT LOG
function rAudit(){var logs=DB.g('audit');var tb=document.getElementById('audit-tb');if(!tb)return;if(!logs.length){tb.innerHTML='<tr><td colspan="3" style="text-align:center;padding:22px;color:var(--dim)">No audit logs yet.</td></tr>';return;}tb.innerHTML=logs.map(function(l){return'<tr><td style="color:var(--muted);white-space:nowrap;font-size:10px">'+new Date(l.ts).toLocaleString()+'</td><td style="font-weight:600">'+l.action+'</td><td style="color:var(--muted)">'+l.detail+'</td></tr>';}).join('');}

// SETTINGS
function lS(){var s=DB.gO('settings');var m={name:'name',phone:'phone',addr:'address',email:'email',wa:'wa',cur:'currency',tax:'tax',terms:'terms'};Object.keys(m).forEach(function(k){var el=document.getElementById('s-'+k);if(el&&s[m[k]]!==undefined)el.value=s[m[k]];});}
function saveS(){var s={};var m={name:'name',phone:'phone',addr:'address',email:'email',wa:'wa',cur:'currency',tax:'tax',terms:'terms'};Object.keys(m).forEach(function(k){var el=document.getElementById('s-'+k);if(el)s[m[k]]=el.value;});DB.sO('settings',s);S=s;CUR=s.currency||'N';aud('Settings Updated','Saved');toast('Settings saved!');}

async function saveCreds(){
  var u=document.getElementById('cred-user').value.trim();
  var p=document.getElementById('cred-pass').value;
  var c=getCreds();
  if(u) c.username=u;
  if(p) c.passwordHash = await sha256(p);
  DB.sO('creds', c);
  document.getElementById('cred-pass').value='';
  aud('Credentials Updated', 'Login username/password changed');
  toast('Login credentials updated!');
}

// BACKUP
function expAll(){var data={};['invoices','quotations','receipts','estimates','customers','projects','expenses','audit'].forEach(function(k){data[k]=DB.g(k);});data.settings=DB.gO('settings');data.at=new Date().toISOString();var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='nexotronix-erp-'+td()+'.json';a.click();aud('Backup','Exported');toast('Backup downloaded!');}
function impData(ev){var f=ev.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(e){try{var d=JSON.parse(e.target.result);['invoices','quotations','receipts','estimates','customers','projects','expenses','audit'].forEach(function(k){if(d[k])DB.s(k,d[k]);});if(d.settings)DB.sO('settings',d.settings);aud('Import',f.name);toast('Data imported!');go('dash');}catch(e2){alert('Invalid file');}};r.readAsText(f);}
function clrAll(){if(!confirm('Delete ALL ERP data? Cannot be undone!'))return;if(!confirm('Are you absolutely sure?'))return;['invoices','quotations','receipts','estimates','customers','projects','expenses','audit'].forEach(function(k){DB.s(k,[]);});go('dash');toast('All data cleared');}

// THEME
function toggleTheme(){var h=document.documentElement,d=h.getAttribute('data-theme')==='dark';h.setAttribute('data-theme',d?'light':'dark');document.getElementById('tbtn').textContent=d?'🌙':'☀️';document.getElementById('erp-logo').src=d?'logo-light.png':'logo-dark.png';localStorage.setItem('nx_theme',d?'light':'dark');}

// INIT
document.addEventListener('DOMContentLoaded',function(){
  var t=localStorage.getItem('nx_theme')||'dark';
  document.documentElement.setAttribute('data-theme',t);
  document.getElementById('tbtn').textContent=t==='dark'?'☀️':'🌙';
  document.getElementById('erp-logo').src=t==='dark'?'logo-dark.png':'logo-light.png';
  var s=DB.gO('settings');if(s.currency){CUR=s.currency;var el=document.getElementById('cur-sel');if(el)el.value=s.currency;}
  iRptD();uCL();rDash();
  document.querySelectorAll('.ov').forEach(function(o){o.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});});
  checkErpAuth();
  var creds=getCreds();
  var cu=document.getElementById('cred-user'); if(cu) cu.value=creds.username;
});


/* ==============================================================
   CUSTOM DYNAMIC OTP SECURITY SYSTEM
   ============================================================== */
let _otpReal = null;
let _otpExpiry = 0;
let _otpAttempts = 0;
const OTP_WINDOW_MS = 30000;
const OTP_MAX_ATTEMPTS = 5;

function _genOTP() {
  let s = '';
  for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 10);
  return s;
}

// Riffle-merge 3 ordered pairs while preserving each pair's internal order
function _shuffleColorPairs(otp) {
  const pairs = [
    { color: 'red',   digits: [otp[0], otp[1]] },
    { color: 'blue',  digits: [otp[2], otp[3]] },
    { color: 'green', digits: [otp[4], otp[5]] }
  ];
  const queues = pairs.map(p => ({ color: p.color, q: [...p.digits] }));
  const result = [];
  while (queues.some(qq => qq.q.length)) {
    const live = queues.filter(qq => qq.q.length);
    const pick = live[Math.floor(Math.random() * live.length)];
    result.push({ digit: pick.q.shift(), color: pick.color });
  }
  return result; // array of 6 {digit, color}, length 6
}

// Apply math obfuscation: group1 stays as key, group2/group3 get +key1/+key2 (mod 100)
function _applyMath(shuffled) {
  const vals = shuffled.map(s => s.digit);
  const g1 = vals[0] + vals[1];
  const g2raw = parseInt(vals[2] + '' + vals[3], 10);
  const g3raw = parseInt(vals[4] + '' + vals[5], 10);
  const key1 = parseInt(vals[0], 10);
  const key2 = parseInt(vals[1], 10);
  const g2new = (g2raw + key1) % 100;
  const g3new = (g3raw + key2) % 100;
  const g2str = String(g2new).padStart(2, '0');
  const g3str = String(g3new).padStart(2, '0');
  const displayDigits = (g1 + g2str + g3str).split('');
  // colors stay attached to ORIGINAL screen position (0-5)
  const displayColors = shuffled.map(s => s.color);
  return { digits: displayDigits, colors: displayColors };
}

function generateOTPChallenge() {
  _otpReal = _genOTP();
  _otpExpiry = Date.now() + OTP_WINDOW_MS;
  _otpAttempts = 0;
  const shuffled = _shuffleColorPairs(_otpReal);
  const { digits, colors } = _applyMath(shuffled);
  renderOTPChallenge(digits, colors);
  startOTPCountdown();
}

function renderOTPChallenge(digits, colors) {
  const colorMap = { red: '#e53e3e', blue: '#3182ce', green: '#38a169' };
  const box = document.getElementById('otp-challenge-digits');
  if (!box) return;
  box.innerHTML = digits.map((d, i) =>
    `<span class="otp-digit" style="background:${colorMap[colors[i]]}">${d}</span>`
  ).join('');
}

function startOTPCountdown() {
  const el = document.getElementById('otp-countdown');
  if (!el) return;
  clearInterval(window._otpTimer);
  window._otpTimer = setInterval(() => {
    const left = Math.max(0, Math.ceil((_otpExpiry - Date.now()) / 1000));
    el.textContent = left + 's';
    if (left <= 0) {
      clearInterval(window._otpTimer);
      el.textContent = 'Expired — tap Refresh';
      el.style.color = 'var(--red)';
    }
  }, 250);
}

function verifyOTPInput() {
  const input = document.getElementById('otp-input');
  const errEl = document.getElementById('otp-error');
  if (!input) return false;
  if (Date.now() > _otpExpiry) {
    errEl.textContent = '⏱ Challenge expired. Tap Refresh for a new one.';
    return false;
  }
  _otpAttempts++;
  if (_otpAttempts > OTP_MAX_ATTEMPTS) {
    errEl.textContent = '🔒 Too many attempts. Refresh for a new challenge.';
    return false;
  }
  if (input.value.trim() === _otpReal) {
    return true;
  }
  errEl.textContent = `❌ Incorrect (${OTP_MAX_ATTEMPTS - _otpAttempts} attempts left)`;
  return false;
}


/* ==============================================================
   LOGIN GATE — username/password (everyday) + OTP (admin-level)
   ============================================================== */
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCreds() {
  const c = DB.gO('creds');
  if (!c.username) {
    const def = { username: 'admin', passwordHash: 'd00b1e88cc18920714310a19671fe8f3dc6ac129277022bf9ed4a3345c32363' };
    DB.sO('creds', def);
    return def;
  }
  return c;
}

async function checkLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const c = getCreds();
  const errEl = document.getElementById('login-error');

  /* Auto-migrate old plain-text creds (saved before hashing was added) */
  if (c.username && !c.passwordHash && c.password) {
    c.passwordHash = await sha256(c.password);
    delete c.password;
    DB.sO('creds', c);
  }

  const pHash = await sha256(p);
  if (u === c.username && pHash === c.passwordHash) {
    errEl.textContent = '';
    requireOTP(function () { grantERPAccess(u); });
  } else {
    errEl.textContent = '❌ Incorrect username or password';
  }
}

function grantERPAccess(u) {
  sessionStorage.setItem('nx_erp_authed', '1');
  document.getElementById('login-gate').style.display = 'none';
  aud('Login', 'User logged in: ' + u);
}

function checkErpAuth() {
  if (sessionStorage.getItem('nx_erp_authed') === '1') {
    document.getElementById('login-gate').style.display = 'none';
  } else {
    document.getElementById('login-gate').style.display = 'flex';
  }
}

function logoutERP() {
  sessionStorage.removeItem('nx_erp_authed');
  document.getElementById('login-gate').style.display = 'flex';
  document.getElementById('login-pass').value = '';
}

/* ── OTP gate for Admin-level actions (Settings security, Clear All) ── */
let _otpPendingAction = null;

function requireOTP(actionFn) {
  _otpPendingAction = actionFn;
  document.getElementById('otp-gate').classList.add('open');
  document.getElementById('otp-error').textContent = '';
  document.getElementById('otp-input').value = '';
  generateOTPChallenge();
}

function refreshOTPChallenge() {
  generateOTPChallenge();
  document.getElementById('otp-input').value = '';
  document.getElementById('otp-error').textContent = '';
}

function submitOTP() {
  if (verifyOTPInput()) {
    document.getElementById('otp-gate').classList.remove('open');
    const fn = _otpPendingAction;
    _otpPendingAction = null;
    if (typeof fn === 'function') fn();
  }
}

function cancelOTP() {
  document.getElementById('otp-gate').classList.remove('open');
  _otpPendingAction = null;
}

/* ==============================================================
   5-TAP LOGO → REVEAL SIDEBAR (hidden nav trigger)
   ============================================================== */
let _logoTaps = [];
function handleLogoTap() {
  const now = Date.now();
  _logoTaps.push(now);
  _logoTaps = _logoTaps.filter(t => now - t < 3000);
  if (_logoTaps.length >= 5) {
    _logoTaps = [];
    document.getElementById('sb').classList.add('open');
  }
}
function closeSidebar() {
  document.getElementById('sb').classList.remove('open');
}


/* ==============================================================
   AUTO-SAVE WIRING: Print & WhatsApp Share auto-save first.
   Preview and Cancel never save.
   ============================================================== */
const _saveFnByType = { inv: sInv, qtn: sQtn, rcp: sRcp, est: sEst };

function autoSaveBeforeAction(type) {
  const fn = _saveFnByType[type];
  if (fn) fn();
}

/* Override prD (Print) to auto-save first, then print */
function prD(type) {
  autoSaveBeforeAction(type);
  pDoc(type);
  setTimeout(function () { window.print(); }, 350);
}

/* Override wDoc (Share via WhatsApp, from inside the open form) to auto-save first */
function wDoc(type) {
  autoSaveBeforeAction(type);
  const map = { inv: 'invoices', qtn: 'quotations', rcp: 'receipts', est: 'estimates' };
  const list = DB.g(map[type]);
  const latest = list[0]; // newest record after save
  if (latest) sharePDF(type, latest);
}

/* pDoc (Preview) stays untouched — no save call added */

/* ==============================================================
   SAVE PDF (explicit download button) + WhatsApp file-share
   Uses html2pdf.js (CDN) to rasterize the preview into a real PDF.
   Falls back to text-message WhatsApp link if file-share unsupported.
   ============================================================== */
function downloadPDF(type, doc) {
  const html = bDoc(type, doc, true); // true = pdfMode (forces print colors/sizing)
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  wrap.style.position = 'fixed'; wrap.style.left = '-9999px';
  document.body.appendChild(wrap);
  const opt = {
    margin: 0,
    filename: (doc.num || 'document') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: type === 'rcp' ? [80, 200] : 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(wrap).save().then(() => {
    document.body.removeChild(wrap);
    toast('📄 PDF downloaded!');
  }).catch(() => {
    document.body.removeChild(wrap);
    toast('⚠️ PDF generation failed — try Print instead');
  });
}

function downloadPDFFromForm(type) {
  autoSaveBeforeAction(type);
  const map = { inv: 'invoices', qtn: 'quotations', rcp: 'receipts', est: 'estimates' };
  const list = DB.g(map[type]);
  const latest = list[0];
  if (latest) downloadPDF(type, latest);
}

function sharePDF(type, doc) {
  const html = bDoc(type, doc, true);
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  wrap.style.position = 'fixed'; wrap.style.left = '-9999px';
  document.body.appendChild(wrap);
  const opt = {
    margin: 0,
    filename: (doc.num || 'document') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: type === 'rcp' ? [80, 200] : 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(wrap).outputPdf('blob').then(blob => {
    document.body.removeChild(wrap);
    const file = new File([blob], (doc.num || 'document') + '.pdf', { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: doc.num,
        text: 'Nexotronix — ' + (doc.num || '')
      }).catch(() => { /* user cancelled share sheet — no action needed */ });
    } else {
      /* Fallback: text-only WhatsApp link */
      const s = DB.gO('settings'), wa = s.wa || '2349036006553';
      const msg = 'Hello ' + (doc.customer || 'Customer') + ', your document ' + (doc.num || '') +
        ' is ready. (PDF file-sharing is not supported on this browser — please ask us to resend the file.) Nexotronix +' + wa;
      window.open('https://wa.me/?text=' + encodeURIComponent(msg));
      toast('ℹ️ File-share not supported here — sent text message instead');
    }
  }).catch(() => {
    document.body.removeChild(wrap);
    toast('⚠️ Could not generate PDF for sharing');
  });
}

function shareDocFromHistory(type, id) {
  const map = { inv: 'invoices', qtn: 'quotations', rcp: 'receipts', est: 'estimates' };
  const doc = DB.g(map[type]).find(d => d.id === id);
  if (doc) sharePDF(type, doc);
}

function downloadDocFromHistory(type, id) {
  const map = { inv: 'invoices', qtn: 'quotations', rcp: 'receipts', est: 'estimates' };
  const doc = DB.g(map[type]).find(d => d.id === id);
  if (doc) downloadPDF(type, doc);
}
