const db = require("../config/db");

const mapAdminUserRow = (row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status || "ACTIVE",
    created_at: row.created_at,
    name: row.full_name || row.company_name || row.email,
    phone: row.student_phone || row.employer_phone || "",
    university: row.university || "",
    major: row.major || "",
    company_name: row.company_name || "",
    address: row.address || ""
});

const getAllUsers = async () => {
    const [rows] = await db.execute(`
        SELECT
            u.id,
            u.email,
            u.role,
            u.status,
            u.created_at,
            sp.full_name,
            sp.phone AS student_phone,
            sp.university,
            sp.major,
            ep.company_name,
            ep.phone AS employer_phone,
            ep.address
        FROM users u
        LEFT JOIN student_profiles sp
            ON sp.user_id = u.id
        LEFT JOIN employer_profiles ep
            ON ep.user_id = u.id
        ORDER BY u.id DESC
    `);

    return rows.map(mapAdminUserRow);
};

const getAdminUserById = async (id, conn = db) => {
    const [rows] = await conn.execute(
        `
        SELECT
            u.id,
            u.email,
            u.role,
            u.status,
            u.created_at,
            sp.full_name,
            sp.phone AS student_phone,
            sp.university,
            sp.major,
            ep.company_name,
            ep.phone AS employer_phone,
            ep.address
        FROM users u
        LEFT JOIN student_profiles sp
            ON sp.user_id = u.id
        LEFT JOIN employer_profiles ep
            ON ep.user_id = u.id
        WHERE u.id = ?
        LIMIT 1
    `,
        [id]
    );

    return rows[0] ? mapAdminUserRow(rows[0]) : null;
};

module.exports = { getAllUsers, getAdminUserById };
