'use strict';

// Continuation of disposable-validation.js on its retained, identified instance.
const assert = require('node:assert/strict');
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '33479', DB_USER: 'studentjob_demo', DB_PASSWORD: 'demo-only', DB_NAME: 'studentjob_marketplace', JWT_SECRET: 'synthetic-validation-only', API_KEY: '', BASE_URL: '', MODEL_NAME: '' });
const mysql = require('mysql2/promise');
async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: 33479, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const [[identity]] = await db.query('SELECT @@hostname AS hostname');
  assert.equal(identity.hostname, process.env.SJ14_CONTAINER_ID);
  const [[baseline]] = await db.query('SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM cvs) cvs, (SELECT COUNT(*) FROM jobs) jobs');
  assert.deepEqual(baseline, { users: 4, cvs: 2, jobs: 3 });
  const [jobs] = await db.query("INSERT INTO jobs (employer_id,title,description,status,moderation_status) VALUES (1,'Synthetic React developer','React JavaScript MySQL','OPEN','APPROVED'), (1,'Synthetic sales assistant','Customer Service English','OPEN','APPROVED')");
  const pool = require('../../config/db');
  const server = await new Promise((resolve) => { const s = require('../../app').listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function req(path, method, body, token) {
    const t = performance.now();
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
    const data = await response.json();
    console.log(`${method} ${path.replace(/\d+/g, ':id')} status=${response.status} ms=${Math.round(performance.now() - t)}`);
    return { status: response.status, data };
  }
  try {
    const login = await req('/auth/login', 'POST', { email: 'student.demo@example.com', password: 'Student@123' });
    assert.equal(login.status, 200);
    const token = login.data.token;
    const common = { template: 'modern', education: [], experience: [], projects: [], certifications: [] };
    const strong = { ...common, title: 'Synthetic strong English CV', personal_info: { summary: 'Built React and JavaScript projects with MySQL.' }, skills: ['React', 'JavaScript', 'MySQL'] };
    const weak = { ...common, title: 'Synthetic weak Vietnamese CV', personal_info: { summary: 'Hỗ trợ khách hàng tại cửa hàng.' }, skills: ['Customer Service'] };
    const strongSaved = await req('/cvs', 'POST', strong, token);
    const weakSaved = await req('/cvs', 'POST', weak, token);
    assert.equal(strongSaved.status, 201); assert.equal(weakSaved.status, 201);
    for (const [saved, cv] of [[strongSaved, strong], [weakSaved, weak]]) {
      const retrieved = await req(`/cvs/${saved.data.data.id}`, 'GET', {}, token);
      assert.equal(retrieved.status, 200);
      assert.equal(retrieved.data.data.title, cv.title);
      const [rows] = await db.execute('SELECT id,user_id,title,skills FROM cvs WHERE id=?', [saved.data.data.id]);
      assert.equal(rows[0].user_id, 1); assert.equal(rows[0].title, cv.title);
      assert.deepEqual(typeof rows[0].skills === 'string' ? JSON.parse(rows[0].skills) : rows[0].skills, cv.skills);
    }
    const a = await req(`/ai/jobs/${jobs.insertId}/fit`, 'POST', { cv: strong }, token);
    const b = await req(`/ai/jobs/${jobs.insertId}/fit`, 'POST', { cv: weak }, token);
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    console.log(`fit strong=${a.data.data.score} weak=${b.data.data.score} methods=${a.data.data.method}/${b.data.data.method}`);
    const [after] = await db.query('SELECT (SELECT COUNT(*) FROM cvs) cvs, (SELECT COUNT(*) FROM cv_parse_results) parses, (SELECT COUNT(*) FROM job_match_scores) matches');
    console.log(`created CV ids=${strongSaved.data.data.id},${weakSaved.data.data.id}; approved job ids=${jobs.insertId},${jobs.insertId + 1}; counts=${JSON.stringify(after[0])}; real provider requests=0`);
  } finally { await new Promise((resolve) => server.close(resolve)); await pool.end(); await db.end(); }
}
main().catch(() => { console.error('Validation failed; inspect the isolated instance without printing secrets'); process.exitCode = 1; });
