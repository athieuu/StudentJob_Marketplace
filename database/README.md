# StudentJob MySQL 8 database

Canonical SQL is `migrations/001_users_profiles.sql` through `006_ai.sql`, followed
by optional `seeds/001_demo.sql`. Legacy SQL in `database/` and `backend/database/`
is deprecated and must not be mixed with this baseline. No backend changes are needed
for existing SQL contracts; AI tables and `applications.cv_id` are future interfaces.

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
directory is empty. Explicit mounts name the migrations 001–006 and the seed 900.
Health checks authenticate over TCP and query the last migration's table, so the
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
-- Optional, demo databases only:
SOURCE database/seeds/001_demo.sql;
```

These are an ordered **fresh-install baseline**, not rerunnable upgrades of a
populated legacy schema. Duplicate table errors are intentional protection against
accidental reapplication. Record applied filenames/checksums in your deployment
system; no extra migration tracking table is imposed on the backend.

For an existing database: back it up and verify a restore first, inventory actual
DDL (legacy copies drift), duplicates, orphan references and salary ranges; then
author/review a separate additive ALTER migration from that exact schema. Do not
apply CREATE baselines over populated tables or import demo seed. In particular,
new uniqueness/check constraints can reject invalid old data, and new indexes
consume space and may require metadata locks. MySQL DDL implicitly commits; an
SQL transaction cannot undo a partially applied baseline. Use a fresh database
or restore a validated backup after a failed production migration.

## Rollback and reproducible checks

Stopping with `down` retains the demo data. For a newly created disposable demo
project only, reset by removing **that project's** volume and reinitializing:

```powershell
docker compose -p studentjob-my-demo -f database/docker-compose.yml down -v
docker compose -p studentjob-my-demo -f database/docker-compose.yml up -d --wait
```

Never use `down -v` on a shared or production project. Do not use Docker prune.
Production rollback is restore/switch back to the validated backup, preserving
new data separately; dropping these tables loses CVs/chat/AI data. If reverting
only new features, first detach student parse provenance and application CV FKs,
then remove child tables before parents after exporting data and reviewing the
actual schema. No automated destructive down migration is supplied.

```powershell
python database/verify.py --project sjdb-verify-your-unique-suffix
```

The verifier refuses existing resources, tests all 14 tables/20 FKs, every legacy
core column, demo jobs, duplicate applications, orphan references, score bounds,
chat upsert and cascades, nullable CV deletion, and parse provenance deletion.
It removes its newly created volume, recreates, compares DDL and demo values
(excluding runtime timestamps), and removes the disposable volume again.
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

The future writer validates `parser`, `method`, and both `source` strings
(VARCHAR(20), extensible without DDL), consent and same-user ownership of CV,
parse provenance and application CV; FKs enforce existence, not roles/ownership.
Do not write raw CV text into extracted JSON, warnings, errors, or logs.
`cv_parse_results.expires_at` is required: supply `created_at + INTERVAL 90 DAY`;
the future purge job deletes expired rows via `idx_parse_expiry` and provenance
links become NULL. No retention worker is implemented by this database task.
Use `{}` for a failed parse with no extracted fields. Validate JSON structures,
including match explanation `{matched:[skill_id], missing:[skill_id], required_missing:[skill_id]}`.
Version/hash cache entries and invalidate them when source inputs change.
