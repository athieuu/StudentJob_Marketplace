
const applicationModel = require("../models/applicationModel");
const jobModel = require("../models/jobModel");
const { sendEmail } = require("../services/emailService");
const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const { uploadDir } = require("../middleware/uploadCv");
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

        try {
            const [employerRows] = await db.execute(
                `SELECT u.email, ep.company_name
                 FROM jobs j JOIN employer_profiles ep ON j.employer_id = ep.id
                 JOIN users u ON ep.user_id = u.id WHERE j.id = ?`,
                [jobId]
            );
            if (employerRows[0]?.email) {
                await sendEmail({
                    to: employerRows[0].email,
                    subject: "Bạn có hồ sơ ứng tuyển mới",
                    text: `Có sinh viên vừa ứng tuyển tin "${job.title}" (ID ${jobId}). Vui lòng đăng nhập StudentJob Marketplace để xem hồ sơ.`
                });
            }
        } catch (mailError) {
            console.error("Employer application notification email error:", mailError.message);
        }

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

        await applicationModel.updateApplicationStatus(applicationId, status);

        try {
            const [studentRows] = await db.execute(
                `SELECT u.email, sp.full_name
                 FROM applications a
                 JOIN student_profiles sp ON a.student_id = sp.id
                 JOIN users u ON sp.user_id = u.id
                 WHERE a.id = ?`,
                [applicationId]
            );
            if (studentRows[0]?.email) {
                await sendEmail({
                    to: studentRows[0].email,
                    subject: status === "ACCEPTED" ? "Hồ sơ ứng tuyển được chấp nhận" : "Cập nhật hồ sơ ứng tuyển",
                    text: `Hồ sơ ứng tuyển của bạn cho vị trí "${job.title}" đã được ${status === "ACCEPTED" ? "chấp nhận" : "từ chối"}.`
                });
            }
        } catch (mailError) {
            console.error("Student application outcome email error:", mailError.message);
        }

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

const uploadApplicationCv = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const application = Number.isSafeInteger(id) && id > 0
      ? await applicationModel.getApplicationById(id)
      : null;

    const studentId =
      await applicationModel.getStudentProfileId(req.user.id);

    if (
      !application ||
      !studentId ||
      Number(application.student_id) !== Number(studentId)
    ) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        message: "Không có quyền cập nhật CV này"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Vui lòng chọn file PDF"
      });
    }

    
    const buffer = await fs.promises.readFile(req.file.path);

    // Cho phép một số byte trắng đứng trước PDF header
    const prefix = buffer.subarray(0, 16).toString("latin1");
    const hasPdfHeader = /^[\x00-\x20]*%PDF-\d\.\d/.test(prefix);

    if (!hasPdfHeader) {
    await fs.promises.unlink(req.file.path);

    return res.status(400).json({
        message: "File không phải PDF hợp lệ"
    });
}


    const cvUrl = `private-cv:${req.file.filename}`;

    await applicationModel.updateApplicationCv(id, cvUrl);

    return res.json({
      message: "Upload CV thành công",
      cv_url: cvUrl
    });
  } catch (error) {
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    console.error(error);
    return res.status(500).json({
      message: "Lỗi upload CV"
    });
  }
};

const getAuthorizedCv = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ message: "ID không hợp lệ" });
    return null;
  }

  const application =
    await applicationModel.getApplicationById(id);

  if (!application) {
    res.status(404).json({ message: "Không tìm thấy đơn" });
    return null;
  }

  const employerId =
    await jobModel.getEmployerProfileId(req.user.id);

  const job = await jobModel.getJobById(application.job_id);

  if (
    !employerId ||
    !job ||
    Number(job.employer_id) !== Number(employerId)
  ) {
    res.status(403).json({ message: "Không có quyền xem CV" });
    return null;
  }

  if (!application.cv_url?.startsWith("private-cv:")) {
    res.status(404).json({
      message: "Đơn ứng tuyển chưa có CV PDF lưu trên server"
    });
    return null;
  }

  const filename = application.cv_url.slice("private-cv:".length);

  if (!/^[0-9a-f-]{36}\.pdf$/i.test(filename)) {
    res.status(400).json({ message: "Đường dẫn CV không hợp lệ" });
    return null;
  }

  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: "Không tìm thấy file CV" });
    return null;
  }

  return filePath;
};

const viewApplicationCv = async (req, res) => {
  try {
    const filePath = await getAuthorizedCv(req, res);
    if (!filePath) return;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "no-store");
    return res.sendFile(filePath);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi xem CV" });
  }
};

const downloadApplicationCv = async (req, res) => {
  try {
    const filePath = await getAuthorizedCv(req, res);
    if (!filePath) return;

    res.setHeader("Cache-Control", "no-store");
    return res.download(filePath, `CV_${req.params.id}.pdf`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi tải CV" });
  }
};


module.exports = {
  createApplication,
  getMyApplications,
  getApplicationsByJob,
  updateApplicationStatus,
  uploadApplicationCv,
  viewApplicationCv,
  downloadApplicationCv
};
