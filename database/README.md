# StudentJob MySQL 8 database

Canonical SQL is `migrations/001_users_profiles.sql` through `009_job_import_fields.sql`, followed
by optional `seeds/001_demo.sql`. Legacy SQL in `database/` and `backend/database/`
is deprecated and must not be mixed with this baseline.

## Disposable local demo

Requires Docker Desktop with Linux containers and Docker Compose v2. This creates
only demo data, on a project-scoped named volume; it binds MySQL to localhost:3307.
Use a fresh project name if another demo is running (also set `STUDENTJOB_DB_PORT`
to an unused port). Passwords committed here are public demo values only.

```powershell
docker compose -p studentjob-my-demo -f database/docker-compose.yml up -d --wait
docker compose -p studentjob-my-demo -f database/docker-compose.yml ps
docker compose -p studentjob-my-demo -f database/docker-compose.yml logs mysql
```

Backend environment for this local demo: `DB_HOST=127.0.0.1`, `DB_PORT=3307`,
`DB_NAME=studentjob_marketplace`, `DB_USER=studentjob_demo`, `DB_PASSWORD=demo-only`.
Root is `demo-root-only` and used only for container initialization. All three
synthetic accounts (`student.demo@example.com`, `employer.demo@example.com`,
`admin.demo@example.com`) use the legacy demo bcrypt hash for `Student@123`.
The two jobs are explicitly OPEN/APPROVED. Never deploy this compose/seed to production.

The official image runs top-level init files alphabetically, only when its data
directory is empty. Explicit mounts name migrations 001–009 and the seed 900.
Health checks authenticate over TCP and query the column added by 009, so the
temporary initialization server cannot report ready before migrations finish.
See [official image initialization behavior](https://hub.docker.com/_/mysql).

## Applying migrations outside Docker

Create/select an empty MySQL 8 database using `utf8mb4`/`utf8mb4_unicode_ci`.
Run each file once in numeric order with a migration identity allowed to create
tables, indexes and constraints. SQL files deliberately contain no `USE`, database
creation, `DROP`, or `FOREIGN_KEY_CHECKS=0`. For example in a mysql client:

```sql
SOURCE database/migrations/001_users_profiles.sql;
SOURCE database/migrations/002_jobs_applications.sql;
SOURCE database/migrations/003_email_verifications.sql;
SOURCE database/migrations/004_cvs.sql;
SOURCE database/migrations/005_chat.sql;
SOURCE database/migrations/006_ai.sql;
SOURCE database/migrations/007_reviews_profile_cv.sql;
SOURCE database/migrations/008_cv_feedback_history.sql;
SOURCE database/migrations/009_job_import_fields.sql;
-- Optional, demo databases only:
SOURCE database/seeds/001_demo.sql;
```

These are an ordered **fresh-install baseline**, not rerunnable upgrades of a
populated legacy schema. Duplicate table errors are intentional protection against
accidental reapplication. Record applied filenames/checksums in your deployment
system; no extra migration tracking table is imposed on the backend.

Migration 009 extends the job type enum and adds nullable import fields. It is a
separate, implicitly committing DDL step: verify the actual schema and a private,
restorable backup first. Deploy API response allowlisting before applying it, then
deploy the compatible API and frontend before inserting internship jobs. Retain
internship support in any rollback while such jobs remain.

`backend/scripts/import-synthetic-jobs.js INPUT EMPLOYER_PROFILE_ID --dry-run`
validates the complete JSON input and compares existing fingerprints without
writing. `--apply MANIFEST` writes in one transaction, serializes concurrent
imports with a database advisory lock, and reserves a private manifest containing
the exact IDs and fingerprints. A manifest marked `pending` or an empty manifest
means the outcome must be checked against the database before retrying; do not
assume a failed client command proves a failed commit. A repeat skips unchanged
rows and refuses to overwrite a row changed after import. Credentials use DB_*
runtime environment variables; never commit input, secrets or manifests.

For an existing database: back it up and verify a restore first, inventory actual
DDL (legacy copies drift), duplicates, orphan references and salary ranges; then
author/review a separate additive ALTER migration from that exact schema. Do not
apply CREATE baselines over populated tables or import demo seed. In particular,
new uniqueness/check constraints can reject invalid old data, and new indexes
consume space and may require metadata locks. MySQL DDL implicitly commits; an
SQL transaction cannot undo a partially applied baseline. Use a fresh database
or restore a validated backup after a failed production migration.

For a database known to have 001–006, inventory `student_profiles.cv_url`,
`reviews`, and `cv_parse_results.file_name`/`feedback` and compare their exact
definitions and constraints. After backup and review, apply only missing changes:
007 adds nullable `cv_url VARCHAR(500)` and the `reviews` table (unique job/user,
rating check and cascading job/user foreign keys); 008 adds nullable
`file_name VARCHAR(255)` and `feedback JSON`. Do not blindly rerun either ALTER:
007 uses `CREATE TABLE IF NOT EXISTS`, which does not repair an existing divergent
reviews table. Prepare a separately reviewed additive migration tailored to the
inventory, including any missing indexes/constraints and data cleanup. No existing
volume is upgraded automatically by changing Compose mounts.

## Rollback and reproducible checks

Stopping with `down` retains the demo data. For a fresh baseline use a new,
unique project and unused port; do not reuse or remove an existing volume.
Do not use Docker prune.
Production rollback is restore/switch back to the validated backup, preserving
new data separately; dropping these tables loses CVs/chat/AI data. If reverting
only new features, first detach student parse provenance and application CV FKs,
then remove child tables before parents after exporting data and reviewing the
actual schema. No automated destructive down migration is supplied.

```powershell
$env:STUDENTJOB_DB_PORT = '33588' # choose an unused localhost port
py -3.13 database/verify.py --project sjdb-verify-your-unique-suffix
```

The verifier refuses existing resources, tests all 15 tables/22 FKs, every legacy
core column, demo jobs, duplicate applications, orphan references, score bounds,
chat upsert and cascades, nullable CV deletion, and parse provenance deletion.
It checks 007/008 contracts, backend-equivalent history predicates and JSON, and
leaves the new container and volume intact. Rejected inserts can advance counters.
`VERIFICATION.md` records commands, key results, query plans and exit codes.
Any unexpected nonzero command/assertion fails the run; only named expected
integrity rejections pass. A failed run leaves its own resources for diagnosis;
inspect them before explicitly cleaning that project alone.

## Backend smoke recommendations

With the backend pointed only at the disposable demo: check `/api/health/db`,
login all three roles, public jobs (two visible), employer jobs, student/profile
updates, CV create/list/update/delete, applications/list/status and duplicate
application, conversation upsert/message history via REST and Socket.IO, and
admin moderation/block/unblock. Exercise registration OTP only with a test SMTP
sink. Database verification does not claim HTTP, JWT, SMTP or upload validation
was tested. No application dependencies or source have been changed.

## AI application obligations

The application must validate `parser`, `method`, and both `source` strings
(VARCHAR(20), extensible without DDL), consent and same-user ownership of CV,
parse provenance and application CV; FKs enforce existence, not roles/ownership.
Do not write raw CV text into extracted JSON, warnings, errors, or logs.
`cv_parse_results.expires_at` is required: supply `created_at + INTERVAL 90 DAY`;
the future purge job deletes expired rows via `idx_parse_expiry` and provenance
links become NULL. No retention worker is implemented by this database task.
Use `{}` for a failed parse with no extracted fields. Validate JSON structures,
including match explanation `{matched:[skill_id], missing:[skill_id], required_missing:[skill_id]}`.
Version/hash cache entries and invalidate them when source inputs change.
