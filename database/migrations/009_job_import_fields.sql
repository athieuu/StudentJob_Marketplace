-- Apply once after 008, after verifying the deployed jobs table and backup.
-- MySQL DDL implicitly commits; this is separate from the data import.
ALTER TABLE jobs
 MODIFY job_type ENUM('PART_TIME','FULL_TIME','FREELANCE','INTERNSHIP') NOT NULL,
 ADD COLUMN category VARCHAR(255) NULL,
 ADD COLUMN work_mode VARCHAR(255) NULL,
 ADD COLUMN responsibilities TEXT NULL,
 ADD COLUMN requirements TEXT NULL,
 ADD COLUMN skills TEXT NULL,
 ADD COLUMN import_fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD UNIQUE KEY uq_jobs_import_fingerprint (import_fingerprint);
