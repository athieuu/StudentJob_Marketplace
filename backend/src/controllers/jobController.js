
const jobModel = require("../models/jobModel");

const validJobTypes = ["PART_TIME", "FULL_TIME", "FREELANCE"];
const validStatuses = ["OPEN", "CLOSED"];

const validateJob = (body, isUpdate = false) => {
    const {
        title,
        description,
        job_type,
        salary_min,
        salary_max,
        deadline,
        status
    } = body;

    if (!isUpdate && (!title?.trim() || !description?.trim() || !job_type)) {
        return "Vui lòng nhập title, description và job_type";
    }

    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
        return "title không hợp lệ";
    }

    if (description !== undefined &&
        (typeof description !== "string" || !description.trim())) {
        return "description không hợp lệ";
    }

    if (job_type !== undefined && !validJobTypes.includes(job_type)) {
        return "job_type phải là PART_TIME, FULL_TIME hoặc FREELANCE";
    }

    if (salary_min !== undefined && salary_min !== null &&
        (!Number.isFinite(Number(salary_min)) || Number(salary_min) < 0)) {
        return "salary_min phải là số không âm";
    }

    if (salary_max !== undefined && salary_max !== null &&
        (!Number.isFinite(Number(salary_max)) || Number(salary_max) < 0)) {
        return "salary_max phải là số không âm";
    }

    if (salary_min != null && salary_max != null &&
        Number(salary_min) > Number(salary_max)) {
        return "salary_min không được lớn hơn salary_max";
    }

    if (deadline !== undefined && deadline !== null && deadline !== "") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) ||
            Number.isNaN(Date.parse(`${deadline}T00:00:00Z`)) ||
            new Date(`${deadline}T00:00:00Z`).toISOString().slice(0, 10) !== deadline) {
            return "deadline phải có định dạng YYYY-MM-DD";
        }
    }

    if (status !== undefined && !validStatuses.includes(status)) {
        return "status phải là OPEN hoặc CLOSED";
    }

    return null;
};


const createJob = async (req, res) => {
    try {
        const error = validateJob(req.body);

        if (error) {
            return res.status(400).json({ message: error });
        }

        // Lấy ID hồ sơ nhà tuyển dụng từ user đang đăng nhập
        const employerProfileId = await jobModel.getEmployerProfileId(
            req.user.id
        );

        if (!employerProfileId) {
            return res.status(404).json({
                message: "Không tìm thấy hồ sơ nhà tuyển dụng"
            });
        }

        const jobId = await jobModel.createJob({
            ...req.body,
            employer_id: employerProfileId
        });

        return res.status(201).json({
            message: "Đăng tin tuyển dụng thành công",
            jobId
        });
    } catch (error) {
        console.error("Create job error:", error);
        return res.status(500).json({
            message: "Lỗi server khi đăng tin tuyển dụng"
        });
    }
};


const getAllJobs = async (req, res) => {
    try {
        const jobs = await jobModel.getAllJobs();
        return res.status(200).json({ data: jobs });
    } catch (error) {
        console.error("Get jobs error:", error.message);
        return res.status(500).json({ message: "Lỗi server khi lấy danh sách tin" });
    }
};

const getJobById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ message: "ID tin tuyển dụng không hợp lệ" });
        }

        const job = await jobModel.getJobById(id);

        if (!job) {
            return res.status(404).json({ message: "Không tìm thấy tin tuyển dụng" });
        }

        return res.status(200).json({ data: job });
    } catch (error) {
        console.error("Get job error:", error.message);
        return res.status(500).json({ message: "Lỗi server khi lấy chi tiết tin" });
    }
};


const updateJob = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "ID tin tuyển dụng không hợp lệ"
            });
        }

        const allowedFields = [
            "title", "description", "location",
            "salary_min", "salary_max", "job_type",
            "deadline", "status"
        ];

        if (
            !req.body ||
            !Object.keys(req.body).some(key => allowedFields.includes(key))
        ) {
            return res.status(400).json({
                message: "Vui lòng cung cấp thông tin cần cập nhật"
            });
        }

        const error = validateJob(req.body, true);

        if (error) {
            return res.status(400).json({ message: error });
        }

        // Lấy đúng ID hồ sơ nhà tuyển dụng
        const employerProfileId = await jobModel.getEmployerProfileId(
            req.user.id
        );

        if (!employerProfileId) {
            return res.status(404).json({
                message: "Không tìm thấy hồ sơ nhà tuyển dụng"
            });
        }

        const existingJob = await jobModel.getJobById(id);

        if (!existingJob) {
            return res.status(404).json({
                message: "Không tìm thấy tin tuyển dụng"
            });
        }

        // So sánh ID hồ sơ với ID lưu trong jobs.employer_id
        if (Number(existingJob.employer_id) !== Number(employerProfileId)) {
            return res.status(403).json({
                message: "Bạn chỉ được sửa tin tuyển dụng do mình đăng"
            });
        }

        const updatedJob = {
            title: req.body.title ?? existingJob.title,
            description: req.body.description ?? existingJob.description,
            location: req.body.location === undefined
                ? existingJob.location
                : req.body.location,
            salary_min: req.body.salary_min === undefined
                ? existingJob.salary_min
                : req.body.salary_min,
            salary_max: req.body.salary_max === undefined
                ? existingJob.salary_max
                : req.body.salary_max,
            job_type: req.body.job_type ?? existingJob.job_type,
            deadline: req.body.deadline === undefined
                ? existingJob.deadline
                : req.body.deadline,
            status: req.body.status ?? existingJob.status
        };

        const errorAfterMerge = validateJob(updatedJob);

        if (errorAfterMerge) {
            return res.status(400).json({
                message: errorAfterMerge
            });
        }

        const affectedRows = await jobModel.updateJob(
            id,
            employerProfileId,
            updatedJob
        );

        if (!affectedRows) {
            return res.status(404).json({
                message: "Không thể cập nhật tin tuyển dụng"
            });
        }

        return res.status(200).json({
            message: "Cập nhật tin tuyển dụng thành công"
        });
    } catch (error) {
        console.error("Update job error:", error);
        return res.status(500).json({
            message: "Lỗi server khi cập nhật tin"
        });
    }
};


module.exports = {
    createJob,
    getAllJobs,
    getJobById,
    updateJob
};
