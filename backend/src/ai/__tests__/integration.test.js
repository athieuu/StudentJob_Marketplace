'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Isolate route tests from the database and authentication configuration.
function stub(modulePath, exports) {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
stub('../../middleware/authMiddleware', {
  authenticateToken: (req, res, next) => { req.user = { id: 1 }; next(); },
  authorizeRole: () => (req, res, next) => next(),
});
stub('../../models/cvModel', { getMyCVs: async () => [{ skills: ['React'] }] });
stub('../../models/profileModel', { getProfileByUserId: async () => ({}) });
stub('../../models/jobModel', {
  getJobById: async () => ({ id: 7, title: 'React developer', description: 'React' }),
  getAllJobs: async () => [{ id: 7, status: 'OPEN', title: 'React developer', description: 'React' }],
});
const app = express();
app.use(express.json());
app.use('/api/ai', require('../../routes/aiRoutes'));

test('AI routes preserve language policy, contracts, and safe fallbacks with a mocked provider', async () => {
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const localFetch = global.fetch;
  const base = `http://127.0.0.1:${server.address().port}/api/ai`;
  const request = (path, body) => localFetch(base + path, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const saved = Object.fromEntries(['API_KEY', 'BASE_URL', 'MODEL_NAME'].map((k) => [k, process.env[k]]));
  try {
    delete process.env.API_KEY; delete process.env.BASE_URL; delete process.env.MODEL_NAME;
    let response = await request('/cv/feedback', { cv: {} });
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /chưa được cấu hình/);
    response = await request('/jobs/recommended');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).aiUsed, false);

    process.env.API_KEY = 'synthetic-key'; process.env.BASE_URL = 'https://mock.invalid'; process.env.MODEL_NAME = 'mock-model';
    const calls = [];
    let payload = { overall: 'Hãy bổ sung kết quả cụ thể.', items: [{ area: 'experience', severity: 'high', tip: 'Nêu kết quả nếu có.' }] };
    global.fetch = async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }) };
    };
    const cv = { personal_info: { summary: 'Built React at Acme' }, skills: ['React'] };
    response = await request('/cv/feedback', { cv });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, payload);
    assert.match(calls.at(-1).messages[0].content, /natural Vietnamese with diacritics/);
    assert.match(calls.at(-1).messages[1].content, /Built React at Acme/);

    payload = { summary: 'Built React at Acme.' };
    response = await request('/cv/assist', { type: 'summary', cv });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.summary, payload.summary);
    assert.match(calls.at(-1).messages[0].content, /source CV's language/);

    payload = { bullets: [{ original: 'Built React at Acme', improved: 'Built React at Acme', notes: 'Nêu kết quả nếu có.' }] };
    response = await request('/cv/assist', { type: 'bullets', experience: { bullets: ['Built React at Acme'] } });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, payload);
    assert.match(calls.at(-1).messages[0].content, /notes in natural Vietnamese/);

    payload = { score: 70, strengths: ['Biết React'], gaps: [], advice: [], evidenceThin: false };
    response = await request('/jobs/7/fit', { cv });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data.strengths, ['Biết React']);
    assert.match(calls.at(-1).messages[0].content, /natural Vietnamese with diacritics/);

    payload = { ranking: [{ jobId: 7, reason: 'Phù hợp với kỹ năng React.' }] };
    response = await request('/jobs/recommended');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data[0].reason, payload.ranking[0].reason);
    assert.match(calls.at(-1).messages[0].content, /natural Vietnamese with diacritics/);

    payload = { suggestions: [{ name: 'React', reason: 'Được yêu cầu trong tin tuyển dụng.', inCv: true, isRequired: true }] };
    response = await request('/cv/assist', { type: 'skills', cv, targetJob: 'React developer' });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, payload);
    assert.match(calls.at(-1).messages[0].content, /natural Vietnamese with diacritics/);

    global.fetch = async () => { throw new Error('secret-provider-detail'); };
    response = await request('/cv/assist', { type: 'summary', cv });
    assert.equal(response.status, 500);
    assert.doesNotMatch(JSON.stringify(await response.json()), /secret-provider-detail/);
    response = await request('/jobs/7/fit', { cv });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.method, 'rule');
  } finally {
    global.fetch = localFetch;
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await new Promise((resolve) => server.close(resolve));
  }
});
