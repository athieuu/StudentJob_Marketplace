# Frontend / backend_email integration audit

## Changes made

- Added `src/services/api.ts`: one Fetch-based API client, configurable `VITE_API_BASE_URL`, JSON parsing, consistent `ApiError`, Bearer JWT attachment, and 401 session-expiry event.
- Replaced demo authentication in `src/services/store.ts` with backend login, OTP request, OTP verification, JWT persistence, and session persistence. Removed demo-account autofill and local demo registration.
- Updated registration UI in `src/App.tsx` to request the backend OTP and verify the six-digit code before confirming account creation. It does not send email from the browser.
- Added startup `/auth/me` validation and public job loading.
- Connected job creation/update to the backend job API, student application submission to `POST /applications`, employer decision updates to `PATCH /applications/:id/status`, and admin moderation to `PATCH /admin/jobs/:id/moderation`.
- Added `.env.example` for the frontend API base URL.

## Verified backend_email contract

| Method | Endpoint | Auth / role | Frontend integration |
|---|---|---|---|
| POST | `/api/auth/register/request-otp` | Public | Implemented |
| POST | `/api/auth/register/verify-otp` | Public | Implemented |
| POST | `/api/auth/register` | Public, deliberately returns 400 | Not used |
| POST | `/api/auth/login` | Public | Implemented |
| GET | `/api/auth/me` | Bearer JWT | Implemented for session restoration |
| GET | `/api/jobs` | Public; returns approved jobs in `{data}` | Implemented |
| GET | `/api/jobs/:id` | Public; returns `{data}` | Available in API client |
| POST | `/api/jobs` | EMPLOYER | Implemented |
| PUT | `/api/jobs/:id` | EMPLOYER; own job only | Implemented |
| POST | `/api/applications` | STUDENT | Implemented |
| GET | `/api/applications/my` | STUDENT | Available in API client |
| GET | `/api/applications/job/:jobId` | EMPLOYER; own job only | Available in API client |
| PATCH | `/api/applications/:id/status` | EMPLOYER | Implemented |
| GET | `/api/admin/jobs/pending` | ADMIN | Available in API client |
| PATCH | `/api/admin/jobs/:id/moderation` | ADMIN | Implemented |

## Backend limitations that prevent a complete UI integration

These are missing from the supplied `backend_email` implementation; the frontend must not invent them:

1. No resend-OTP endpoint. The UI therefore does not display a resend button.
2. No employer endpoint to list the employer's own jobs, including pending/rejected listings. `GET /api/jobs` returns only `moderation_status = APPROVED`; the employer dashboard/list cannot be populated correctly for its owner.
3. No endpoint to list all users or platform-wide applications for the admin dashboard.
4. No review endpoints, profile read/update endpoints, or user activation/deactivation endpoints.
5. Registration requires `full_name` for STUDENT or `company_name` for EMPLOYER. The backend stores the profile but login and `/auth/me` return only `{id,email,role}`, so the frontend cannot reliably show the real full name/company without a profile endpoint.
6. Job API accepts `title`, `description`, `job_type`, `salary_min`, `salary_max`, `location`, `deadline`, and `status`. The existing UI has category, skills, responsibilities, requirements, and work arrangement fields, but these are not persisted by the current backend schema/controller. The API adapter deliberately does not pretend those fields were saved.
7. `GET /api/jobs` is not search/filter/pagination-aware; filtering currently remains client-side after loading the approved jobs.\n8. The existing UI's admin user-management, admin application-overview, profile editing, and review screens cannot be backed by this backend. Those actions are not presented as successful API operations; profile mutation and user activation now return explicit unsupported-operation errors.\n9. Employer-owned job and applicant management screens remain constrained by the missing employer job-list endpoint. Job creation, update (when an owned numeric job ID is available), and application decision endpoints exist, but the current backend does not provide a way for the frontend to discover an employer's own pending jobs.

## Important backend behavior

- OTP is six digits and expires after five minutes. The backend allows at most five incorrect attempts.
- `POST /api/auth/register/verify-otp` creates the account and returns a user object, but does not issue a JWT. The user must log in after successful verification.
- JWT expires after one day. A 401 clears the frontend token/session.
- Email notifications are backend side effects: admin on employer job creation, employer on student application, student on employer decision, and employer on admin moderation. SMTP errors are logged by the backend and do not roll back the primary action.
- Rejection moderation requires a non-empty `rejection_reason`.

## Validation

- TypeScript project check: `node node_modules/typescript/bin/tsc -b` — passed.
- Vite production build: not completed in this Linux validation environment because the uploaded `node_modules` lacks the optional platform package `@rollup/rollup-linux-x64-gnu`. Reinstall dependencies on the target Windows machine with `npm ci`, then run `npm run build`.
- No live API / SMTP / MySQL integration test was run; no backend server credentials or running database were provided.

## Configuration

Copy `.env.example` to `.env` in `frontend/` and set `VITE_API_BASE_URL` to the actual backend API origin, e.g. `http://localhost:5000/api`.
