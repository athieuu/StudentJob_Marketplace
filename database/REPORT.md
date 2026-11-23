# Database delivery report

Branch: `KhangTran/db-redefine`, based on `7dcface` from
`KhangTran/pm-ai-analysis`. Baseline implementation commit: `aacb0ab`.
No push, PR, main changes, real credentials, or application/dependency edits.
The only backend directory edits are deprecation comments in historical SQL.

Tables (14): users, student_profiles, employer_profiles, jobs, applications,
email_verifications, cvs, conversations, messages, skills, student_skills,
job_skills, cv_parse_results, job_match_scores. All use InnoDB/utf8mb4_unicode_ci;
20 foreign keys are enabled. Every legacy core column is checked for preservation.

Six dependency-ordered baseline migrations fix missing CV/chat tables and
users.status, preserve existing contracts, add nullable applications.cv_id and
provide structured AI storage without a raw CV text/file column. All AI Engineer
review proposals were incorporated; the only proposal-level index changes align
actual query predicates and ordering, documented in pm/DB_DESIGN.md and DECISIONS.md.

Final verification command:
`python database/verify.py --project sjdb-verify-f89dc797-final` (exit 0).
Both fresh-volume `up -d --wait` runs, intermediate `down -v`, and final cleanup
passed; no disposable containers/volumes remain. Exact DDL and demo values match,
excluding runtime timestamps: SHA256
`4cd65d95488e2fbf3354b5647c52ffe223b1e6f7944dace1935e875ca46ece3c`.
Five intentionally rejected statements exercise duplicate applications (1062),
orphan messages (1452), score bounds (3819), omitted parse expiry (1364), and
duplicate match version (1062); all other recorded commands exit 0. Assertions
also cover chat upsert/cascade, application CV SET NULL, provenance SET NULL,
90-day expiry, and multiple score versions. Two OPEN/APPROVED demo jobs are visible.
Full commands/results/query plans are in VERIFICATION.md; no production data was
accessed and only uniquely named new demo volumes were deleted.

Simple indexed demo reads took ~0.007–0.070 ms; the public join used a hash join
and final sort (~0.129 ms), and the admin list scanned/sorted (~0.045 ms). No
production slow-query log or representative load was available. Unbounded lists
need future pagination and measured indexing before any production performance claim.

Migration impact/rollback: this is a fresh-install baseline, not an in-place
upgrade. Existing schemas require inventory, validated backup/restore, data checks
and a separate additive ALTER plan; MySQL DDL implicitly commits. Disposable demo
rollback is scoped `down -v`; production rollback is validated restore/switchback,
with newly written data preserved separately. README contains operational guidance.

Backend smoke recommended: DB health, all role logins, profile CRUD, public and
employer jobs, moderation/blocking, CV CRUD, applications/duplicate rejection,
chat REST and Socket.IO history, and OTP via test SMTP. These HTTP/auth/mail/upload
paths were not run; B-02 stays IN PROGRESS for the original end-to-end criteria.
Open questions: existing deployment schema/upgrade data, manual-versus-parsed skill
precedence, canonical skill aliases, cache invalidation/version policy, consent
revocation, and future expiry/purge ownership. AI writers still require ownership,
role, JSON shape and extensible vocabulary validation in application code.
