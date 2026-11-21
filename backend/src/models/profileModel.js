
const pool = require("../config/db");

const getProfileByUserId = async (userId) => {
    const [rows] = await pool.query(
        `SELECT
            u.id, u.email, u.role,
            s.full_name, s.phone AS student_phone,
            s.university, s.major, s.bio,
            e.company_name, e.phone AS employer_phone,
            e.address, e.description
         FROM users u
         LEFT JOIN student_profiles s ON s.user_id = u.id
         LEFT JOIN employer_profiles e ON e.user_id = u.id
         WHERE u.id = ?`,
        [userId]
    );

    if (!rows.length) return null;

    const user = rows[0];

    return {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        company_name: user.company_name,
        phone: user.role === "STUDENT"
            ? user.student_phone
            : user.employer_phone,
        university: user.university,
        major: user.major,
        bio: user.bio,
        address: user.address,
        description: user.description
    };
};

const updateProfile = async (userId, role, data) => {
    if (role === "STUDENT") {
        const [result] = await pool.query(
            `UPDATE student_profiles
             SET full_name = ?, phone = ?,
                 university = ?, major = ?, bio = ?
             WHERE user_id = ?`,
            [
                data.full_name,
                data.phone,
                data.university,
                data.major,
                data.bio,
                userId
            ]
        );
        return result.affectedRows;
    }

    if (role === "EMPLOYER") {
        const [result] = await pool.query(
            `UPDATE employer_profiles
             SET company_name = ?, phone = ?,
                 address = ?, description = ?
             WHERE user_id = ?`,
            [
                data.company_name,
                data.phone,
                data.address,
                data.description,
                userId
            ]
        );
        return result.affectedRows;
    }

    return 0;
};

module.exports = {
    getProfileByUserId,
    updateProfile
};
