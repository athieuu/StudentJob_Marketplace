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

The locally staged privacy-only backend image is
`sha256:900c78baa121c1a72e206c54801a9118ac32bc0c69521cb640a0180917a35c3a`.
It derives from the running item34 backend and was tested against an isolated
001–008 database: the public jobs endpoint returned 200 and both seed jobs.
The compatible backend and retained post-import recovery image is
`sha256:5a432fc5114d647892cbb754ea18b06279f55c0d8df6e190ed53f14388bf829b`.
Against the isolated migrated database it returned 152 jobs including 14
internships, hid fingerprints, reported an existing applicant count and accepted
an unchanged internship edit. Its four safety-file hashes match the running
backend. The final locally staged frontend image is
`sha256:c7ea857aca7f0fc55212c01821a59687ea7d59d8d19a65f563624dcec54ba6c3`;
its nginx check, jobs route and proxy to the isolated API passed. These local
images are not evidence of deployment to the VPS.
