'use strict';
const { normalizeSkill } = require('./normalize');
const { SKILL_SEED } = require('./taxonomy.data');

// Build once: canonical normalized_name -> skill, alias key -> canonical normalized_name.
const skills = SKILL_SEED.map((s) => ({ ...s, normalized_name: normalizeSkill(s.name) }));
const byNormalized = new Map(skills.map((s) => [s.normalized_name, s]));
const aliasToNormalized = new Map();
for (const s of skills) {
  aliasToNormalized.set(s.normalized_name, s.normalized_name);
  for (const a of s.aliases) {
    const k = normalizeSkill(a);
    if (k && !aliasToNormalized.has(k)) aliasToNormalized.set(k, s.normalized_name);
  }
}

/** Map free text to a taxonomy skill, or null (caller keeps it in skillsUnmapped). */
function resolveSkill(text) {
  const k = normalizeSkill(text);
  if (!k) return null;
  const canon = aliasToNormalized.get(k);
  return canon ? byNormalized.get(canon) : null;
}

/** INSERT IGNORE statements for the `skills` table (name, normalized_name, category). */
function toSql() {
  const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
  const rows = skills.map((s) => `(${q(s.name)}, ${q(s.normalized_name)}, ${q(s.category)})`);
  return `INSERT IGNORE INTO skills (name, normalized_name, category) VALUES\n${rows.join(',\n')};\n`;
}

module.exports = { skills, resolveSkill, toSql, normalizeSkill };
if (require.main === module) process.stdout.write(toSql());
