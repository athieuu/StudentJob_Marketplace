const pool = require("../config/db");

// Tìm user theo email
const findUserByEmail = async (email) => {
    const [rows] = await pool.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
    );

    return rows[0];
};

// Tạo user và profile trong cùng một transaction
const createUser = async ({
    email,
    password,
    role,
    profile
}) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Tạo tài khoản
        const [userResult] = await connection.query(
            `INSERT INTO users (email, password, role)
             VALUES (?, ?, ?)`,
            [email, password, role]
        );

        const userId = userResult.insertId;

        // 2. Tạo hồ sơ theo role
        if (role === "STUDENT") {
            await connection.query(
                `INSERT INTO student_profiles
                 (user_id, full_name, phone, university, major, bio)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    profile.full_name,
                    profile.phone || null,
                    profile.university || null,
                    profile.major || null,
                    profile.bio || null
                ]
            );
        }

        if (role === "EMPLOYER") {
            await connection.query(
                `INSERT INTO employer_profiles
                 (user_id, company_name, phone, address, description)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    userId,
                    profile.company_name,
                    profile.phone || null,
                    profile.address || null,
                    profile.description || null
                ]
            );
        }

        await connection.commit();

        return userId;

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    findUserByEmail,
    createUser
};