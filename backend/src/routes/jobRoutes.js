
const express = require("express");
const router = express.Router();

const {
    createJob,
    getAllJobs,
    getJobById,
    updateJob
} = require("../controllers/jobController");

const {
    authenticateToken,
    authorizeRole
} = require("../middleware/authMiddleware");

router.get("/", getAllJobs);
router.get("/:id", getJobById);

router.post(
    "/",
    authenticateToken,
    authorizeRole("EMPLOYER"),
    createJob
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRole("EMPLOYER"),
    updateJob
);

module.exports = router;
