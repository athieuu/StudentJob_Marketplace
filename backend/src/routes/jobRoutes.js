
const express = require("express");
const router = express.Router();

const {
    createJob,
    getAllJobs,
    getMyJobs,
    getJobById,
    updateJob,
    deleteJob
} = require("../controllers/jobController");

const {
    authenticateToken,
    authorizeRole
} = require("../middleware/authMiddleware");

router.get("/", getAllJobs);

router.get(
    "/mine",
    authenticateToken,
    authorizeRole("EMPLOYER"),
    getMyJobs
);

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

router.delete(
    "/:id",
    authenticateToken,
    authorizeRole("EMPLOYER"),
    deleteJob
);

module.exports = router;
