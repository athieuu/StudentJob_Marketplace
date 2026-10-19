
const db = require("../config/db");

// Sinh viên ứng tuyển vào công việc
const createApplication = async (application) => {
    const {
        job_id,
        student_id,
        cv_url,
        cover_letter
    } = application;

    const [result] = await db.execute(
        `INSERT INTO applications
        (job_id, student_id, cv_url, cover_letter)
        VALUES (?, ?, ?, ?)`,
        [
            job_id,
            student_id,
            cv_url || null,
            cover_letter || null
        ]
    );

    return result.insertId;
};

// Lấy danh sách hồ sơ ứng tuyển của sinh viên
const getApplicationsByStudentId = async (studentId) => {
    const [rows] = await db.execute(
        `SELECT a.*, j.title AS job_title,
                j.location, j.job_type, j.employer_id
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE a.student_id = ?
         ORDER BY a.applied_at DESC`,
        [studentId]
    );

    return rows;
};

// Nhà tuyển dụng xem hồ sơ ứng tuyển vào tin của mình
const getApplicationsByJobId = async (jobId, employerId) => {
    const [rows] = await db.execute(
        `SELECT a.*, j.title AS job_title,
                u.email AS student_email
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         JOIN employer_profiles ep ON j.employer_id = ep.id
         JOIN users u ON a.student_id = u.id
         WHERE a.job_id = ?
           AND ep.id = ?
         ORDER BY a.applied_at DESC`,
        [jobId, employerId]
    );

    return rows;
};

// Lấy hồ sơ ứng tuyển theo ID
const getApplicationById = async (id) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM applications
         WHERE id = ?`,
        [id]
    );

    return rows[0] || null;
};

// Nhà tuyển dụng cập nhật trạng thái hồ sơ
const updateApplicationStatus = async (id, status) => {
    const [result] = await db.execute(
        `UPDATE applications
         SET status = ?
         WHERE id = ?`,
        [status, id]
    );

    return result.affectedRows;
};

// Kiểm tra sinh viên đã ứng tuyển công việc chưa
const checkExistingApplication = async (jobId, studentId) => {
    const [rows] = await db.execute(
        `SELECT id
         FROM applications
         WHERE job_id = ? AND student_id = ?`,
        [jobId, studentId]
    );

    return rows.length > 0;
};

const getStudentProfileId = async (userId) => {
    const [rows] = await db.execute(
        `SELECT id
         FROM student_profiles
         WHERE user_id = ?`,
        [userId]
    );

    return rows.length > 0 ? rows[0].id : null;
};

module.exports = {
    createApplication,
    getApplicationsByStudentId,
    getApplicationsByJobId,
    getApplicationById,
    updateApplicationStatus,
    checkExistingApplication,
    getStudentProfileId
};