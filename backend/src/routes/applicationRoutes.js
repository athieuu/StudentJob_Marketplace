
const express = require("express");
const router = express.Router();

const {
    createApplication,
    getMyApplications,
    getApplicationsByJob,
    updateApplicationStatus
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

module.exports = router;
