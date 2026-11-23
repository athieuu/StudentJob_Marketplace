/* Disposable demo only. Node 22+; no extra packages. See SMOKE_TEST.md. */
const fs = require('node:fs');
const base = 'http://127.0.0.1:5000';
const output = process.argv[2];
if (!output) throw Error('Usage: node database/smoke.cjs <evidence.json outside repo>');
const rows = [], tokens = {};
const clean = v => Array.isArray(v) ? v.map(clean) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, /token|password|hash|secret/i.test(k) ? '[redacted]' : clean(x)])) : v;
function record(group, method, endpoint, role, request, expected, status, response, ok, verdict) {
  const row = { group, method, endpoint, role: role || 'public', request: clean(request), expected, status,
    verdict: verdict || (ok ? 'PASS' : 'FAIL'), response: clean(response) };
  rows.push(row); console.log(`${row.verdict} ${method} ${endpoint} [${role || 'public'}] ${status}`);
}
async function http(group, method, endpoint, role, body, expectedStatus, check = () => true, expected = '', form = false, classify = () => undefined) {
  let status = 'network-error', data;
  try {
    const response = await fetch(base + endpoint, { method, signal: AbortSignal.timeout(15000),
      headers: { ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}), ...(!form && body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? (form ? body : JSON.stringify(body)) : undefined });
    status = response.status;
    if (response.headers.get('content-type')?.includes('application/pdf')) {
      const bytes = Buffer.from(await response.arrayBuffer());
      data = { bytes: bytes.length, pdfHeader: bytes.subarray(0, 5).toString(), matchesFixture: bytes.equals(pdf) };
    } else { const text = await response.text(); try { data = JSON.parse(text); } catch { data = { text: text.slice(0, 600) }; } }
    record(group, method, endpoint, role, form ? Object.fromEntries([...body.entries()].map(([k,v]) => [k, typeof v === 'string' ? v : { filename: v.name, type: v.type, size: v.size }])) : body,
      `${expectedStatus}; ${expected}`, status, data, status === expectedStatus && check(data), classify(status, data));
    return data;
  } catch (error) { record(group, method, endpoint, role, null, `${expectedStatus}; ${expected}`, status, { error: error.message }, false); return {}; }
}
// A valid single-page synthetic text PDF, with byte-correct xref offsets.
const textLines = ['Smoke Student', 'smoke@example.invalid', '0900000000', 'Address: Demo City', 'Skills', 'JavaScript, React'];
function makePdf() {
  const stream = 'BT /F1 12 Tf 50 760 Td ' + textLines.map((s,i) => `${i ? '0 -20 Td ' : ''}(${s}) Tj`).join('\n') + ' ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let result = '%PDF-1.4\n', offsets = [0];
  objects.forEach((s,i) => { offsets.push(Buffer.byteLength(result)); result += `${i+1} 0 obj\n${s}\nendobj\n`; });
  const xref = Buffer.byteLength(result);
  result += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(result);
}
const pdf = makePdf();
// Minimal standards-based uncompressed ZIP/DOCX; generated in memory, never saved.
function crc32(buf) { let c = 0xffffffff; for (const byte of buf) { c ^= byte; for (let j=0;j<8;j++) c = (c>>>1) ^ ((c&1) ? 0xedb88320 : 0); } return (c^0xffffffff)>>>0; }
function docx() {
  const files = { '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + textLines.map(s => `<w:p><w:r><w:t>${s}</w:t></w:r></w:p>`).join('') + '</w:body></w:document>' };
  const local = [], central = []; let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const n = Buffer.from(name), b = Buffer.from(content), crc = crc32(b), h = Buffer.alloc(30), c = Buffer.alloc(46);
    h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20,4); h.writeUInt32LE(crc,14); h.writeUInt32LE(b.length,18); h.writeUInt32LE(b.length,22); h.writeUInt16LE(n.length,26);
    c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20,4); c.writeUInt16LE(20,6); c.writeUInt32LE(crc,16); c.writeUInt32LE(b.length,20); c.writeUInt32LE(b.length,24); c.writeUInt16LE(n.length,28); c.writeUInt32LE(offset,42);
    local.push(h,n,b); central.push(c,n); offset += h.length+n.length+b.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(3,8); end.writeUInt16LE(3,10); end.writeUInt32LE(cd.length,12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,cd,end]);
}
function multipart(field, bytes, filename, type) { const f = new FormData(); f.set(field, new Blob([bytes],{type}),filename); return f; }
// Real Engine.IO v4 / Socket.IO default namespace over WebSocket, using Node's client.
async function socket(role) {
  const ws = new WebSocket('ws://127.0.0.1:5000/socket.io/?EIO=4&transport=websocket');
  const queue = [], pending = [];
  ws.addEventListener('message', e => {
    const s = String(e.data); if (s === '2') { ws.send('3'); return; }
    const i = pending.findIndex(p => p.test(s));
    if (i >= 0) { const p = pending.splice(i,1)[0]; clearTimeout(p.timer); p.resolve(s); } else queue.push(s);
  });
  const wait = test => new Promise((resolve,reject) => {
    const i = queue.findIndex(test); if (i >= 0) return resolve(queue.splice(i,1)[0]);
    const p = { test, resolve, timer: setTimeout(() => { pending.splice(pending.indexOf(p),1); reject(Error('Socket event timeout')); },8000) }; pending.push(p);
  });
  await wait(s => s.startsWith('0'));
  ws.send('40'+JSON.stringify({ token: tokens[role] })); await wait(s => s.startsWith('40'));
  return { ws, wait };
}
async function main() {
  await http('Health','GET','/api/health/db',null,null,200,d => d.result===1,'MySQL SELECT 1');
  for (const role of ['student','employer','admin']) {
    const login = await http('Login','POST','/api/auth/login',null,{ email: `${role}.demo@example.com`, password: 'Student@123' },200,d => !!d.token && d.user?.role===role.toUpperCase(),`${role} seed account token and role`);
    tokens[role] = login.token;
    await http('Login','GET','/api/auth/me',role,null,200,d => d.user?.role===role.toUpperCase(),'JWT accepted');
    await http('Profiles','GET','/api/profile',role,null,200,d => d.user?.role===role.toUpperCase(),'correct role profile');
  }
  for (const [role,body] of [['student',{ full_name:'Demo Student Smoke', phone:'0900000000', university:'Demo University',major:'Information Technology',bio:'Smoke test' }],['employer',{company_name:'Demo Technology Smoke',phone:'0900000001',address:'Demo City',description:'Smoke test'}]]) {
    await http('Profiles','PUT','/api/profile',role,body,200,d => d.user?.phone===body.phone,'updated fields returned');
    await http('Profiles','GET','/api/profile',role,null,200,d => d.user?.phone===body.phone,'update persists');
  }
  await http('Profiles','PUT','/api/profile','admin',{full_name:'Admin'},403,()=>true,'admin profile editing forbidden');
  await http('Jobs','GET','/api/jobs',null,null,200,d => d.data?.length===2 && d.data.every(x=>x.moderation_status==='APPROVED'),'two seeded approved jobs');
  await http('Jobs','GET','/api/jobs/mine','employer',null,200,d=>d.data?.length===2,'two employer jobs');
  const jobBody = { title:'Smoke approval', description:'Synthetic job',location:'Demo City',salary_min:25000,salary_max:35000,job_type:'PART_TIME',deadline:'2026-12-31',status:'OPEN' };
  const approved = await http('Jobs','POST','/api/jobs','employer',jobBody,201,d=>!!d.jobId && d.moderation_status==='PENDING','new pending job');
  const rejected = await http('Jobs','POST','/api/jobs','employer',{...jobBody,title:'Smoke rejection'},201,d=>!!d.jobId,'second pending job');
  await http('Jobs','GET','/api/admin/jobs/pending','admin',null,200,d=>d.data?.some(x=>x.id===approved.jobId)&&d.data?.some(x=>x.id===rejected.jobId),'both created jobs pending');
  await http('Jobs','PATCH',`/api/admin/jobs/${approved.jobId}/moderation`,'admin',{moderation_status:'APPROVED'},200,d=>d.moderation_status==='APPROVED','approve');
  await http('Jobs','PATCH',`/api/admin/jobs/${rejected.jobId}/moderation`,'admin',{moderation_status:'REJECTED',rejection_reason:'Synthetic rejection'},200,d=>d.moderation_status==='REJECTED','reject with reason');
  await http('Jobs','GET','/api/jobs',null,null,200,d=>d.data?.some(x=>x.id===approved.jobId)&&!d.data?.some(x=>x.id===rejected.jobId),'approved visible, rejected absent');
  await http('Jobs','GET',`/api/jobs/${rejected.jobId}`,null,null,404,()=>true,'rejected job hidden from public detail');
  const application = await http('Applications','POST','/api/applications','student',{job_id:2,cover_letter:'Synthetic smoke application'},201,d=>!!d.applicationId,'create new application (seed already occupies job 1)');
  const appId = application.applicationId;
  const uploaded = await http('Applications','POST',`/api/applications/${appId}/cv`,'student',multipart('cv',pdf,'smoke.pdf','application/pdf'),200,d=>d.cv_url?.startsWith('private-cv:'),'PDF stored and reference updated',true);
  if (uploaded.cv_url) fs.writeFileSync(output+'.upload',uploaded.cv_url.slice('private-cv:'.length));
  await http('Applications','GET','/api/applications/my','student',null,200,d=>d.data?.some(x=>x.id===appId&&x.cv_url===uploaded.cv_url),'student reads persisted application+CV');
  await http('Applications','GET','/api/applications/job/2','employer',null,200,d=>d.data?.some(x=>x.id===appId),'employer reads application');
  await http('Applications','GET','/api/admin/applications','admin',null,200,d=>d.data?.some(x=>x.id===appId),'admin reads application');
  for (const mode of ['view','download']) await http('Applications','GET',`/api/applications/${appId}/cv/${mode}`,'employer',null,200,d=>d.matchesFixture,'same PDF bytes returned');
  await http('Applications','PATCH',`/api/applications/${appId}/status`,'employer',{status:'ACCEPTED'},200,()=>true,'accept application');
  await http('Applications','GET','/api/applications/my','student',null,200,d=>d.data?.some(x=>x.id===appId&&x.status==='ACCEPTED'),'status persists');
  await http('Applications','POST','/api/applications','student',{job_id:2},409,()=>true,'duplicate rejected');
  await http('Applications','POST','/api/applications','student',{job_id:rejected.jobId,cover_letter:'Rejected job guard probe'},400,()=>true,'cannot apply to rejected job');
  const cvBody={title:'Smoke CV',template:'modern',personal_info:{full_name:'Smoke Student',email:'smoke@example.invalid'},education:[],experience:[],skills:['JavaScript'],projects:[],certifications:[]};
  const cv=await http('CV builder','POST','/api/cvs','student',cvBody,201,d=>!!d.data?.id,'create CV'); const cvId=cv.data?.id;
  await http('CV builder','GET','/api/cvs','student',null,200,d=>d.data?.some(x=>x.id===cvId),'list includes created CV');
  await http('CV builder','PUT',`/api/cvs/${cvId}`,'student',{...cvBody,title:'Smoke CV updated',skills:['JavaScript','React']},200,()=>true,'update CV');
  await http('CV builder','GET',`/api/cvs/${cvId}`,'student',null,200,d=>d.data?.title==='Smoke CV updated'&&d.data.skills?.includes('React'),'JSON/title update persists');
  await http('CV builder','DELETE',`/api/cvs/${cvId}`,'student',null,200,()=>true,'delete CV');
  await http('CV builder','GET',`/api/cvs/${cvId}`,'student',null,404,()=>true,'deleted CV absent');
  for (const [bytes,name,type] of [[pdf,'smoke.pdf','application/pdf'],[docx(),'smoke.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],[pdf,'smoke.pdf','application/octet-stream']]) {
    await http('CV parse','POST','/api/cvs/parse','student',multipart('file',bytes,name,type),200,d=>d.data?.personal_info?.email==='smoke@example.invalid','extract synthetic email',true);
  }
  const convo=await http('Chat','POST','/api/chat/conversations','student',{employerId:1},200,d=>!!d.conversationId,'create/upsert conversation using profile id'); const cid=convo.conversationId;
  await http('Chat','POST','/api/chat/conversations','student',{employerId:1},200,d=>d.conversationId===cid,'upsert returns same id');
  for (const role of ['student','employer']) await http('Chat','GET','/api/chat/conversations',role,null,200,d=>d.conversations?.some(x=>x.id===cid),'inbox includes conversation');
  const rest=await http('Chat','POST',`/api/chat/conversations/${cid}/messages`,'student',{content:'Smoke REST message'},201,d=>d.data?.content==='Smoke REST message','REST send');
  await http('Chat','GET',`/api/chat/conversations/${cid}/messages`,'employer',null,200,d=>d.messages?.some(x=>x.id===rest.data?.id&&x.content==='Smoke REST message'),'REST message persisted');
  let a,b;
  try {
    a=await socket('student'); b=await socket('employer');
    for(const client of [a,b]) { client.ws.send('42'+JSON.stringify(['join_conversation',cid])); await client.wait(s=>s.startsWith('42')&&JSON.parse(s.slice(2))[0]==='joined_conversation'); }
    record('Socket.IO','EVENT','join_conversation','student+employer',{conversationId:cid},'both joined_conversation', 'event',{bothJoined:true},true);
    a.ws.send('421'+JSON.stringify(['send_message',{conversationId:cid,content:'Smoke socket message'}]));
    const ack=JSON.parse((await a.wait(s=>s.startsWith('431'))).slice(3))[0];
    const delivery=JSON.parse((await b.wait(s=>s.startsWith('42')&&JSON.parse(s.slice(2))[0]==='receive_message')).slice(2))[1];
    record('Socket.IO','EVENT','send_message','student',{conversationId:cid,content:'Smoke socket message'},'success ack plus employer receive_message same id','event',{ack,delivery},ack.success&&ack.message.id===delivery.id);
    await http('Socket.IO','GET',`/api/chat/conversations/${cid}/messages`,'employer',null,200,d=>d.messages?.some(x=>x.id===delivery.id&&x.content==='Smoke socket message'),'socket message persists in REST history');
  } catch(error) { record('Socket.IO','EVENT','send_message','student',null,'ack, delivery, persistence','error',{error:error.message},false); }
  finally { a?.ws.close(); b?.ws.close(); }
  await http('OTP','POST','/api/auth/register',null,{email:'smoke-registration@example.invalid',password:'Synthetic@123',role:'STUDENT',full_name:'Smoke Registration'},400,()=>true,'direct register requires OTP');
  await http('OTP','POST','/api/auth/register/request-otp',null,{email:'smoke-registration@example.invalid',password:'Synthetic@123',role:'STUDENT',full_name:'Smoke Registration'},200,()=>true,'OTP delivered (requires configured SMTP)',false,
    (status,data)=>status===500 && data?.message?.includes('SMTP') ? 'BLOCKED' : undefined);
  record('OTP','POST','/api/auth/register/verify-otp',null,{email:'smoke-registration@example.invalid',otp:'[unavailable]'},'201 user registration','not sent',{reason:'OTP delivery blocked by unset SMTP; no bypass or fabricated OTP'},false,'BLOCKED');
}
main().catch(error=>{record('Runner','ERROR','runner',null,null,'complete',0,{error:error.stack},false);}).finally(()=>{
  const counts=Object.fromEntries(['PASS','FAIL','BLOCKED'].map(v=>[v,rows.filter(r=>r.verdict===v).length]));
  fs.writeFileSync(output,JSON.stringify({time:new Date().toISOString(),node:process.version,base,counts,rows},null,2));
  console.log(JSON.stringify(counts)); process.exitCode=counts.FAIL?1:0;
});
