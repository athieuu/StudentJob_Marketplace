const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { getPendingJobs, moderateJob } = require("../controllers/adminController");

router.use(authenticateToken, authorizeRole("ADMIN"));
router.get("/jobs/pending", getPendingJobs);
router.patch("/jobs/:id/moderation", moderateJob);

module.exports = router;
