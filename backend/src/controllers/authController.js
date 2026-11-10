const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { findUserByEmail, createUser } = require("../models/userModel");
const verificationModel = require("../models/verificationModel");
const { sendOtpEmail } = require("../services/emailService");

const validateRegistration = ({ email, password, role, profile }) => {
    if (!email || !password || !role) return "Vui lòng nhập email, password và role";
    if (!["STUDENT", "EMPLOYER"].includes(role)) return "Role không hợp lệ";
    if (role === "STUDENT" && !profile.full_name) return "Vui lòng nhập full_name";
    if (role === "EMPLOYER" && !profile.company_name) return "Vui lòng nhập company_name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email không hợp lệ";
    if (typeof password !== "string" || password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
    return null;
};

const requestRegistrationOtp = async (req, res) => {
    try {
        const { email, password, role, ...profile } = req.body || {};
        const validation = validateRegistration({ email, password, role, profile });
        if (validation) return res.status(400).json({ message: validation });

        const normalizedEmail = email.trim().toLowerCase();
        if (await findUserByEmail(normalizedEmail)) {
            return res.status(409).json({ message: "Email đã được sử dụng" });
        }

        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const passwordHash = await bcrypt.hash(password, 10);
        await verificationModel.saveOtp(
            normalizedEmail, otpHash, expiresAt,
            { email: normalizedEmail, passwordHash, role, profile }
        );
        await sendOtpEmail(normalizedEmail, otp);

        return res.status(200).json({ message: "Đã gửi OTP đến email. OTP có hiệu lực 5 phút." });
    } catch (error) {
        console.error("Request registration OTP error:", error);
        return res.status(500).json({ message: "Không thể gửi OTP. Kiểm tra cấu hình SMTP." });
    }
};

const verifyRegistrationOtp = async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const otp = String(req.body?.otp || "").trim();
        if (!email || !/^\d{6}$/.test(otp)) {
            return res.status(400).json({ message: "Vui lòng nhập email và OTP 6 chữ số" });
        }

        const record = await verificationModel.getOtp(email);
        if (!record) return res.status(400).json({ message: "OTP không tồn tại hoặc đã hết hạn" });
        if (record.verified_at) return res.status(400).json({ message: "OTP đã được xác minh" });
        if (new Date(record.expires_at).getTime() < Date.now()) {
            await verificationModel.deleteOtp(email);
            return res.status(400).json({ message: "OTP đã hết hạn. Vui lòng yêu cầu mã mới." });
        }
        if (Number(record.attempts) >= 5) {
            await verificationModel.deleteOtp(email);
            return res.status(429).json({ message: "Bạn đã nhập sai OTP quá số lần cho phép. Hãy yêu cầu mã mới." });
        }

        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
        if (otpHash !== record.otp_hash) {
            await verificationModel.incrementAttempts(email);
            return res.status(400).json({ message: "OTP không chính xác" });
        }

        const payload =
        typeof record.registration_payload === "string"
            ? JSON.parse(record.registration_payload)
            : record.registration_payload;

        const userId = await createUser({
            email: payload.email, password: payload.passwordHash,
            role: payload.role, profile: payload.profile
        });
        await verificationModel.deleteOtp(email);

        return res.status(201).json({
            message: "Xác minh email và đăng ký thành công",
            user: { id: userId, email: payload.email, role: payload.role }
        });
    } catch (error) {
        console.error("Verify registration OTP error:", error);
        if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Email đã được sử dụng" });
        return res.status(500).json({ message: "Lỗi server khi xác minh đăng ký" });
    }
};

// Đăng ký trực tiếp đã được thay thành yêu cầu OTP trước
const register = async (req, res) => res.status(400).json({
    message: "Đăng ký cần xác minh OTP. Gọi POST /api/auth/register/request-otp trước."
});

const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ message: "Vui lòng nhập email và password" });
        const user = await findUserByEmail(String(email).trim().toLowerCase());
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác" });
        }
        if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Server chưa được cấu hình xác thực" });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
        return res.status(200).json({
            message: "Đăng nhập thành công", token,
            user: { id: user.id, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Lỗi server khi đăng nhập" });
    }
};

const getMe = (req, res) => res.status(200).json({ message: "Xác thực thành công", user: req.user });

module.exports = { register, requestRegistrationOtp, verifyRegistrationOtp, login, getMe };
