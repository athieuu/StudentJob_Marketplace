const jwt = require("jsonwebtoken");

// Xác thực JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Kiểm tra header Authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Vui lòng đăng nhập để tiếp tục"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Lưu thông tin user để các API tiếp theo sử dụng
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Token không hợp lệ hoặc đã hết hạn"
        });
    }
};

// Phân quyền theo role
const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Vui lòng đăng nhập"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Bạn không có quyền thực hiện thao tác này"
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRole
};