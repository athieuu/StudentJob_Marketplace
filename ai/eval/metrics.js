'use strict';
// Pure metric helpers for the eval harness.
const { normalizeSkill } = require('../../backend/src/ai/skills/normalize');
const { resolveSkill } = require('../../backend/src/ai/skills');

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const std = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
function percentile(a, p) { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; }

function ranks(a) {
  const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
  const r = new Array(a.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; }
  return r;
}
function pearson(x, y) { const mx = mean(x), my = mean(y); let n = 0, dx = 0, dy = 0; for (let i = 0; i < x.length; i++) { n += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; } return dx && dy ? n / Math.sqrt(dx * dy) : NaN; }
const spearman = (x, y) => pearson(ranks(x), ranks(y));
const mae = (x, y) => mean(x.map((v, i) => Math.abs(v - y[i])));
const band = (s) => (s < 40 ? 'low' : s < 70 ? 'fair' : 'good');
const bandAcc = (x, y) => mean(x.map((v, i) => (band(v) === band(y[i]) ? 1 : 0)));

function prf(tp, nPred, nGold) { const p = nPred ? tp / nPred : (nGold ? 0 : 1); const r = nGold ? tp / nGold : 1; return { p, r, f1: p + r ? (2 * p * r) / (p + r) : 0 }; }

/** canonical key for a skill name: taxonomy normalized_name if known, else normalizeSkill. */
const skillKey = (n) => resolveSkill(n)?.normalized_name || normalizeSkill(n);
function skillsPrf(predNames, goldNames) {
  const P = new Set(predNames.map(skillKey).filter(Boolean)); const G = new Set(goldNames.map(skillKey).filter(Boolean));
  let tp = 0; for (const k of P) if (G.has(k)) tp++;
  return { ...prf(tp, P.size, G.size), tp, nPred: P.size, nGold: G.size };
}

function bigrams(s) { const t = normalizeSkill(s).replace(/ /g, ''); const o = new Map(); for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); o.set(g, (o.get(g) || 0) + 1); } return { o, n: Math.max(0, t.length - 1), t }; }
function dice(a, b) { const A = bigrams(a), B = bigrams(b); if (A.t === B.t) return A.t ? 1 : 0; if (!A.n || !B.n) return 0; let inter = 0; for (const [g, c] of A.o) inter += Math.min(c, B.o.get(g) || 0); return (2 * inter) / (A.n + B.n); }

/** greedy one-to-one fuzzy matching; returns pairs [predIdx, goldIdx]. */
function matchEntries(pred, gold, keyFn, thr = 0.8) {
  const used = new Set(); const pairs = [];
  pred.forEach((p, i) => { let best = -1, bs = thr; gold.forEach((g, j) => { if (used.has(j)) return; const s = dice(keyFn(p), keyFn(g)); if (s >= bs) { bs = s; best = j; } }); if (best >= 0) { used.add(best); pairs.push([i, best]); } });
  return pairs;
}
function entriesPrf(pred, gold, keyFn, dateFields) {
  const pairs = matchEntries(pred, gold, keyFn);
  let dOk = 0, dTot = 0;
  for (const [i, j] of pairs) for (const f of dateFields) { dTot++; if ((pred[i][f] ?? null) === (gold[j][f] ?? null)) dOk++; }
  return { ...prf(pairs.length, pred.length, gold.length), tp: pairs.length, nPred: pred.length, nGold: gold.length, dateOk: dOk, dateTotal: dTot };
}

module.exports = { mean, std, percentile, spearman, mae, band, bandAcc, prf, skillsPrf, entriesPrf, dice, skillKey, ranks };
