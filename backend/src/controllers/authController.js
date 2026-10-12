const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
    findUserByEmail,
    createUser
} = require("../models/userModel");

// REGISTER: Đăng ký tài khoản
const register = async (req, res) => {
    try {
        const {
        email,
        password,
        role,
        ...profile
        } = req.body;

        // 1. Kiểm tra dữ liệu đầu vào
        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Vui lòng nhập email, password và role"
            });
        }

        // 2. Chỉ cho phép đăng ký Student hoặc Employer
        if (!["STUDENT", "EMPLOYER"].includes(role)) {
            return res.status(400).json({
                message: "Role không hợp lệ"
            });
        }
        // Kiểm tra thông tin hồ sơ bắt buộc
        if (role === "STUDENT" && !profile.full_name) {
            return res.status(400).json({
                message: "Vui lòng nhập full_name"
            });
        }

        if (role === "EMPLOYER" && !profile.company_name) {
            return res.status(400).json({
                message: "Vui lòng nhập company_name"
            });
        }

        // 3. Kiểm tra định dạng email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Email không hợp lệ"
            });
        }

        // 4. Kiểm tra độ dài mật khẩu
        if (password.length < 8) {
            return res.status(400).json({
                message: "Mật khẩu phải có ít nhất 8 ký tự"
            });
        }

        // 5. Kiểm tra email đã tồn tại
        const existingUser = await findUserByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                message: "Email đã được sử dụng"
            });
        }

        // 6. Mã hóa mật khẩu trước khi lưu database
        const hashedPassword = await bcrypt.hash(password, 10);

        // 7. Tạo user mới
        const userId = await createUser({
            email: email,
            password: hashedPassword,
            role: role,
            profile: profile
        });
        return res.status(201).json({
            message: "Đăng ký thành công",
            user: {
                id: userId,
                email,
                role
            }
        });

    } catch (error) {
        console.error("Register error:", error);

        // Phòng trường hợp hai request đăng ký cùng email
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email đã được sử dụng"
            });
        }

        return res.status(500).json({
            message: "Lỗi server khi đăng ký"
        });
    }
};


// LOGIN: Đăng nhập tài khoản
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Kiểm tra dữ liệu đầu vào
        if (!email || !password) {
            return res.status(400).json({
                message: "Vui lòng nhập email và password"
            });
        }

        // 2. Tìm tài khoản theo email
        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                message: "Email hoặc mật khẩu không chính xác"
            });
        }

        // 3. So sánh mật khẩu nhập vào với mật khẩu đã mã hóa
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Email hoặc mật khẩu không chính xác"
            });
        }

        // 4. Kiểm tra cấu hình JWT
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET chưa được cấu hình");

            return res.status(500).json({
                message: "Server chưa được cấu hình xác thực"
            });
        }

        // 5. Tạo JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        // 6. Trả kết quả đăng nhập
        return res.status(200).json({
            message: "Đăng nhập thành công",
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Lỗi server khi đăng nhập"
        });
    }
};

// Lấy thông tin user đang đăng nhập
const getMe = (req, res) => {
    return res.status(200).json({
        message: "Xác thực thành công",
        user: req.user
    });
};

module.exports = {
    register,
    login,
    getMe
};