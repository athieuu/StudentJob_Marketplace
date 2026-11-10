const db = require("../config/db");

const saveOtp = async (email, otpHash, expiresAt, payload) => {
    await db.execute(
        `INSERT INTO email_verifications (email, otp_hash, expires_at, registration_payload)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE otp_hash=VALUES(otp_hash),
         expires_at=VALUES(expires_at), registration_payload=VALUES(registration_payload),
         attempts=0, verified_at=NULL`,
        [email, otpHash, expiresAt, JSON.stringify(payload)]
    );
};

const getOtp = async (email) => {
    const [rows] = await db.execute(
        "SELECT * FROM email_verifications WHERE email = ?",
        [email]
    );
    return rows[0] || null;
};

const markVerified = async (email) => {
    await db.execute(
        "UPDATE email_verifications SET verified_at = CURRENT_TIMESTAMP WHERE email = ?",
        [email]
    );
};

const incrementAttempts = async (email) => {
    await db.execute(
        "UPDATE email_verifications SET attempts = attempts + 1 WHERE email = ?",
        [email]
    );
};

const deleteOtp = async (email) => {
    await db.execute("DELETE FROM email_verifications WHERE email = ?", [email]);
};

module.exports = { saveOtp, getOtp, markVerified, incrementAttempts, deleteOtp };
