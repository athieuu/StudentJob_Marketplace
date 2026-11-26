# Database integration verification

Base: `origin/main` at `d6ee7eeeaff21b9efda0c81aebcdf9999883246a`;
feature branch: `feature/database-integration-008`. Compared `origin/Khang` at
`3187f649ecd28ae994f03055d75de8bdda0aed37`: its 007 Compose mount,
15-table/22-FK checks and profile column check are preserved; this branch also
mounts 008, checks its columns for readiness, retains volumes and tests history.
Khang predates 008; its removal of 008 is not carried forward.

On 2026-11-26, `STUDENTJOB_DB_PORT=33588` and
`py -3.13 database/verify.py --project sjdb-verify-20261126-db008b` exited 0.
The full command transcript, exit codes, DDL, index inventory, initialization logs,
and expected rejection codes are in [VERIFICATION.md](VERIFICATION.md). MySQL
8.4.13 initialized 001–008 then synthetic seed on an empty named volume. The
first run also passed on project `sjdb-verify-20261126-db008a`, port 33587,
volume `sjdb-verify-20261126-db008a_demo-data`; it preceded the expanded checks.
Both volumes and containers remain present.

The final project is `sjdb-verify-20261126-db008b`, container
`sjdb-verify-20261126-db008b-mysql-1` (ID
`72ec7372ec73cf36d35267df3690c8cb55c15e71574dec00cb714002d8f3fbd7`),
volume `sjdb-verify-20261126-db008b_demo-data`, schema
`studentjob_marketplace`, bound to `127.0.0.1:33588`. Use demo user
`studentjob_demo` / `demo-only` for local integration only. Successful mutations
were rolled back and rejected inserts can advance auto-increment counters. It is
safe for synthetic integration testing, but is not a pristine counter snapshot;
for an untouched seed use a new unique Compose project and unused port as in the
README, never reuse an existing volume for initialization.

The final run confirms 15 InnoDB tables and 22 foreign keys, `cv_url` update and
seeded student skills, reviews uniqueness/rating/FK/cascade, and both 008 columns.
It exercises the exact backend history insert fields, obtains a positive ID,
round-trips extracted/warnings/feedback JSON, checks a 90-day expiry and nullable
CV default, and uses the backend user/expiry list and user-scoped delete predicates.
Wrong-user list/delete return zero; own delete affects one; expired rows are hidden.
Invalid JSON/status, missing expiry and orphan user are rejected. Index inventory
and remaining chat, application and score checks are in the transcript.

The current backend-compatible SQL succeeds on this fresh schema. Main's previous
Compose omitted 007 and 008: an existing volume initialized that way can lack the
columns, causing the history insert to fail; `saveCvAnalysisHistory` catches errors
and returns null. This SQL demonstration does not establish that application
validation, authentication, provider behavior or a particular existing database
is responsible for any reported failure. Backend Dev owns real-auth and mocked
provider integration testing. Constraints verify existence, not cross-user
ownership; the application must enforce ownership. The schema has no purge job.

Existing volumes are never automatically upgraded. Inventory their actual DDL,
back up and review an additive migration for missing 007/008 elements as detailed
in the README; none was applied to an existing volume. No real CV, live service,
shared environment, paid API or application source was used or modified.
