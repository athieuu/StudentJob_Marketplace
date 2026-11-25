CREATE TABLE skills (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL, normalized_name VARCHAR(100) NOT NULL UNIQUE,
 category VARCHAR(50) NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Before student_skills, which references parse provenance.
-- Store structured fields only: never full CV text or original file bytes.
CREATE TABLE cv_parse_results (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL, cv_id INT NULL,
 parser VARCHAR(20) NOT NULL, model VARCHAR(100) NULL, parser_version VARCHAR(20) NULL,
 source_file_type ENUM('pdf','docx') NULL,
 status ENUM('success','partial','failed') NOT NULL,
 extracted JSON NOT NULL, warnings JSON NULL, error_message VARCHAR(500) NULL,
 duration_ms INT UNSIGNED NULL, input_tokens INT UNSIGNED NULL, output_tokens INT UNSIGNED NULL,
 file_hash CHAR(64) NULL, prompt_version VARCHAR(20) NULL, schema_version SMALLINT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TIMESTAMP NOT NULL,
 INDEX idx_parse_user_created (user_id, created_at),
 INDEX idx_parse_user_hash (user_id, file_hash),
 INDEX idx_parse_expiry (expires_at),
 CONSTRAINT fk_parse_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_parse_cv FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_skills (
 student_id INT NOT NULL, skill_id INT NOT NULL,
 source VARCHAR(20) NOT NULL DEFAULT 'manual', level TINYINT UNSIGNED NULL,
 confidence DECIMAL(4,3) NULL, years_experience DECIMAL(3,1) NULL,
 cv_parse_result_id INT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (student_id, skill_id),
 CONSTRAINT chk_student_level CHECK (level BETWEEN 1 AND 5),
 CONSTRAINT chk_student_confidence CHECK (confidence BETWEEN 0 AND 1),
 CONSTRAINT chk_student_experience CHECK (years_experience >= 0),
 CONSTRAINT fk_skill_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_student_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_student_parse FOREIGN KEY (cv_parse_result_id) REFERENCES cv_parse_results(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE job_skills (
 job_id INT NOT NULL, skill_id INT NOT NULL,
 source VARCHAR(20) NOT NULL DEFAULT 'manual',
 is_required BOOLEAN NOT NULL DEFAULT TRUE,
 weight DECIMAL(4,2) NOT NULL DEFAULT 1.00,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (job_id, skill_id),
 CONSTRAINT chk_job_skill_weight CHECK (weight > 0),
 CONSTRAINT chk_job_skill_required CHECK (is_required IN (0,1)),
 CONSTRAINT fk_skill_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_job_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE job_match_scores (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 student_id INT NOT NULL, job_id INT NOT NULL,
 score DECIMAL(5,2) NOT NULL,
 method VARCHAR(20) NOT NULL, score_version VARCHAR(20) NOT NULL,
 input_hash CHAR(64) NULL, model VARCHAR(100) NULL,
 explanation JSON NULL COMMENT '{matched:[skill_id],missing:[skill_id],required_missing:[skill_id]}',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_match_version (student_id, job_id, method, score_version),
 INDEX idx_match_student_score (student_id, score),
 INDEX idx_match_job_score (job_id, score),
 CONSTRAINT chk_match_score CHECK (score BETWEEN 0 AND 100),
 CONSTRAINT fk_match_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_match_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
