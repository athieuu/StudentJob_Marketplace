'use strict';

// Only run against a fresh, positively identified disposable integration DB.
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const JSZip = require('jszip');
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '33483', DB_USER: 'studentjob_demo', DB_PASSWORD: 'demo-only', DB_NAME: 'studentjob_marketplace', JWT_SECRET: 'integration-only', API_KEY: 'synthetic', BASE_URL: 'https://mock.invalid', MODEL_NAME: 'synthetic', SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', EMAIL_FROM: '' });
const realFetch = global.fetch;
let providerCalls = 0;
let invalidExtraction = false;
let feedbackInput = '';
global.fetch = async (_url, options) => {
  providerCalls++;
  const { messages } = JSON.parse(options.body);
  const isExtract = messages[0].content.includes('You extract structured data');
  if (!isExtract) feedbackInput = messages[1].content;
  const content = isExtract && invalidExtraction ? 'invalid JSON' : JSON.stringify(isExtract
    ? { language: 'en', summary: null, education: [], experience: [], skills: [{ name: 'React', level: null }], projects: [], certifications: [] }
    : { overall: 'Hãy bổ sung thông tin nếu có.', items: [] });
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) };
};
function pdf(stream) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let s = '%PDF-1.4\n'; const offsets = [0]; objects.forEach((v, i) => { offsets.push(Buffer.byteLength(s)); s += `${i + 1} 0 obj\n${v}\nendobj\n`; });
  const start = Buffer.byteLength(s); s += `xref\n0 ${offsets.length}\n0000000000 65535 f \n` + offsets.slice(1).map((n) => `${String(n).padStart(10, '0')} 00000 n \n`).join('') + `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(s);
}
async function docx() {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Example Student React experience</w:t></w:r></w:p></w:body></w:document>');
  return z.generateAsync({ type: 'nodebuffer' });
}
async function main() {
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 33483, user: 'studentjob_demo', password: 'demo-only', database: 'studentjob_marketplace' });
  const [[identity]] = await db.query('SELECT @@hostname AS hostname');
  assert.ok(process.env.SJ22_CONTAINER_ID); assert.equal(identity.hostname, process.env.SJ22_CONTAINER_ID);
  const [[state]] = await db.query("SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM cv_parse_results) histories, (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='cv_parse_results' AND column_name IN ('file_name','feedback')) history_columns, (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='student_profiles' AND column_name='cv_url') profile_column, (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='reviews') reviews");
  assert.deepEqual(state, { users: 3, histories: 0, history_columns: 2, profile_column: 1, reviews: 1 });
  const hash = await bcrypt.hash('SyntheticOnly123!', 10);
  const [newUser] = await db.execute("INSERT INTO users (email,password,role) VALUES (?,?,'STUDENT')", ['integration.second@example.test', hash]);
  const [newProfile] = await db.execute("INSERT INTO student_profiles (user_id,full_name) VALUES (?,'Synthetic Student')", [newUser.insertId]);
  const [job] = await db.execute("INSERT INTO jobs (employer_id,title,description,job_type,status,moderation_status) VALUES (1,'Synthetic job','React role','PART_TIME','OPEN','APPROVED')");
  await db.execute("INSERT INTO applications (job_id,student_id,status) VALUES (?,1,'ACCEPTED')", [job.insertId]);
  const pool = require('../../config/db');
  const app = require('../../app');
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let checks = 0;
  async function req(method, path, body, token, form = false) {
    const r = await realFetch(base + path, { method, headers: { ...(body && !form ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: form ? body : JSON.stringify(body) } : {}) });
    const data = await r.json(); console.log(`${method} ${path.replace(/\d+/g, ':id')} status=${r.status}`); return { status: r.status, data };
  }
  function check(ok, label) { assert.ok(ok, label); checks++; }
  async function upload(name, bytes, type, token, targetJob) {
    const form = new FormData(); form.append('file', new Blob([bytes], { type }), name);
    if (targetJob) form.append('targetJob', targetJob);
    return req('POST', '/ai/cv/analyze', form, token, true);
  }
  try {
    check((await req('GET', '/health/db')).status === 200, 'health');
    const s = await req('POST', '/auth/login', { email: 'student.demo@example.com', password: 'Student@123' });
    const e = await req('POST', '/auth/login', { email: 'employer.demo@example.com', password: 'Student@123' });
    const other = await req('POST', '/auth/login', { email: 'integration.second@example.test', password: 'SyntheticOnly123!' });
    check(s.status === 200 && e.status === 200 && other.status === 200, 'real logins');
    const st = s.data.token, em = e.data.token, ot = other.data.token;
    const typeDoc = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const doc = await docx();
    const analysed = await upload('synthetic.docx', doc, typeDoc, st, 'Synthetic React target role');
    check(analysed.status === 200 && analysed.data.aiUsed && Number.isInteger(analysed.data.historyId), 'analysis and history id');
    check(feedbackInput.includes('<target_job>') && feedbackInput.includes('Synthetic React target role'), 'target job reached feedback prompt');
    const historyId = analysed.data.historyId;
    const [[history]] = await db.execute('SELECT id,user_id,parser FROM cv_parse_results WHERE id=?', [historyId]);
    check(history && history.user_id === 1 && history.parser === 'ai_llm', 'persisted history owner');
    const mine = await req('GET', '/ai/cv/history', null, st); const theirs = await req('GET', '/ai/cv/history', null, ot);
    check(mine.data.data.some((h) => h.id === historyId) && !theirs.data.data.some((h) => h.id === historyId), 'history visibility');
    check((await req('DELETE', `/ai/cv/history/${historyId}`, null, ot)).status === 404, 'other user cannot delete');
    check((await req('DELETE', `/ai/cv/history/${historyId}`, null, st)).status === 200, 'owner can delete');
    const [[deleted]] = await db.execute('SELECT COUNT(*) n FROM cv_parse_results WHERE id=?', [historyId]); check(deleted.n === 0, 'deleted row');
    invalidExtraction = true;
    const fallback = await upload('fallback.docx', doc, typeDoc, st, 'Synthetic fallback target');
    const [[fallbackRow]] = await db.execute('SELECT user_id,parser,status FROM cv_parse_results WHERE id=?', [fallback.data.historyId]);
    check(fallback.status === 200 && fallback.data.aiUsed === false && Number.isInteger(fallback.data.historyId) && fallbackRow.user_id === 1 && fallbackRow.parser === 'basic_rule' && feedbackInput.includes('Synthetic fallback target'), 'persisted extraction fallback and feedback');
    invalidExtraction = false;
    const text = await upload('text.pdf', pdf('BT /F1 12 Tf 20 250 Td (Synthetic React experience) Tj ET'), 'application/pdf', st);
    check(text.status === 200 && Number.isInteger(text.data.historyId), 'readable PDF');
    const before = providerCalls;
    const image = await upload('image.pdf', pdf('q 50 0 0 50 0 0 cm BI /W 1 /H 1 /CS /RGB /BPC 8 /F /AHx ID FF0000> EI Q'), 'application/pdf', st);
    const blank = await upload('blank.pdf', pdf(''), 'application/pdf', st);
    check(image.status === 422 && blank.status === 422 && providerCalls === before && image.data.message.includes('OCR'), 'no-text PDF blocks provider');
    const profile = await req('PUT', '/profile', { cv_url: 'https://example.test/synthetic', skills: ['React', 'MySQL'] }, st);
    const read = await req('GET', '/profile', null, st);
    check(profile.status === 200 && read.data.user.cv_url === 'https://example.test/synthetic' && read.data.user.skills.includes('React'), 'profile 007');
    const review = await req('POST', '/reviews', { job_id: job.insertId, rating: 4, comment: 'Synthetic review content' }, st);
    const [[rr]] = await db.execute('SELECT COUNT(*) n FROM reviews WHERE job_id=? AND user_id=1', [job.insertId]);
    check(review.status === 201 && rr.n === 1, 'review 007');
    const studentChat = await req('POST', '/chat/conversations', { employerId: 1 }, st);
    const employerChat = await req('POST', '/chat/conversations', { studentUserId: newUser.insertId }, em);
    check(studentChat.status === 200 && employerChat.status === 200 && studentChat.data.conversationId !== employerChat.data.conversationId, 'both chat initiators');
    const c1 = studentChat.data.conversationId, c2 = employerChat.data.conversationId;
    check((await req('POST', `/chat/conversations/${c1}/messages`, { content: 'Synthetic hello' }, st)).status === 201, 'student message');
    check((await req('POST', `/chat/conversations/${c2}/messages`, { content: 'Synthetic reply' }, em)).status === 201, 'employer message');
    check((await req('GET', `/chat/conversations/${c2}/messages`, null, ot)).data.messages.length === 1 && (await req('GET', `/chat/conversations/${c2}/messages`, null, st)).status === 403, 'chat read and ownership');
    const [[messages]] = await db.execute('SELECT COUNT(*) n FROM messages WHERE conversation_id IN (?,?)', [c1, c2]); check(messages.n === 2, 'message persistence');
    console.log(`PASS ${checks} checks; mocked provider calls=${providerCalls}; real provider network calls=0; history=${historyId} fallback=${fallback.data.historyId} pdf=${text.data.historyId} student=${newUser.insertId} profile=${newProfile.insertId} job=${job.insertId} conversations=${c1},${c2}`);
  } finally { await new Promise((resolve) => server.close(resolve)); await pool.end(); await db.end(); }
}
main().catch(() => { console.error('Combined smoke failed; check isolated fixture and route contracts'); process.exitCode = 1; });
