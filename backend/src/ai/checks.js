'use strict';
// Business checks that Ajv cannot express (AI_DESIGN §2.3, §3.4, §5.3, §6.4). Pure functions.
const { normalizeSkill, stripDiacritics } = require('./skills/normalize');

const INJECTION_PATTERNS = [
  /ignore (all |any )?(the )?(previous|prior|above) (instructions|prompts?)/i,
  /disregard (all |any )?(the )?(previous|prior|above)/i,
  /system prompt/i,
  /you are now\b/i,
  /bo qua (moi |tat ca )?(huong dan|chi dan|lenh)/i,
  /(give|set|output|cho).{0,20}(score|diem).{0,15}100/i,
  /[A-Za-z0-9+/]{200,}={0,2}/, // base64-like blob
  /(\b\w+\b)(\s+\1){14,}/i,    // same token repeated 15+ times
];
/** true if the text looks like a prompt-injection attempt (diacritic-insensitive). Advisory: still processed. */
function detectInjection(text) {
  const t = stripDiacritics(String(text || ''));
  return INJECTION_PATTERNS.some((re) => re.test(t));
}

const squash = (s) => ` ${normalizeSkill(s)} `;
/** Skill/organisation name appears (normalised) in source text. */
function isGrounded(name, sourceText) {
  const n = normalizeSkill(name);
  return n.length > 0 && squash(sourceText).includes(` ${n} `);
}
/** Drop items whose key is not grounded in source. @returns {{items, dropped:number}} */
function dropUngrounded(items, sourceText, keyFn = (x) => x.name) {
  const kept = items.filter((it) => isGrounded(keyFn(it), sourceText));
  return { items: kept, dropped: items.length - kept.length };
}

/** cv_extract: ground skill names, company and school names. Returns cleaned data + warnings. */
function groundCvExtract(data, sourceText) {
  const warnings = [];
  let dropped = 0;
  const out = { ...data };
  const s = dropUngrounded(data.skills, sourceText);
  out.skills = s.items; dropped += s.dropped;
  const e = dropUngrounded(data.experience, sourceText, (x) => x.company);
  out.experience = e.items; dropped += e.dropped;
  const ed = dropUngrounded(data.education, sourceText, (x) => x.school);
  out.education = ed.items; dropped += ed.dropped;
  if (dropped) warnings.push(`dropped_ungrounded:${dropped}`);
  return { data: out, warnings };
}

/** job_rerank: all ids in candidates, no duplicates. */
function checkRerankIds(ranking, candidateIds) {
  const allowed = new Set(candidateIds.map(String));
  const seen = new Set();
  for (const r of ranking) {
    const k = String(r.jobId);
    if (!allowed.has(k) || seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}

/** cv_bullets: same count, same order, `original` unchanged. */
function checkBulletsCount(output, inputBullets) {
  const b = output.bullets;
  return b.length === inputBullets.length && b.every((x, i) => x.original === inputBullets[i]);
}

/** cv_bullets/summary: numbers (\d+[%+]?) and years in rewrite must exist in the input. */
function hasNewNumbers(improved, inputText) {
  const nums = String(improved).match(/\d+(?:[.,]\d+)?[%+]?/g) || [];
  const src = String(inputText);
  return nums.some((n) => !src.includes(n));
}

module.exports = { detectInjection, isGrounded, dropUngrounded, groundCvExtract, checkRerankIds, checkBulletsCount, hasNewNumbers };
