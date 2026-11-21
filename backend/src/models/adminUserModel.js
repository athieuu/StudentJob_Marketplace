
const db = require("../config/db");

const getAllUsers = async () => {
    const [rows] = await db.execute(`
        SELECT
            u.id,
            u.email,
            u.role,
            sp.full_name,
            sp.university,
            sp.major,
            ep.company_name
        FROM users u
        LEFT JOIN student_profiles sp
            ON sp.user_id = u.id
        LEFT JOIN employer_profiles ep
            ON ep.user_id = u.id
        ORDER BY u.id DESC
    `);

    return rows.map(row => ({
        id: row.id,
        email: row.email,
        role: row.role,
        name: row.full_name || row.company_name || row.email,
        university: row.university,
        major: row.major,
        company_name: row.company_name
    }));
};

module.exports = { getAllUsers };
