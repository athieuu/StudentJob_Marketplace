'use strict';
// Harness-only OpenAI-compatible chat client (reads API_KEY / BASE_URL / MODEL_NAME from the repo-root .env or process env).
// Not the production adapter (backend/src/ai/llm). Never logs the key or request bodies. Caches raw responses on disk
// (synthetic eval inputs only) so re-running a report does not re-bill.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadEnv() {
  const env = { ...process.env };
  const f = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i > 0 && !line.trim().startsWith('#')) { const k = line.slice(0, i).trim(); if (env[k] === undefined) env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, ''); }
    }
  }
  return env;
}

const CACHE_DIR = path.join(__dirname, 'reports', 'raw');

function createClient({ cache = true, timeoutMs = 120000 } = {}) {
  const env = loadEnv();
  const key = env.API_KEY; const base = (env.BASE_URL || '').replace(/\/+$/, ''); const model = env.MODEL_NAME;
  if (!key || !base || !model) throw new Error('missing API_KEY/BASE_URL/MODEL_NAME');
  const stats = { calls: 0, cacheHits: 0, errors: 0, inputTokens: 0, outputTokens: 0, latencies: [] };

  async function chat({ system, user, maxTokens = 2000, tag = '' }) {
    const body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens };
    const hash = crypto.createHash('sha256').update(JSON.stringify([base, body, tag])).digest('hex').slice(0, 24);
    const cf = path.join(CACHE_DIR, `${hash}.json`);
    if (cache && fs.existsSync(cf)) { stats.cacheHits += 1; return { ...JSON.parse(fs.readFileSync(cf, 'utf8')), cached: true }; }
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = Date.now(); const ac = new AbortController(); const to = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const res = await fetch(`${base}/chat/completions`, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
        const latencyMs = Date.now() - t0;
        if (res.status === 429 || res.status >= 500) { lastErr = new Error(`http_${res.status}`); await new Promise((r) => setTimeout(r, 1500)); continue; }
        if (!res.ok) throw new Error(`http_${res.status}`);
        const j = await res.json();
        const text = j.choices?.[0]?.message?.content ?? '';
        const out = { text, finish: j.choices?.[0]?.finish_reason || null, inputTokens: j.usage?.prompt_tokens ?? null, outputTokens: j.usage?.completion_tokens ?? null, latencyMs, model: j.model || model };
        stats.calls += 1; stats.latencies.push(latencyMs); stats.inputTokens += out.inputTokens || 0; stats.outputTokens += out.outputTokens || 0;
        if (cache) { fs.mkdirSync(CACHE_DIR, { recursive: true }); fs.writeFileSync(cf, JSON.stringify({ tag, ...out })); }
        return out;
      } catch (e) { lastErr = e.name === 'AbortError' ? new Error('timeout') : e; } finally { clearTimeout(to); }
    }
    stats.errors += 1;
    throw new Error(`llm_error:${lastErr?.message || 'unknown'}`);
  }
  return { chat, stats, model };
}

module.exports = { createClient };
