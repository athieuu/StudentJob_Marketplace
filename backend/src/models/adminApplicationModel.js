
const db = require("../config/db");

const getAllApplications = async () => {
    const [rows] = await db.execute(`
        SELECT
            a.id,
            a.job_id,
            a.student_id,
            a.status,
            a.applied_at,
            a.cover_letter,
            a.cv_url,

            j.title AS job_title,

            sp.user_id AS student_user_id,
            sp.full_name,
            sp.phone,
            sp.university,
            sp.major,

            su.email AS student_email,
            ep.company_name,
            eu.email AS employer_email

        FROM applications a

        JOIN jobs j
            ON a.job_id = j.id

        JOIN student_profiles sp
            ON a.student_id = sp.id

        JOIN users su
            ON sp.user_id = su.id

        JOIN employer_profiles ep
            ON j.employer_id = ep.id

        JOIN users eu
            ON ep.user_id = eu.id

        ORDER BY a.applied_at DESC, a.id DESC
    `);

    return rows;
};

module.exports = {
    getAllApplications
};
