# Prompt changelog

Prompts are code: files in `prompts/v1/`, schemas in `schemas/v1/`. Any change bumps the version in the
front matter (cache keys include `prompt_version`), is listed here with an eval before/after, and changing a
production prompt needs owner approval. Nothing below has been run against a real LLM yet.

## v1 — 1.0 (2026-11-24) — initial drafts, NOT yet evaluated
Prompts: cv_extract, job_skills_extract, fit_assess, job_rerank, cv_summary, cv_bullets, cv_skills_suggest, cv_feedback.
- Plain-JSON contract per D-AI-CONFIG: each prompt ends with an "Output format" example and
  "Respond only with the JSON object". Validity is enforced by Ajv (`schemas/index.js`) + one repair retry in
  the caller, not by vendor structured output. The example in each prompt is unit-tested against its schema.
- Dropped from AI_DESIGN §2.5 front matter: `effort` (vendor-specific). Kept: id, version, schema, max_output_tokens.
- Untrusted input is delimited (`<cv_text>`, `<cv_json>`, `<job_text>`, ...; use `wrapData()` to strip delimiter
  break-outs) and every prompt states it is data, not instructions.
- Protected attributes (gender, age, DOB, nationality, marital status, ethnicity, religion, health, photo) are banned in every prompt;
  schemas have no field for them (`additionalProperties:false`).
- Prompt examples are ASCII Vietnamese on purpose (diacritic-free) to keep file encoding safe; the rules say
  "keep the input language".
- Eval status: pending (A5). Thresholds in AI_DESIGN §8.2.

## 2026-11-24 — A5 real-model eval (model: sypham98/deepseek-flash; report ai/eval/reports/2026-11-24-a5.md)
- cv_extract 1.0 -> 1.1: filled `projects`/`certifications` examples + "exactly these keys" rule. First-try schema-valid 6/10 -> 10/10 on the same model; skills/education/experience F1 1.00 on the synthetic set; 0 protected-attribute leaks.
- job_rerank 1.0 -> 1.1: return every candidate when <=10 (rank poor fits last). 5/5 before and after on 3 test profiles; kept as a robustness guard (backend must still append omitted candidates).
- cv_feedback 1.0 -> 1.1: explicit rubric->area enum mapping (1 invalid enum at 1.0; 4/4 valid at 1.1, n=4).
- Unchanged and evaluated: fit_assess 1.0 (hybrid rho 0.93, MAE 5.9 vs LLM-judge), job_skills_extract 1.0 (P 0.74 R 0.95), assist prompts 1.0 (valid, no invented numbers on 8 outputs).
