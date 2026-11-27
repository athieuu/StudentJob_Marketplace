// Explicit opt-in; only runs against the disposable local test database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

test('imported internships are visible, editable and hide their fingerprints', async () => {
  assert.equal(process.env.DB_HOST, '127.0.0.1');
  assert.equal(process.env.DB_PORT, '3307');
  assert.equal(process.env.DB_NAME, 'studentjob_marketplace');
  process.env.JWT_SECRET = 'synthetic-test-only-secret';
  const app = require('../src/app');
  const pool = require('../src/config/db');
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const employerToken = jwt.sign({ id: 2, role: 'EMPLOYER' }, process.env.JWT_SECRET);
    const adminToken = jwt.sign({ id: 3, role: 'ADMIN' }, process.env.JWT_SECRET);
    const studentToken = jwt.sign({ id: 1, role: 'STUDENT' }, process.env.JWT_SECRET);
    const get = async (path, token) => {
      const response = await fetch(base + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      assert.equal(response.status, 200);
      return (await response.json()).data;
    };
    const jobs = await get('/jobs');
    assert.equal(jobs.filter(j => j.job_type === 'INTERNSHIP').length, 14);
    assert.ok(jobs.every(j => !('import_fingerprint' in j)));
    const job = jobs.find(j => j.job_type === 'INTERNSHIP');
    assert.ok(job.category && job.work_mode && job.responsibilities && job.requirements && job.skills);
    assert.ok(!('import_fingerprint' in await get(`/jobs/${job.id}`)));
    assert.ok((await get('/jobs/mine', employerToken)).some(j => j.id === job.id && !('import_fingerprint' in j)));
    assert.ok((await get('/admin/jobs/pending', adminToken)).every(j => !('import_fingerprint' in j)));
    const forgedAdmin = jwt.sign({ id: 2, role: 'ADMIN' }, process.env.JWT_SECRET);
    assert.equal((await fetch(`${base}/admin/users`, { headers: { Authorization: `Bearer ${forgedAdmin}` } })).status, 401);
    assert.equal((await fetch(`${base}/admin/users/1`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } })).status, 409);
    assert.equal((await fetch(`${base}/admin/users/3`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } })).status, 403);
    try {
      await pool.execute("UPDATE users SET status='BLOCKED' WHERE id=1");
      assert.equal((await fetch(`${base}/profile`, { headers: { Authorization: `Bearer ${studentToken}` } })).status, 401);
    } finally {
      await pool.execute("UPDATE users SET status='ACTIVE' WHERE id=1");
    }
    const response = await fetch(`${base}/jobs/${job.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${employerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: job.title }) });
    assert.equal(response.status, 200);
    const updated = await get(`/jobs/${job.id}`);
    for (const key of ['job_type', 'category', 'work_mode', 'responsibilities', 'requirements', 'skills']) assert.equal(updated[key], job[key]);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
