CREATE TABLE jobs (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 employer_id INT NOT NULL,
 title VARCHAR(255) NOT NULL, description TEXT NOT NULL, location VARCHAR(255) NULL,
 salary_min DECIMAL(12,2) NULL, salary_max DECIMAL(12,2) NULL,
 job_type ENUM('PART_TIME','FULL_TIME','FREELANCE') NOT NULL,
 deadline DATE NULL,
 status ENUM('OPEN','CLOSED') NULL DEFAULT 'OPEN',
 moderation_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
 rejection_reason VARCHAR(1000) NULL,
 created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT chk_job_salary CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max),
 CONSTRAINT fk_job_employer FOREIGN KEY (employer_id) REFERENCES employer_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
 INDEX idx_jobs_public (moderation_status, created_at),
 INDEX idx_jobs_employer_created (employer_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE applications (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 job_id INT NOT NULL, student_id INT NOT NULL,
 cv_url VARCHAR(500) NULL, cover_letter TEXT NULL,
 status ENUM('PENDING','ACCEPTED','REJECTED') NULL DEFAULT 'PENDING',
 applied_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_application_job_student (job_id, student_id),
 INDEX idx_applications_student_applied (student_id, applied_at),
 INDEX idx_applications_job_applied (job_id, applied_at),
 CONSTRAINT fk_application_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_application_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
