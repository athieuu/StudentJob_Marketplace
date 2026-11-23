-- Registration exists before users, so intentionally no user FK.
CREATE TABLE email_verifications (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(255) NOT NULL,
 otp_hash CHAR(64) NOT NULL,
 expires_at DATETIME NOT NULL,
 registration_payload JSON NOT NULL,
 attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
 verified_at DATETIME NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_email_verifications_email (email),
 INDEX idx_email_verifications_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
