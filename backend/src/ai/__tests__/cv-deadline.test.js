'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mammoth = require('mammoth');

const auth = require.resolve('../../middleware/authMiddleware');
require.cache[auth] = { id: auth, filename: auth, loaded: true, exports: {
  authenticateToken: (req, res, next) => { req.user = { id: 1 }; next(); },
  authorizeRole: () => (req, res, next) => next(),
} };
let dbMode = 'ok', parseMode = 'ok', calls = 0, provider, finishParse;
const db = require.resolve('../../config/db');
require.cache[db] = { id: db, filename: db, loaded: true, exports: {
  query: async () => dbMode === 'hang' ? new Promise(() => {}) : [{ insertId: 42 }],
} };
mammoth.extractRawText = () => parseMode === 'hang' ? new Promise((resolve) => { finishParse = resolve; }) : Promise.resolve({ value: 'Synthetic React experience' });
const app = express();
app.locals.cvAnalysisTimeoutMs = 160;
app.locals.cvAnalysisAiTimeoutMs = 60;
app.use('/api/ai', require('../../routes/aiRoutes'));
const nativeFetch = global.fetch;
const extract = { language: 'en', summary: null, education: [], experience: [], skills: [], projects: [], certifications: [] };
const feedback = { overall: 'Review', items: [] };
const response = (data) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: typeof data === 'string' ? data : JSON.stringify(data) } }] }) });

test('CV route shares a deadline across real AI retry and repair paths', async () => {
  Object.assign(process.env, { API_KEY: 'synthetic', BASE_URL: 'https://mock.invalid', MODEL_NAME: 'synthetic' });
  global.fetch = (...args) => { calls++; return provider(...args); };
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  async function request() {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('PK synthetic')], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'synthetic.docx');
    const start = Date.now();
    const res = await nativeFetch(`http://127.0.0.1:${server.address().port}/api/ai/cv/analyze`, { method: 'POST', body: form });
    const body = await res.json();
    assert(Date.now() - start < 1000);
    return { status: res.status, body };
  }
  try {
    calls = 0; provider = () => new Promise(() => {});
    let result = await request();
    assert.equal(result.status, 200); assert.equal(result.body.aiUsed, false); assert.equal(result.body.historyId, 42); assert.equal(calls, 1);
    calls = 0; provider = () => calls === 1 ? response(extract) : new Promise(() => {});
    result = await request();
    assert.equal(result.status, 200); assert.equal(result.body.aiUsed, true); assert.equal(result.body.feedback, null); assert.equal(calls, 2);
    calls = 0; provider = () => calls === 1 ? Promise.reject(new Error('mock transient')) : response(calls === 2 ? extract : feedback);
    result = await request();
    assert.equal(result.status, 200); assert.equal(result.body.aiUsed, true); assert.equal(calls, 3);
    calls = 0; provider = () => response(calls === 1 ? 'bad JSON' : calls === 2 ? extract : feedback);
    result = await request();
    assert.equal(result.status, 200); assert.equal(result.body.aiUsed, true); assert.equal(calls, 3);
    calls = 0; provider = () => ({ ok: true, status: 200, json: () => new Promise(() => {}) });
    result = await request();
    assert.equal(result.status, 200); assert.equal(result.body.aiUsed, false); assert.equal(calls, 1);
    calls = 0; provider = () => ({ ok: false, status: 400, text: () => new Promise(() => {}) });
    result = await request();
    assert.equal(result.status, 200); assert.equal(result.body.aiUsed, false); assert.equal(calls, 1);
    calls = 0; provider = () => ({ ok: false, status: 500 });
    result = await request();
    assert.equal(result.status, 200); assert.equal(result.body.aiUsed, false); assert.equal(calls, 1);
    calls = 0; parseMode = 'hang'; provider = () => { throw new Error('unexpected'); };
    result = await request();
    assert.equal(result.status, 503); assert.equal(calls, 0);
    finishParse({ value: 'Synthetic React experience' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(calls, 0); parseMode = 'ok';
    dbMode = 'hang'; calls = 0; provider = () => response(calls === 1 ? extract : feedback);
    result = await request();
    assert.equal(result.status, 503); assert.equal(calls, 2);
  } finally {
    global.fetch = nativeFetch;
    await new Promise((resolve) => server.close(resolve));
  }
});
