
const express = require("express");
const router = express.Router();
const { uploadCv } = require("../middleware/uploadCv");
const {
    createApplication,
    getMyApplications,
    getApplicationsByJob,
    updateApplicationStatus,
    uploadApplicationCv,
    viewApplicationCv,
    downloadApplicationCv
} = require("../controllers/applicationController");

const {
    authenticateToken,
    authorizeRole
} = require("../middleware/authMiddleware");

// Sinh viên ứng tuyển
router.post(
    "/",
    authenticateToken,
    authorizeRole("STUDENT"),
    createApplication
);

// Sinh viên xem hồ sơ đã ứng tuyển
router.get(
    "/my",
    authenticateToken,
    authorizeRole("STUDENT"),
    getMyApplications
);

// Nhà tuyển dụng xem hồ sơ theo tin tuyển dụng
router.get(
    "/job/:jobId",
    authenticateToken,
    authorizeRole("EMPLOYER"),
    getApplicationsByJob
);

// Nhà tuyển dụng chấp nhận hoặc từ chối hồ sơ
router.patch(
    "/:id/status",
    authenticateToken,
    authorizeRole("EMPLOYER"),
    updateApplicationStatus
);


/**
 * Ứng viên upload CV PDF
 * POST /api/v1/applications/:id/cv
 */
router.post(
    "/:id/cv",
    authenticateToken,
    authorizeRole("STUDENT"),
    uploadCv.single("cv"),
    uploadApplicationCv
);

/**
 * Nhà tuyển dụng xem CV
 * GET /api/v1/applications/:id/cv/view
 */
router.get(
    "/:id/cv/view",
    authenticateToken,
    authorizeRole("EMPLOYER"),
    viewApplicationCv
);

/**
 * Nhà tuyển dụng tải CV
 * GET /api/v1/applications/:id/cv/download
 */
router.get(
    "/:id/cv/download",
    authenticateToken,
    authorizeRole("EMPLOYER"),
    downloadApplicationCv
);


module.exports = router;
