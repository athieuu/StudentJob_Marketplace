# Decisions

### D-10 Database baseline and AI schema review — CONFIRMED direction, implemented 2026-11-23

Owner authorized MySQL 8, ordered SQL migrations, AI storage now and embeddings
later; only a new disposable demo volume may be destroyed for verification.
Canonical files are database/migrations/001..006 with a separate optional demo
seed and isolated localhost Compose. Legacy SQL remains marked DEPRECATED,
including backend/database copies; application source/dependencies stay unchanged.

All AI Engineer review proposals are accepted: versioned match identity, hashes
and model metadata, structured skill-id explanations, parse status/cost/latency/
hash/prompt/schema metadata and required expiry, nullable consent and parse skill
provenance, confidence/experience, and extensible VARCHAR(20) method/parser/source.
Parse results precede student skills to satisfy FK creation order. Retain
computed_at from the original proposal alongside created_at; it records cache
recomputation. The future app must supply expiry at creation plus 90 days and
perform the purge; the DB creates no scheduler/event or external provider call.

Design deviations: change jobs public index from (moderation_status,status,
created_at) to (moderation_status,created_at) because actual SQL does not filter
status; add job/date application and student/date conversation indexes for actual
ORDER BY patterns. Preserve legacy nullable status/timestamp and signed INT types
instead of tightening them. Fresh-install baselines intentionally fail on rerun;
existing deployments need separately reviewed additive ALTERs and validated backup
rollback because MySQL DDL implicitly commits. See DB_DESIGN.md implementation
review and database/README.md for effects, ownership checks and open policy items.

_All entries below are **INFERRED** from the code on `main` @ `adc0c86` (2026-11-23); none were found written down. Confirm or correct them with the team, then change the status to `CONFIRMED`._

| ID | Decision | Status |
|---|---|---|
| D-01 | CV parsing is deterministic (pdf-parse/mammoth + regex), not AI | INFERRED |
| D-02 | Parsed CV is a draft: never auto-saved, user reviews first | INFERRED |
| D-03 | Parser keeps uploads in memory only | INFERRED |
| D-04 | CV content stored as JSON columns in one `cvs` row | INFERRED |
| D-05 | Only PDF and DOCX, max 5 MB, magic-byte checked | INFERRED |
| D-06 | Parser and CV builder are STUDENT-only, JWT-protected | INFERRED |
| D-07 | Vietnamese-first heuristics and UI | INFERRED |
| D-08 | Split stack: Express REST + React SPA + MySQL, Socket.IO on the same server | INFERRED |
| D-09 | Application CVs (PDF files) are separate from builder CVs (JSON) | INFERRED |

### D-01 Deterministic CV parsing instead of AI — INFERRED
**What:** `cvParserController.js` uses `pdf-parse` / `mammoth` and regex; no LLM SDK or key anywhere.
**Likely reasons:** no API cost or key management, no CV PII sent to third parties, predictable output, student-project scope. The UI and `frontend/README_UIUX_VI.md` explicitly avoid claiming an "AI score".
**Consequence:** limited coverage (education/experience not extracted); "AI" labels in UI are misleading (BACKLOG B-06, B-10).

### D-02 Parsed result is a draft — INFERRED
**What:** `/api/cvs/parse` returns data + warnings and persists nothing; `CVBuilderPage` pre-fills the form and the user must save.
**Likely reasons:** heuristic output is unreliable; human-in-the-loop correction; avoids storing unconfirmed PII.

### D-03 In-memory upload for parsing — INFERRED
**What:** parser route uses `multer.memoryStorage()`; application uploads use disk storage (`uploads/cvs`, random UUID names).
**Likely reasons:** parsed files are transient and need no retention; avoids cleanup of temp files.

### D-04 JSON columns for CV sections — INFERRED
**What:** `cvModel.js` serialises personal_info, education, experience, skills, projects, certifications with `JSON.stringify` into one `cvs` row; ownership enforced by `WHERE user_id = ?`.
**Likely reasons:** flexible, template-driven CV structure without many join tables; simple CRUD.
**Note:** the `cvs` table is not yet in the SQL scripts (BACKLOG B-02).

### D-05 PDF/DOCX only, 5 MB, magic bytes — INFERRED
**What:** client and server limit to `.pdf`/`.docx`, 5 MB, one file; server checks `%PDF-` / ZIP signature.
**Likely reasons:** the two formats students actually use; defend against renamed files. Image-only PDFs rejected with "needs OCR" — OCR deliberately out of scope.

### D-06 STUDENT-only, JWT-protected — INFERRED
**What:** `authenticateToken` + `authorizeRole("STUDENT")` on `/api/cvs` and `/api/cvs/parse`.
**Likely reasons:** CVs belong to students; employers see CVs only through applications.

### D-07 Vietnamese-first — INFERRED
**What:** regex headings and labels include Vietnamese (`Kỹ năng`, `Địa chỉ`, `Hồ sơ xin việc`), phone regex targets `+84`/`0` numbers, UI copy in Vietnamese.
**Likely reasons:** target users are Vietnamese students and employers.

### D-08 Stack and topology — INFERRED
**What:** Express 5 REST API + mysql2 pool; React/Vite SPA; Socket.IO attached to the same HTTP server with JWT auth; nodemailer for email verification and moderation notices.
**Likely reasons:** team skill set (README team roles), single deployable backend, simple local dev (`:5000` API, `:5173` UI).

### D-09 Two kinds of CV — INFERRED
**What:** applications accept an uploaded PDF stored on disk (`uploadCv.js`); the CV builder stores structured JSON. The parser bridges uploaded files into the builder.
**Likely reasons:** quick apply with an existing file, plus an in-app builder for students without a CV.

### D-10 AI design proposed (LLM provider, hybrid scoring) — PROPOSED, awaiting owner
**What:** `pm/AI_DESIGN.md` (2026-11-23): one cloud LLM behind a thin adapter; recommended Anthropic `claude-haiku-5-5` (escalate per task to `claude-sonnet-5-5`); key only in backend env `LLM_API_KEY`; `AI_ENABLED` flag with regex/rule fallback; consent via `ai_processing_consent_at`; contact data redacted, protected attributes never extracted; fit score = 0.6 rule skill-overlap + 0.4 LLM (LLM clamped to rule±20), advisory only; recommendations = rule filter then LLM re-rank.
**Why:** cost (~$0.0006–0.0013/call est. on Haiku), reproducible base score, privacy by design. Prices/latency are estimates until the eval in §8 runs; non-Anthropic providers were not verified.
**Status:** nothing implemented or measured yet; open questions in AI_DESIGN.md §11.

## D-AI-CONFIG — LLM provider is configured by the owner via env (2026-11-24)
Decision (owner): no vendor is hard-coded. The owner supplies `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (and optional `LLM_MODEL_HEAVY`) in the backend env. Supersedes AI_DESIGN §1.2 "Anthropic Haiku default".
Consequences: adapter speaks one generic protocol (OpenAI-compatible chat completions, `LLM_API_STYLE=openai|anthropic` switch if needed); no vendor-specific params (no thinking/effort/sampling assumptions); JSON validity is enforced by our own Ajv validation + one repair retry, not by vendor constrained output; cost uses `AI_PRICE_TABLE` from config (unknown price => cost logged as null, budget cap falls back to call-count cap); key never in VITE_*, never logged, never committed.
Rejected: hard-coding Anthropic (owner wants to choose provider/model himself).

## D-AI-M1 — AI foundations A1–A4 delivered, not yet evaluated (2026-11-24)
Added backend/src/ai/{prompts,schemas,scoring,skills,checks.js,__tests__} and ai/eval (synthetic dataset). 47 unit tests pass (`cd backend && npm test`), no LLM/network. Prompts use plain JSON + Ajv per D-AI-CONFIG (no `effort`). Added dependency `ajv@^8` and `npm test` to backend/package.json. Fit/rec labels are AI drafts; human labels (Q6) and skills-taxonomy PM review still pending. Uncommitted, not pushed.

## D-AI-LABELS — Eval labels come from the model API, no human labelling (2026-11-24)
Decision (owner): no human reviewer; fit/rec labels and rewrite checks are produced by an LLM judge through the same env-configured API.
Consequences: metrics measure agreement with the judge, not with humans, so they are relative (regex vs LLM, prompt v1 vs v2), not absolute quality proof. Mitigations: judge uses LLM_MODEL_HEAVY (stronger/different model than the scorer) when set; judge run 3x and averaged, high-variance pairs flagged; deterministic checks (schema, grounding, no fabricated facts, protected attributes, injection shift) stay hard gates and need no labels. Owner may spot-check flagged pairs.
Rejected: human Vietnamese reviewer (owner: not needed for now).
