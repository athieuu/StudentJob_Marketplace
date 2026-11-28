const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Xác thực JWT token
const authenticateToken = async (req, res, next) => {
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

        const [rows] = await db.execute(
            "SELECT id, email, role, status FROM users WHERE id = ? LIMIT 1",
            [decoded.id]
        );
        const user = rows[0];
        if (!user || user.status !== "ACTIVE" || user.role !== decoded.role) {
            return res.status(401).json({ message: "Phiên đăng nhập không còn hợp lệ" });
        }
        req.user = { ...decoded, email: user.email, role: user.role };
        return next();
    } catch (error) {
        if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError" && error.name !== "NotBeforeError") {
            return res.status(503).json({ message: "Không thể xác thực lúc này" });
        }
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
