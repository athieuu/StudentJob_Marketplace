'use strict';
// Deterministic rule score + blend (AI_DESIGN §4.1, §4.3). Pure functions, no I/O.
// Skill ids are compared as given (numbers or strings), so the caller passes skills.id.

const SCORE_VERSION_RULE = 'rule1';
const DEFAULT_WEIGHTS = Object.freeze({ rule: 0.6, llm: 0.4 });
const CLAMP_DELTA = 20;
const LOW_CONFIDENCE_GAP = 30;
const NO_JOB_SKILLS_CAP = 70;
const REQUIRED_MISSING_CAP = 59;

/**
 * @param {{skillId:any,isRequired?:boolean,weight?:number}[]} jobSkills
 * @param {{skillId:any,confidence?:number|null,source?:string}[]} studentSkills
 *   student skills count when confidence >= 0.5, or source === 'manual', or confidence is null/undefined.
 * @returns {{rule:number|null,matched:any[],missing:any[],requiredMissing:any[],reason?:string}}
 */
function ruleScore(jobSkills, studentSkills) {
  const js = (jobSkills || []).filter((j) => j && j.skillId !== null && j.skillId !== undefined);
  // de-duplicate job skills by id (keep first)
  const seen = new Set();
  const jobs = js.filter((j) => (seen.has(j.skillId) ? false : (seen.add(j.skillId), true)));
  if (jobs.length === 0) return { rule: null, matched: [], missing: [], requiredMissing: [], reason: 'no_job_skills' };

  const have = new Set(
    (studentSkills || [])
      .filter((s) => s && (s.source === 'manual' || s.confidence === null || s.confidence === undefined || Number(s.confidence) >= 0.5))
      .map((s) => s.skillId),
  );

  let total = 0;
  let got = 0;
  const matched = [];
  const missing = [];
  const requiredMissing = [];
  let reqTotal = 0;
  for (const j of jobs) {
    const required = j.isRequired !== false; // DB default TRUE
    const base = Number.isFinite(Number(j.weight)) && Number(j.weight) > 0 ? Number(j.weight) : 1;
    const w = base * (required ? 2 : 1);
    if (required) reqTotal += 1;
    total += w;
    if (have.has(j.skillId)) {
      got += w;
      matched.push(j.skillId);
    } else {
      missing.push(j.skillId);
      if (required) requiredMissing.push(j.skillId);
    }
  }
  let rule = Math.round((100 * got) / total);
  if (reqTotal > 0 && requiredMissing.length / reqTotal > 0.5) rule = Math.min(rule, REQUIRED_MISSING_CAP);
  return { rule, matched, missing, requiredMissing };
}

function band(score) {
  if (score === null || score === undefined) return null;
  return score < 40 ? 'low' : score < 70 ? 'fair' : 'good';
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Blend rule + optional LLM score.
 * @param {number|null} rule  rule score (null when the job has no skills)
 * @param {number|null|undefined} llm  LLM score 0..100 or null/undefined when unavailable
 * @param {{rule:number,llm:number}} [weights]
 */
function combineScores(rule, llm, weights = DEFAULT_WEIGHTS) {
  const hasLlm = llm !== null && llm !== undefined && Number.isFinite(llm);
  const flags = [];
  if (!hasLlm) {
    if (rule === null || rule === undefined) {
      return { score: null, band: null, method: 'none', components: { rule: null, llm: null, llmClamped: null, weights }, flags: ['not_enough_job_data'] };
    }
    return { score: rule, band: band(rule), method: 'rule', components: { rule, llm: null, llmClamped: null, weights }, flags };
  }
  const l = clamp(Math.round(llm), 0, 100);
  if (rule === null || rule === undefined) {
    const score = Math.min(l, NO_JOB_SKILLS_CAP);
    return { score, band: band(score), method: 'hybrid', components: { rule: null, llm: l, llmClamped: score, weights }, flags: ['low_confidence', 'no_job_skills'] };
  }
  const llmClamped = clamp(l, rule - CLAMP_DELTA, rule + CLAMP_DELTA);
  const score = clamp(Math.round(weights.rule * rule + weights.llm * llmClamped), 0, 100);
  if (Math.abs(l - rule) > LOW_CONFIDENCE_GAP) flags.push('low_confidence');
  return { score, band: band(score), method: 'hybrid', components: { rule, llm: l, llmClamped, weights }, flags };
}

module.exports = { ruleScore, combineScores, band, SCORE_VERSION_RULE, DEFAULT_WEIGHTS };
