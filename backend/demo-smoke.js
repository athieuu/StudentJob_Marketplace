'use strict';

// This writes only synthetic records to the newly created, identified local demo.
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const base = 'http://127.0.0.1:5000/api';
let passed = 0;
async function request(method, path, body, token) {
  const response = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  console.log(`${method} ${path.replace(/\d+/g, ':id')} ${response.status}`);
  return { status: response.status, data };
}
function check(condition, label) { assert.ok(condition, label); passed++; }
async function main() {
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 33481, user: 'studentjob_demo', password: 'demo-only', database: 'studentjob_marketplace' });
  const [[identity]] = await db.query('SELECT @@hostname AS hostname');
  assert.equal(identity.hostname, process.env.SJ17_CONTAINER_ID, 'Wrong database');
  try {
    const health = await request('GET', '/health/db'); check(health.status === 200 && health.data.result === 1, 'health');
    const student = await request('POST', '/auth/login', { email: 'student.demo@example.com', password: 'Student@123' });
    const employer = await request('POST', '/auth/login', { email: 'employer.demo@example.com', password: 'Student@123' });
    check(student.status === 200 && employer.status === 200, 'login');
    const st = student.data.token; const em = employer.data.token;
    const profile = await request('PUT', '/profile', { cv_url: 'https://example.test/synthetic-cv', skills: ['React', 'MySQL'] }, st);
    const profileRead = await request('GET', '/profile', null, st);
    check(profile.status === 200 && profileRead.status === 200 && profileRead.data.user.cv_url === 'https://example.test/synthetic-cv' && profileRead.data.user.skills.includes('React'), 'profile persistence');
    const cv = { title: 'Synthetic demo smoke CV', template: 'modern', personal_info: { summary: 'Synthetic React experience' }, skills: ['React'], education: [], experience: [], projects: [], certifications: [] };
    const create = await request('POST', '/cvs', cv, st); check(create.status === 201, 'create CV');
    const cvId = create.data.data.id;
    const read = await request('GET', `/cvs/${cvId}`, null, st); check(read.status === 200 && read.data.data.title === cv.title, 'read CV');
    const update = await request('PUT', `/cvs/${cvId}`, { ...cv, title: 'Synthetic demo smoke updated' }, st);
    const readUpdated = await request('GET', `/cvs/${cvId}`, null, st);
    check(update.status === 200 && readUpdated.data.data.title === 'Synthetic demo smoke updated', 'update CV');
    const removed = await request('DELETE', `/cvs/${cvId}`, null, st);
    const gone = await request('GET', `/cvs/${cvId}`, null, st); check(removed.status === 200 && gone.status === 404, 'delete CV');
    const job = await request('POST', '/jobs', { title: 'Synthetic smoke job', description: 'Synthetic React role', job_type: 'PART_TIME' }, em);
    check(job.status === 201, 'create job'); const jobId = job.data.jobId;
    const invalid = await request('POST', '/reviews', { job_id: jobId, rating: 9, comment: 'Synthetic review text' }, st);
    const ineligible = await request('POST', '/reviews', { job_id: jobId, rating: 4, comment: 'Synthetic review text' }, st);
    check(invalid.status === 400 && ineligible.status === 403, 'review validation and eligibility');
    await db.execute("INSERT INTO applications (job_id,student_id,status) VALUES (?,1,'ACCEPTED')", [jobId]);
    const review = await request('POST', '/reviews', { job_id: jobId, rating: 4, comment: 'Synthetic review text' }, st);
    const duplicate = await request('POST', '/reviews', { job_id: jobId, rating: 4, comment: 'Synthetic review text' }, st);
    const [[reviewRow]] = await db.execute('SELECT COUNT(*) AS n FROM reviews WHERE job_id=? AND user_id=1', [jobId]);
    check(review.status === 201 && duplicate.status === 409 && reviewRow.n === 1, 'review persistence and duplicate');
    const denied = await request('DELETE', `/jobs/${jobId}`, null, st);
    const deleted = await request('DELETE', `/jobs/${jobId}`, null, em);
    const [[jobRow]] = await db.execute('SELECT COUNT(*) AS n FROM jobs WHERE id=?', [jobId]);
    check(denied.status === 403 && deleted.status === 200 && jobRow.n === 0, 'job delete');
    const ai = await request('POST', '/ai/cv/feedback', { cv }, st);
    const recommendations = await request('GET', '/ai/jobs/recommended', null, st);
    check(ai.status === 503 && recommendations.status === 200 && recommendations.data.aiUsed === false, 'AI disabled');
    console.log(`PASS ${passed} checks; provider requests=0; disposable CV=${cvId} job=${jobId}`);
  } finally { await db.end(); }
}
main().catch((err) => { console.error(`FAIL after ${passed} checks: ${err.message}`); process.exitCode = 1; });
