# Backlog

> Login redirect follow-up: role-compatible return paths and public job paths are preserved; incompatible or unsafe paths fall back to the signed-in role's home. Verification and deployment evidence remain required before this work is considered complete.

> 2026-11-27: The owner approved an additive job schema and a 150-row synthetic
> import for the isolated VPS demo, assigned to Demo Employer and OPEN/APPROVED;
> internships remain distinct. Delivery remains in progress pending safety-fix
> integration, verified private backup/recovery, deployment and live checks.

> Integration update 2026-11-26: combined history, parser, chat, profile and review checks are recorded in [INTEGRATION_2026-11-26.md](INTEGRATION_2026-11-26.md); this does not close PM items #9 or #20.

> Update 2026-11-26: backend item #17 has a localhost-only disposable demo and authenticated smoke evidence in [DEMO_2026-11-26.md](DEMO_2026-11-26.md); this does not complete PM item #9 or resolve the AI consent and visibility gaps.

> Update 2026-11-25: B-10/B-13 now have an owner-provided AI route integration; the older design and acceptance text below are not a statement that integration is absent. Backend item #12 covers Vietnamese explanatory defaults and mocked contract checks; PM item #9 remains in progress pending frontend and end-to-end verification.

_Derived from the 2026-11-23 AI-feature analysis of `main` @ `adc0c86`. Status values: `TODO`, `IN PROGRESS`, `DONE`, `DECIDE` (needs a product decision). Priority P0 = do first._

| ID | Title | Priority | Status |
|---|---|---|---|
| B-01 | Remove real CV PDFs from the repo and git history | P0 | TODO |
| B-02 | Add missing `cvs`, `conversations`, `messages` tables to DB scripts | P0 | IN PROGRESS |
| B-03 | Fix mimetype mismatch between parser route and controller | P1 | TODO |
| B-04 | Stop tracking root `node_modules/` | P1 | TODO |
| B-05 | Add parser tests with fixture CVs | P1 | TODO |
| B-06 | Align "AI" branding with actual behaviour | P1 | DECIDE |
| B-07 | Parser hardening: timeout, page/size caps, rate limit | P1 | TODO |
| B-08 | Stop logging uploaded file names / PII | P2 | TODO |
| B-09 | Improve extraction coverage (education, experience, projects) | P2 | TODO |
| B-10 | Decide on and design a real AI/LLM CV feature (if wanted) | P2 | IN PROGRESS (design in AI_DESIGN.md, owner approval pending) |
| B-11 | Server-side validation of CV JSON payload | P2 | TODO |
| B-12 | Complete `.env.example` (SMTP_*, EMAIL_FROM) | P3 | TODO |
| B-13 | Real job recommendations instead of "first 3 jobs" | P3 | IN PROGRESS (design in AI_DESIGN.md §5) |
| B-14 | Add CI (build + tests) | P3 | TODO |

---

### B-01 Remove real CV PDFs from the repo — P0, TODO
`backend/uploads/cvs/*.pdf` (3 files) are tracked; uploaded CVs contain personal data (name, phone, email, address).
**Acceptance criteria**
- `backend/uploads/` is in `.gitignore`; `git ls-files backend/uploads` returns nothing.
- Team decides whether to purge history (e.g. `git filter-repo`) given the repo is public on GitHub; decision recorded in DECISIONS.md.
- If any file belongs to a real person, owner informed.

### B-02 Add missing tables to DB scripts — P0, IN PROGRESS

Database implementation delivered in ordered migrations 001–006, with demo seed,
Compose, SQL verification and rollback guidance; legacy copies are deprecated.
Database verification evidence: database/VERIFICATION.md. End-to-end authenticated
CV/chat HTTP and Socket.IO smoke remains for backend integration, so the full
original acceptance criteria are not claimed DONE. AI tables are prepared only;
their writers, consent checks, JSON validation, expiry purge and matching endpoint
remain future backend work (B-10/B-13), along with representative-load pagination
and slow-query measurement. Existing populated database upgrade needs a schema
inventory and a separately reviewed additive ALTER migration before deployment.
Code queries `cvs` (`cvModel.js`) and `conversations` / `messages` (`chatModel.js`), but no `.sql` file under `database/` or `backend/database/` creates them. A fresh install following the README breaks CV builder and chat.
**Acceptance criteria**
- A migration (e.g. `database/cv_chat_migration.sql`) creates `cvs` (id, user_id FK, title, template, JSON columns personal_info/education/experience/skills/projects/certifications, created_at/updated_at) and the chat tables matching the model queries.
- README install steps list it; fresh DB + seed → CV CRUD and chat work end-to-end.
- `database/` and `backend/database/` copies de-duplicated or kept in sync.

### B-03 Fix mimetype mismatch in CV parser — P1, TODO
`cvParserRoutes.js` accepts `application/octet-stream` for `.pdf`/`.docx`, but `cvParserController.parseCV` requires the exact PDF/DOCX mimetype and `%PDF-` at byte 0 (route allows it anywhere in the first 1 KB). Files sent as octet-stream pass the route then get a 400 "wrong format".
**Acceptance criteria**
- One source of truth for type validation (magic bytes + extension); controller does not re-validate differently.
- Tests: PDF and DOCX uploaded with `application/octet-stream` parse successfully; renamed non-PDF is rejected.

### B-04 Stop tracking root `node_modules/` — P1, TODO
362 files under `node_modules/` are committed even though `.gitignore` lists it; also root `package.json` only has `mysql2` (looks accidental).
**Acceptance criteria**
- `git rm -r --cached node_modules`; `git ls-files node_modules` is empty.
- Root `package.json` either removed or given a clear purpose (e.g. workspace scripts).

### B-05 Parser tests — P1, TODO
No tests exist anywhere.
**Acceptance criteria**
- Test runner added to backend (e.g. Jest or `node:test`) with `npm test`.
- Unit tests for `extractFields` (VN + EN headings, email, `+84`/`0` phones, no-skills CV, name heuristic edge cases) using synthetic text — no real personal data.
- Integration tests for `POST /api/cvs/parse`: auth required, non-STUDENT → 403, >5 MB → 400, image-only PDF → 422, valid PDF/DOCX → 200 with expected shape.

### B-06 Align "AI" branding with behaviour — P1, DECIDE
Route `/student/ai-cv`, Bot/Sparkles icons and "Phân tích CV tự động" imply AI; implementation is regex. The page text already disclaims "not an AI score".
**Acceptance criteria**
- Product decides: rename to "CV import / extraction" **or** implement B-10.
- UI labels, route name and README consistent with the decision.

### B-07 Parser hardening — P1, TODO
Parsing runs in-process on the request thread with no timeout, page cap or rate limit; a crafted PDF/DOCX (zip bomb, huge page count) could tie up the API.
**Acceptance criteria**
- Parsing has a timeout (e.g. 10 s) returning 422/503.
- Max pages / max extracted text length enforced.
- Rate limit on `/api/cvs/parse` per user (e.g. 10/min).
- Unit test proving the timeout path.

### B-08 Stop logging file names / PII — P2, TODO
`cvParserRoutes.js` logs `originalname` for every upload (often the candidate's full name). Errors log `error.message` only (OK).
**Acceptance criteria**
- No user-provided file names or CV text in logs; log a request id + size + type instead.

### B-09 Better extraction coverage — P2, TODO
Only name/email/phone/address/skills are extracted; education, experience, projects, certifications always `[]`; name = first short line without digits/@ (fragile).
**Acceptance criteria**
- Section segmentation for education/experience/projects with VN + EN headings.
- Fixture-based accuracy check (≥ N synthetic CVs) reported in tests.
- Warnings list only the fields actually not detected.

### B-10 Real AI/LLM CV feature (optional) — P2, IN PROGRESS
Design written: [AI_DESIGN.md](AI_DESIGN.md) (provider, flows, endpoints, prompts, schemas, privacy, eval plan, task split). Pending owner answers (AI_DESIGN §11); implementation tasks T1–T9 / A1–A7 / F1–F6 listed there.
If the team wants genuine AI (structured extraction, CV feedback, job matching), design it before coding.
**Acceptance criteria**
- Decision record covering: provider + model id, where the key lives (backend env var only, never `VITE_*`), consent text shown before CV is sent to a third party, PII minimisation/redaction, data-retention terms of provider.
- Model output validated against a JSON schema before reaching UI/DB; user confirms before save.
- Prompt-injection mitigation: CV text treated as data, no tool/action execution from model output.
- Timeout, retry with backoff, per-user quota and cost budget; fallback to heuristic parser on failure.
- Tests with mocked provider.

### B-11 Server-side validation of CV payload — P2, TODO
`cvController.validateCV` only checks `title` and `template`; JSON fields (from parser or user) are stored as-is with no shape/size limits.
**Acceptance criteria**
- Schema validation (types, max lengths, max array sizes) for all CV fields on create/update.
- `template` restricted to `modern|classic|minimal`.
- Invalid payloads → 400 with field-level messages.

### B-12 `.env.example` completeness and encoding — P3, TODO
`SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM` are used but not in `backend/.env.example`.
**Acceptance criteria**
- `.env.example` lists every variable read via `process.env` with placeholder values.

### B-13 Job recommendations — P3, IN PROGRESS
Designed in AI_DESIGN.md §5 (rule filter + LLM re-rank, task T7/F4).
"Recommended" = first 3 open approved jobs from the local store.
**Acceptance criteria**
- Decide approach (skill-overlap scoring vs. embeddings); implement server-side endpoint; explainable "why recommended".

### B-14 CI — P3, TODO
**Acceptance criteria**
- GitHub Actions runs `npm ci`, backend tests and `frontend npm run build` on PRs to `main`.
