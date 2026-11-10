-- MySQL dump
-- Database: studentjob_marketplace

CREATE DATABASE IF NOT EXISTS studentjob_marketplace
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE studentjob_marketplace;

-- =========================================
-- TABLE: applications
-- =========================================

DROP TABLE IF EXISTS applications;

CREATE TABLE applications (
    id INT NOT NULL AUTO_INCREMENT,
    job_id INT NOT NULL,
    student_id INT NOT NULL,
    cv_url VARCHAR(500) DEFAULT NULL,
    cover_letter TEXT,
    status ENUM('PENDING','ACCEPTED','REJECTED')
        DEFAULT 'PENDING',
    applied_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_application_job_student (job_id, student_id),
    KEY fk_application_student (student_id),

    CONSTRAINT fk_application_job
        FOREIGN KEY (job_id)
        REFERENCES jobs (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_application_student
        FOREIGN KEY (student_id)
        REFERENCES student_profiles (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- TABLE: employer_profiles
-- =========================================

DROP TABLE IF EXISTS employer_profiles;

CREATE TABLE employer_profiles (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    description TEXT,

    PRIMARY KEY (id),
    UNIQUE KEY user_id (user_id),

    CONSTRAINT fk_employer_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- TABLE: jobs
-- =========================================

DROP TABLE IF EXISTS jobs;

CREATE TABLE jobs (
    id INT NOT NULL AUTO_INCREMENT,
    employer_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) DEFAULT NULL,
    salary_min DECIMAL(12,2) DEFAULT NULL,
    salary_max DECIMAL(12,2) DEFAULT NULL,

    job_type ENUM('PART_TIME','FULL_TIME','FREELANCE')
        NOT NULL,

    deadline DATE DEFAULT NULL,

    status ENUM('OPEN','CLOSED')
        DEFAULT 'OPEN',

    -- Email moderation additions
    moderation_status ENUM('PENDING','APPROVED','REJECTED')
        NOT NULL DEFAULT 'PENDING',

    rejection_reason VARCHAR(1000) DEFAULT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY fk_job_employer (employer_id),

    CONSTRAINT fk_job_employer
        FOREIGN KEY (employer_id)
        REFERENCES employer_profiles (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- TABLE: student_profiles
-- =========================================

DROP TABLE IF EXISTS student_profiles;

CREATE TABLE student_profiles (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    university VARCHAR(255) DEFAULT NULL,
    major VARCHAR(100) DEFAULT NULL,
    bio TEXT,

    PRIMARY KEY (id),
    UNIQUE KEY user_id (user_id),

    CONSTRAINT fk_student_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- TABLE: users
-- =========================================

DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,

    role ENUM('STUDENT','EMPLOYER','ADMIN')
        NOT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY email (email)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- TABLE: email_verifications
-- Email OTP registration
-- =========================================

CREATE TABLE IF NOT EXISTS email_verifications (
    id INT NOT NULL AUTO_INCREMENT,

    email VARCHAR(255) NOT NULL,

    -- SHA-256 hash of OTP
    otp_hash CHAR(64) NOT NULL,

    expires_at DATETIME NOT NULL,

    -- Registration data stored as JSON
    registration_payload JSON NOT NULL,

    -- Number of OTP verification attempts
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,

    verified_at DATETIME DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_email_verifications_email (email),

    KEY idx_email_verifications_expiry (expires_at)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- DEMO JOB MODERATION STATUS
-- =========================================

UPDATE jobs
SET moderation_status = 'APPROVED'
WHERE id IN (1, 2);