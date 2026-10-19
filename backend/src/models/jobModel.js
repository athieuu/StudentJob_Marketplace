
const db = require("../config/db");

const createJob = async (job) => {
    const {
        employer_id,
        title,
        description,
        location,
        salary_min,
        salary_max,
        job_type,
        deadline
    } = job;

    const [result] = await db.execute(
        `INSERT INTO jobs
        (employer_id, title, description, location,
         salary_min, salary_max, job_type, deadline)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            employer_id,
            title,
            description,
            location || null,
            salary_min ?? null,
            salary_max ?? null,
            job_type,
            deadline || null
        ]
    );

    return result.insertId;
};

const getAllJobs = async () => {
    const [rows] = await db.execute(
        `SELECT j.*, ep.company_name
         FROM jobs j
         LEFT JOIN employer_profiles ep ON j.employer_id = ep.id
         ORDER BY j.created_at DESC`
    );

    return rows;
};

const getJobById = async (id) => {
    const [rows] = await db.execute(
        `SELECT j.*, ep.company_name
         FROM jobs j
         LEFT JOIN employer_profiles ep ON j.employer_id = ep.id
         WHERE j.id = ?`,
        [id]
    );

    return rows[0];
};

const getEmployerProfileId = async (userId) => {
    const [rows] = await db.execute(
        `SELECT id
         FROM employer_profiles
         WHERE user_id = ?`,
        [userId]
    );

    return rows.length > 0 ? rows[0].id : null;
};


const updateJob = async (id, employerId, job) => {
    const {
        title,
        description,
        location,
        salary_min,
        salary_max,
        job_type,
        deadline,
        status
    } = job;

    const [result] = await db.execute(
        `UPDATE jobs
         SET title = ?, description = ?, location = ?,
             salary_min = ?, salary_max = ?, job_type = ?,
             deadline = ?, status = ?
         WHERE id = ? AND employer_id = ?`,
        [
            title,
            description,
            location || null,
            salary_min ?? null,
            salary_max ?? null,
            job_type,
            deadline || null,
            status,
            id,
            employerId
        ]
    );

    return result.affectedRows;
};

module.exports = {
    createJob,
    getAllJobs,
    getJobById,
    updateJob,
    getEmployerProfileId
};