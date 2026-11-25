'use strict';

// Run only against the dedicated Compose project documented in the validation report.
// Every outbound provider attempt is blocked; localhost HTTP uses the real Express app.
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
Object.assign(process.env, {
  DB_HOST: '127.0.0.1', DB_PORT: '33479', DB_USER: 'studentjob_demo',
  DB_PASSWORD: 'demo-only', DB_NAME: 'studentjob_marketplace', JWT_SECRET: 'synthetic-validation-only',
  API_KEY: 'synthetic-validation-only', BASE_URL: 'https://guard.invalid', MODEL_NAME: 'guard',
});
const mysql = require('mysql2/promise');
const nativeFetch = global.fetch;
let blocked = 0;
global.fetch = async (url, options) => {
  if (String(url).startsWith('http://127.0.0.1:')) return nativeFetch(url, options);
  blocked++;
  throw new Error('outbound request blocked');
};

async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: 33479, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const [[identity]] = await db.query('SELECT @@hostname AS hostname, DATABASE() AS db');
  assert.equal(identity.hostname, process.env.SJ14_CONTAINER_ID, 'Unexpected database container');
  assert.equal(identity.db, 'studentjob_marketplace');
  const [before] = await db.query('SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM cvs) cvs, (SELECT COUNT(*) FROM cv_parse_results) parses, (SELECT COUNT(*) FROM job_match_scores) matches');
  assert.deepEqual(before[0], { users: 3, cvs: 1, parses: 0, matches: 0 }, 'Database is not the untouched demo baseline');
  const hash = await bcrypt.hash('SyntheticOnly123!', 10);
  const [user] = await db.execute("INSERT INTO users (email,password,role) VALUES (?,?, 'STUDENT')", ['second.validation@example.test', hash]);
  const [job] = await db.execute("INSERT INTO jobs (employer_id,title,description,status,moderation_status) VALUES (1,'Hidden validation job','React synthetic role','OPEN','REJECTED')");
  const app = require('../../app');
  const pool = require('../../config/db');
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function req(path, method = 'GET', body, token) {
    const start = performance.now();
    const response = await nativeFetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    console.log(`${method} ${path.replace(/\d+/g, ':id')} status=${response.status} ms=${Math.round(performance.now() - start)}`);
    return { status: response.status, data };
  }
  try {
    const a = await req('/auth/login', 'POST', { email: 'student.demo@example.com', password: 'Student@123' });
    const b = await req('/auth/login', 'POST', { email: 'second.validation@example.test', password: 'SyntheticOnly123!' });
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    const cv = { title: 'Synthetic English CV', template: 'modern', personal_info: { summary: 'Built React projects' }, skills: ['React'], education: [], experience: [], projects: [], certifications: [] };
    const created = await req('/cvs', 'POST', cv, a.data.token);
    assert.equal(created.status, 201);
    const id = created.data.data.id;
    const own = await req(`/cvs/${id}`, 'GET', undefined, a.data.token);
    const other = await req(`/cvs/${id}`, 'GET', undefined, b.data.token);
    assert.equal(own.status, 200); assert.equal(own.data.data.title, cv.title); assert.equal(other.status, 404);
    const beforeNegative = blocked;
    const noConsent = await req('/ai/cv/feedback', 'POST', { cv }, a.data.token);
    console.log(`missing-consent status=${noConsent.status} blocked-provider-attempts=${blocked - beforeNegative}`);
    const beforeHidden = blocked;
    const hidden = await req(`/ai/jobs/${job.insertId}/fit`, 'POST', { cv }, a.data.token);
    console.log(`rejected-job status=${hidden.status} blocked-provider-attempts=${blocked - beforeHidden}`);
    const [rows] = await db.execute('SELECT id,user_id,title FROM cvs WHERE id=?', [id]);
    assert.deepEqual(rows[0], { id, user_id: 1, title: cv.title });
    const [after] = await db.query('SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM cvs) cvs, (SELECT COUNT(*) FROM cv_parse_results) parses, (SELECT COUNT(*) FROM job_match_scores) matches');
    console.log('database counts before=' + JSON.stringify(before[0]) + ' after=' + JSON.stringify(after[0]));
    console.log(`synthetic user id=${user.insertId} cv id=${id} rejected job id=${job.insertId} blocked provider attempts=${blocked} real provider requests=0`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end(); await db.end();
  }
}
main().catch(() => { console.error('Validation failed; inspect the isolated instance without printing secrets'); process.exitCode = 1; });
