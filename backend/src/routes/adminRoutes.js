
const express = require("express");
const router = express.Router();

const {
    listAllApplications
} = require("../controllers/adminApplicationController");

const {
    authenticateToken,
    authorizeRole
} = require("../middleware/authMiddleware");

const {
    getPendingJobs,
    moderateJob
} = require("../controllers/adminController");

const {
    listUsers,
    createUser,
    updateUser,
    changeUserStatus,
    deleteUser
} = require("../controllers/adminUserController");

// Chỉ ADMIN được truy cập
router.use(authenticateToken, authorizeRole("ADMIN"));

// Quản lý tin tuyển dụng
router.get("/jobs/pending", getPendingJobs);
router.patch("/jobs/:id/moderation", moderateJob);

// Quản lý người dùng
router.get("/users", listUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.patch("/users/:id/status", changeUserStatus);
router.delete("/users/:id", deleteUser);
router.get("/applications", listAllApplications);
module.exports = router;
