# Synthetic jobs import, 2026-11-27

The owner approved an additive schema and import of 150 synthetic jobs into the
isolated VPS demo, assigned to Demo Employer as OPEN and APPROVED. Internship
is a separate job type; the source categories, work modes, descriptions,
responsibilities, requirements and skills remain available. The private input,
credentials, database backup and ID manifests do not belong in Git.

Implementation is prepared but live deployment and verification are pending.
Migration 009 and the data import are separate stages because MySQL DDL commits
implicitly. The API must allowlist public fields before the migration so the
internal fingerprint is not exposed; API and frontend internship support must
be present before importing. Any retained rollback build must support both the
expanded schema and internship rows and retain the deployed account safety fixes.

Isolated MySQL 8.4 testing covered the 008 upgrade and fresh 001–009 baseline,
an injected mid-import failure with zero rows left behind, full field comparison
on repeat, and concurrent runs with 150 inserts and 150 skips. The source has 96
part-time, 40 full-time and 14 internship jobs, with 10 in each of 15 categories.
Public and employer API checks covered visibility, editing and fingerprint
redaction. The frontend production build and mapping test passed. The four
deployed safety files were matched by SHA-256 against the running backend; isolated
tests covered stale tokens, account deletion protection and blocked sockets.

A private consistent backup was restored into a separate network-isolated MySQL
instance. Its 15 table checksums matched the live database at verification time.
Before live changes, repeat the server, project, container, volume, employer and
count checks and ensure the backup remains appropriate for the current state.
Do not restart the live database, automatically roll back destructively, or touch
other services. On failure, stop relevant StudentJob writers safely and report it.
