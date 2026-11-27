const db = require("../config/db");
const { sendEmail } = require("../services/emailService");
const jobView = require('../models/jobView');

const getPendingJobs = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT j.*, ep.company_name, u.email AS employer_email
             FROM jobs j
             JOIN employer_profiles ep ON j.employer_id = ep.id
             JOIN users u ON ep.user_id = u.id
             WHERE j.moderation_status = 'PENDING'
             ORDER BY j.created_at ASC`
        );
        return res.status(200).json({ data: rows.map(jobView) });
    } catch (error) {
        console.error("Admin get pending jobs error:", error);
        return res.status(500).json({ message: "Lỗi khi lấy danh sách tin chờ duyệt" });
    }
};

const moderateJob = async (req, res) => {
    try {
        const jobId = Number(req.params.id);
        const { moderation_status, rejection_reason } = req.body || {};
        if (!Number.isSafeInteger(jobId) || jobId <= 0) {
            return res.status(400).json({ message: "ID tin tuyển dụng không hợp lệ" });
        }
        if (!["APPROVED", "REJECTED"].includes(moderation_status)) {
            return res.status(400).json({ message: "moderation_status phải là APPROVED hoặc REJECTED" });
        }
        if (moderation_status === "REJECTED" && !String(rejection_reason || "").trim()) {
            return res.status(400).json({ message: "Vui lòng cung cấp rejection_reason khi từ chối tin" });
        }

        const [rows] = await db.execute(
            `SELECT j.id, j.title, j.moderation_status, u.email AS employer_email
             FROM jobs j JOIN employer_profiles ep ON j.employer_id = ep.id
             JOIN users u ON ep.user_id = u.id WHERE j.id = ?`,
            [jobId]
        );
        const job = rows[0];
        if (!job) return res.status(404).json({ message: "Không tìm thấy tin tuyển dụng" });
        if (job.moderation_status !== "PENDING") {
            return res.status(400).json({ message: "Tin này đã được admin xử lý trước đó" });
        }

        await db.execute(
            `UPDATE jobs SET moderation_status = ?, rejection_reason = ? WHERE id = ?`,
            [moderation_status, moderation_status === "REJECTED" ? String(rejection_reason).trim() : null, jobId]
        );

        try {
            await sendEmail({
                to: job.employer_email,
                subject: moderation_status === "APPROVED" ? "Tin tuyển dụng đã được duyệt" : "Tin tuyển dụng bị từ chối",
                text: moderation_status === "APPROVED"
                    ? `Tin "${job.title}" đã được admin duyệt và hiện có thể hiển thị cho sinh viên.`
                    : `Tin "${job.title}" đã bị admin từ chối. Lý do: ${String(rejection_reason).trim()}`
            });
        } catch (mailError) {
            console.error("Employer moderation result email error:", mailError.message);
        }

        return res.status(200).json({
            message: moderation_status === "APPROVED" ? "Đã duyệt tin tuyển dụng" : "Đã từ chối tin tuyển dụng",
            jobId, moderation_status
        });
    } catch (error) {
        console.error("Moderate job error:", error);
        return res.status(500).json({ message: "Lỗi server khi kiểm duyệt tin tuyển dụng" });
    }
};

module.exports = { getPendingJobs, moderateJob };
