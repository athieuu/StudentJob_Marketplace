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
