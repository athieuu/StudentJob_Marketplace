# Email OTP & moderation setup

## 1. Database migration
In MySQL Workbench, open and execute `database/email_moderation_migration.sql` against `studentjob_marketplace`.
Do not re-run the migration after the new columns have been added (the ALTER TABLE portion is one-time).

## 2. Install mail dependency
From the backend directory:
```powershell
npm install nodemailer
```

## 3. Configure SMTP
Copy `.env.example` to `.env` (do not commit `.env`). For Gmail:
- enable 2-Step Verification on the Google account
- create a Google App Password
- set `SMTP_USER` to that Gmail and `SMTP_PASS` to the App Password (not your regular Gmail password)
- set `EMAIL_FROM` to a sender address matching the SMTP account

## 4. Register using OTP
1. `POST /api/auth/register/request-otp` with the usual registration body: `email`, `password`, `role`, and role profile fields.
2. User receives a 6-digit OTP by email.
3. `POST /api/auth/register/verify-otp` with `{ "email": "...", "otp": "123456" }`.
4. Login with the normal `POST /api/auth/login`.

OTP expires in 5 minutes and allows at most 5 wrong attempts. Password is hashed before storing in the temporary verification record.

## 5. Admin job moderation
- Admin accounts must already exist in `users` with role `ADMIN`; job creation notification is sent to all such emails.
- `GET /api/admin/jobs/pending` (ADMIN token) lists pending job posts.
- `PATCH /api/admin/jobs/:id/moderation` (ADMIN token):
  - approve: `{ "moderation_status": "APPROVED" }`
  - reject: `{ "moderation_status": "REJECTED", "rejection_reason": "..." }`
- Public `GET /api/jobs` now returns only approved posts.
- Employer notification for newly posted jobs and moderation results, and student notification on application outcomes are best-effort: SMTP failure is logged but does not undo database changes.

## Important frontend changes
Registration UI must be a two-step flow (request OTP, then verify OTP). Do not call the old direct `/api/auth/register` endpoint for normal registration; it intentionally responds with a message to use OTP.
