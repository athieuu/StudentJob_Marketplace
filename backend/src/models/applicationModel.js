
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
        `SELECT
            a.*,
            j.title AS job_title,
            j.location,
            j.job_type,
            j.employer_id,
            ep.company_name
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         LEFT JOIN employer_profiles ep ON j.employer_id = ep.id
         WHERE a.student_id = ?
         ORDER BY a.applied_at DESC`,
        [studentId]
    );

    return rows;
};

// Nhà tuyển dụng xem hồ sơ ứng tuyển vào tin của mình
const getApplicationsByJobId = async (jobId, employerId) => {
    const [rows] = await db.execute(
        `SELECT
            a.*,
            j.title AS job_title,
            sp.id AS student_profile_id,
            sp.user_id AS student_user_id,
            sp.full_name,
            sp.phone,
            sp.university,
            sp.major,
            u.email AS student_email
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         JOIN employer_profiles ep ON j.employer_id = ep.id
         JOIN student_profiles sp ON a.student_id = sp.id
         JOIN users u ON sp.user_id = u.id
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


const updateApplicationCv = async (applicationId, cvUrl) => {
    const [result] = await db.execute(
        `UPDATE applications
         SET cv_url = ?
         WHERE id = ?`,
        [cvUrl, applicationId]
    );

    return result.affectedRows > 0;
};


module.exports = {
    createApplication,
    getApplicationsByStudentId,
    getApplicationsByJobId,
    getApplicationById,
    updateApplicationStatus,
    checkExistingApplication,
    getStudentProfileId,
    updateApplicationCv
};