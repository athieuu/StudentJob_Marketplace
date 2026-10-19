
const applicationModel = require("../models/applicationModel");
const jobModel = require("../models/jobModel");

const validStatuses = ["ACCEPTED", "REJECTED"];

// Sinh viên ứng tuyển công việc
const createApplication = async (req, res) => {
    try {
        const { job_id, cv_url, cover_letter } = req.body || {};
        const jobId = Number(job_id);

        if (!Number.isSafeInteger(jobId) || jobId <= 0) {
            return res.status(400).json({
                message: "ID tin tuyển dụng không hợp lệ"
            });
        }

        if (
            cv_url != null &&
            (typeof cv_url !== "string" || cv_url.length > 500)
        ) {
            return res.status(400).json({
                message: "cv_url phải là chuỗi không quá 500 ký tự"
            });
        }

        if (
            cover_letter != null &&
            typeof cover_letter !== "string"
        ) {
            return res.status(400).json({
                message: "cover_letter không hợp lệ"
            });
        }

        // Lấy ID hồ sơ sinh viên từ ID user trong JWT
        const studentId =
            await applicationModel.getStudentProfileId(req.user.id);

        if (!studentId) {
            return res.status(404).json({
                message: "Bạn chưa có hồ sơ sinh viên"
            });
        }

        const job = await jobModel.getJobById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Không tìm thấy tin tuyển dụng"
            });
        }

        if (job.status !== "OPEN") {
            return res.status(400).json({
                message: "Tin tuyển dụng hiện không nhận hồ sơ"
            });
        }

        const alreadyApplied =
            await applicationModel.checkExistingApplication(
                jobId,
                studentId
            );

        if (alreadyApplied) {
            return res.status(409).json({
                message: "Bạn đã ứng tuyển công việc này"
            });
        }

        const applicationId =
            await applicationModel.createApplication({
                job_id: jobId,
                student_id: studentId,
                cv_url: cv_url || null,
                cover_letter: cover_letter || null
            });

        return res.status(201).json({
            message: "Ứng tuyển thành công",
            applicationId
        });
    } catch (error) {
        console.error("Create application error:", error);

        return res.status(500).json({
            message: "Lỗi server khi ứng tuyển"
        });
    }
};

// Sinh viên xem danh sách đơn đã ứng tuyển
const getMyApplications = async (req, res) => {
    try {
        const studentId =
            await applicationModel.getStudentProfileId(req.user.id);

        if (!studentId) {
            return res.status(404).json({
                message: "Bạn chưa có hồ sơ sinh viên"
            });
        }

        const applications =
            await applicationModel.getApplicationsByStudentId(studentId);

        return res.status(200).json({
            data: applications
        });
    } catch (error) {
        console.error("Get my applications error:", error);

        return res.status(500).json({
            message: "Lỗi server khi lấy danh sách hồ sơ ứng tuyển"
        });
    }
};

// Nhà tuyển dụng xem hồ sơ ứng tuyển vào tin của mình
const getApplicationsByJob = async (req, res) => {
    try {
        const jobId = Number(req.params.jobId);

        if (!Number.isSafeInteger(jobId) || jobId <= 0) {
            return res.status(400).json({
                message: "ID tin tuyển dụng không hợp lệ"
            });
        }

        const employerProfileId =
            await jobModel.getEmployerProfileId(req.user.id);

        if (!employerProfileId) {
            return res.status(404).json({
                message: "Không tìm thấy hồ sơ nhà tuyển dụng"
            });
        }

        const job = await jobModel.getJobById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Không tìm thấy tin tuyển dụng"
            });
        }

        if (Number(job.employer_id) !== Number(employerProfileId)) {
            return res.status(403).json({
                message: "Bạn không có quyền xem hồ sơ của tin này"
            });
        }

        const applications =
            await applicationModel.getApplicationsByJobId(
                jobId,
                employerProfileId
            );

        return res.status(200).json({
            data: applications
        });
    } catch (error) {
        console.error("Get applications by job error:", error);

        return res.status(500).json({
            message: "Lỗi server khi lấy hồ sơ ứng tuyển"
        });
    }
};

// Nhà tuyển dụng chấp nhận hoặc từ chối hồ sơ
const updateApplicationStatus = async (req, res) => {
    try {
        const applicationId = Number(req.params.id);
        const { status } = req.body || {};

        if (!Number.isSafeInteger(applicationId) || applicationId <= 0) {
            return res.status(400).json({
                message: "ID hồ sơ ứng tuyển không hợp lệ"
            });
        }

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "status phải là ACCEPTED hoặc REJECTED"
            });
        }

        const application =
            await applicationModel.getApplicationById(applicationId);

        if (!application) {
            return res.status(404).json({
                message: "Không tìm thấy hồ sơ ứng tuyển"
            });
        }

        const employerProfileId =
            await jobModel.getEmployerProfileId(req.user.id);

        if (!employerProfileId) {
            return res.status(404).json({
                message: "Không tìm thấy hồ sơ nhà tuyển dụng"
            });
        }

        const job = await jobModel.getJobById(application.job_id);

        if (
            !job ||
            Number(job.employer_id) !== Number(employerProfileId)
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền xử lý hồ sơ này"
            });
        }

        if (application.status !== "PENDING") {
            return res.status(400).json({
                message: "Hồ sơ này đã được xử lý trước đó"
            });
        }

        await applicationModel.updateApplicationStatus(
            applicationId,
            status
        );

        return res.status(200).json({
            message: status === "ACCEPTED"
                ? "Đã chấp nhận hồ sơ ứng tuyển"
                : "Đã từ chối hồ sơ ứng tuyển"
        });
    } catch (error) {
        console.error("Update application status error:", error);

        return res.status(500).json({
            message: "Lỗi server khi cập nhật trạng thái hồ sơ"
        });
    }
};

module.exports = {
    createApplication,
    getMyApplications,
    getApplicationsByJob,
    updateApplicationStatus
};
