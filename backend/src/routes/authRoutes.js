const express = require("express");
const router = express.Router();
const {
    register, requestRegistrationOtp, verifyRegistrationOtp, login, getMe
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/register/request-otp", requestRegistrationOtp);
router.post("/register/verify-otp", verifyRegistrationOtp);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);

module.exports = router;
