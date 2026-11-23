# Project State — StudentJob Marketplace

_Snapshot: 2026-11-23, based on `main` @ `adc0c86` (identical to `origin/feature/cv-builder-parser`). Written from reading files only; nothing was installed or run._

## 1. What the product is
A marketplace connecting **students** with **employers** for part-time, full-time and freelance jobs. Roles: `STUDENT`, `EMPLOYER`, `ADMIN`. UI copy is mostly Vietnamese.

## 2. Architecture

| Layer | Stack | Location |
|---|---|---|
| Frontend | React 18 + TypeScript 5.7, Vite 6, React Router 6, Tailwind 3, lucide-react, socket.io-client | `frontend/` |
| Backend | Node.js (CommonJS), Express 5, mysql2, JWT (jsonwebtoken), bcryptjs, multer, nodemailer, socket.io, pdf-parse 2.x, mammoth | `backend/` |
| Database | MySQL (utf8mb4) | `database/*.sql` (copies also in `backend/database/`) |
| Realtime | Socket.IO on the same HTTP server, JWT-authenticated | `backend/src/sockets/chatSocket.js` |
| Email | SMTP via nodemailer (verification / moderation mails) | `backend/src/services/emailService.js`, `backend/EMAIL_SETUP.md` |

```
frontend (Vite :5173) ──REST /api/* + JWT──► backend Express (:5000) ──mysql2──► MySQL
          └──────────── Socket.IO (chat) ───────────┘            └── nodemailer ──► SMTP
```

### Backend modules (`backend/src`)
- `app.js` — mounts routes: `/api/auth`, `/api/profile`, `/api/test`, `/api/jobs`, `/api/applications`, `/api/admin`, `/api/chat`, `/api/cvs` (CV CRUD **and** CV parser), `/api/health/db`.
- `controllers/` + `models/` + `routes/` per domain: auth, profile, jobs, applications, admin (users, applications/moderation), chat, cv, cvParser.
- `middleware/authMiddleware.js` (JWT + role guard), `middleware/uploadCv.js` (PDF upload to disk for applications).
- `config/db.js` — mysql2 pool.

### Frontend (`frontend/src`)
- `App.tsx` (~3.4k lines) — almost all pages/routes in one file (public, student, employer, admin shells).
- `pages/CVBuilderPage.tsx` + `cv-builder.css` — CV builder (CRUD, templates modern/classic/minimal, import from file).
- `pages/ChatPage.tsx` — realtime chat.
- `services/` — `api.ts` (REST + token store), `cv.ts`, `cvParser.ts`, `chat.ts`, `socket.ts`, `store.ts` (local/mock store), `data/seed.ts`.

## 3. AI / ML features — summary
**There is no AI/ML/LLM integration in the codebase** (no OpenAI/Gemini/Anthropic/other SDK, no model ids, no embeddings, no API keys) on `main` or on any remote branch (`origin/Khoa`, `origin/Thieu`, `origin/Vy`, `origin/feature/cv-builder-parser`).

Features *branded* as smart/AI:

| Feature | Real implementation | Entry points |
|---|---|---|
| **CV parser / "Phân tích CV tự động"** (labelled with a Bot icon, route `/student/ai-cv`) | Deterministic text extraction (`pdf-parse` for PDF, `mammoth` for DOCX) + regex/heuristics for name, email, VN phone, address, skills section | `POST /api/cvs/parse` → `backend/src/routes/cvParserRoutes.js` → `controllers/cvParserController.js`; UI `App.tsx` `CVAnalysis` + `CVBuilderPage.tsx` import; client `services/cvParser.ts` |
| **CV builder** | Plain form-based CRUD; no generation | `/api/cvs` (`cvRoutes.js`, `cvController.js`, `cvModel.js`, JSON columns in `cvs` table); `CVBuilderPage.tsx`, `services/cv.ts` |
| "Recommended jobs" (student dashboard) | First 3 OPEN+APPROVED jobs from the local store — no ranking | `App.tsx` `StudentDashboard` |
| "Profile strength" score | Count of 6 filled profile fields / 6 | `App.tsx` `StudentProfile` |

The UI and `frontend/README_UIUX_VI.md` explicitly say the CV analysis is "not a self-generated AI score".

Full analysis with data flow and risks: see [BACKLOG.md](BACKLOG.md) (gaps) and the section below.

### CV parser data flow
1. User picks a `.pdf`/`.docx` (client checks extension, size ≤ 5 MB, non-empty, JWT present).
2. `multipart/form-data` field `file` → `POST /api/cvs/parse` with `Authorization: Bearer`.
3. `authenticateToken` → `authorizeRole("STUDENT")` → multer **memory** storage (5 MB, 1 file, ext+mimetype allow-list incl. `application/octet-stream`) → `validateFileContent` (magic bytes `%PDF-` in first 1 KB / ZIP `PK\x03\x04`).
4. Controller re-checks strict mimetype + magic bytes, extracts text (`PDFParse.getText()` / `mammoth.extractRawText`).
5. `extractFields(text)` — regex for email, VN phone (`+84|0` + 9–10 digits), first plausible line as full name, `Address:`/`Địa chỉ:` line, up to 6 lines after a "Skills/Kỹ năng" heading split on `,;|` (max 30). Education/experience/projects/certifications are always empty.
6. Response `{message, data: CVPayload, warnings[]}`; nothing persisted server-side. Image-only PDFs → 422 "needs OCR".
7. UI shows fields (`CVAnalysis`) or pre-fills the CV builder form; user must click save → `POST /api/cvs` stores JSON in MySQL `cvs`.

Config / secrets: none specific to the parser. App-wide env var names: `PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM` (backend), `VITE_API_BASE_URL` (frontend). `backend/.env.example` lists only PORT/DB_*/JWT_SECRET — SMTP_* and EMAIL_FROM are missing from it.

## 4. Status
- Implemented on `main`: auth (+email verification), profiles, jobs, applications (PDF CV upload to disk), admin moderation, realtime chat, CV builder, heuristic CV parser.
- Branches: `origin/feature/cv-builder-parser` == `main`. `origin/Khoa` (2026-10-30) is an older frontend/backend snapshot; `origin/Thieu` and `origin/Vy` (2026-10-25, same commit) are early backend API work. No AI-only features on any branch.
- Tests: **none** (no test runner, no test script in either package.json). No lint script. No CI config.
- Known repo hygiene issues: 362 `node_modules/` files tracked at repo root; 3 real-looking CV PDFs tracked in `backend/uploads/cvs/`; DB schema files do not create the `cvs`, chat (conversation/message) tables used by the code.

## 5. How to install / run / test (from README + package.json)
Prerequisites: Node.js + npm, MySQL Server.

```powershell
# Database
#   CREATE DATABASE studentjob_marketplace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
#   run database/schema_with_email.sql (or schema.sql + email_moderation_migration.sql), then database/seed.sql
# NOTE: cvs / chat tables are not in these scripts yet (see BACKLOG).

# Backend
cd backend
Copy-Item .env.example .env   # fill DB_*, JWT_SECRET, and SMTP_*/EMAIL_FROM for email
npm install
npm run dev                   # nodemon src/server.js  -> http://localhost:5000  (npm start for plain node)

# Frontend
cd ..\frontend
Copy-Item .env.example .env   # VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev                   # vite on :5173
npm run build                 # tsc -b && vite build
```
Health check: `GET http://localhost:5000/api/health/db`. Tests: none exist (`npm test` is not defined).
