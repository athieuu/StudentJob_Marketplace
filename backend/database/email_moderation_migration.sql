USE studentjob_marketplace;

-- Tin nha tuyen dung tao se cho admin kiem duyet.
ALTER TABLE jobs
    ADD COLUMN moderation_status ENUM('PENDING','APPROVED','REJECTED')
        NOT NULL DEFAULT 'PENDING' AFTER status,
    ADD COLUMN rejection_reason VARCHAR(1000) NULL AFTER moderation_status;

-- OTP dang ky email; chi luu hash OTP va password da hash trong payload.
CREATE TABLE IF NOT EXISTS email_verifications (
    id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    otp_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    registration_payload JSON NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    verified_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_email_verifications_email (email),
    KEY idx_email_verifications_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing seeded/demo jobs are marked approved to retain visibility.
UPDATE jobs SET moderation_status = 'APPROVED' WHERE id IN (1, 2);
