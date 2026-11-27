
const express = require("express");
const router = express.Router();

const { authenticateToken } =
    require("../middleware/authMiddleware");

const {
    getProfile,
    editProfile,
    changePassword
} = require("../controllers/profileController");

router.get("/", authenticateToken, getProfile);
router.put("/", authenticateToken, editProfile);
router.put("/password", authenticateToken, changePassword);

module.exports = router;
