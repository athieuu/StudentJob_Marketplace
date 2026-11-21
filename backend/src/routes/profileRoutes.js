
const express = require("express");
const router = express.Router();

const { authenticateToken } =
    require("../middleware/authMiddleware");

const {
    getProfile,
    editProfile
} = require("../controllers/profileController");

router.get("/", authenticateToken, getProfile);
router.put("/", authenticateToken, editProfile);

module.exports = router;
