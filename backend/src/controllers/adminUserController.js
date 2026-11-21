
const db = require("../config/db");

const getAllUsers = require("../models/adminUserModel")
    .getAllUsers;

// 1. Lấy danh sách người dùng
const listUsers = async (req, res) => {
    try {
        const users = await getAllUsers();

        return res.status(200).json({
            message: "Lấy danh sách người dùng thành công",
            data: users
        });
    } catch (error) {
        console.error("Admin list users error:", error);

        return res.status(500).json({
            message: "Không thể lấy danh sách người dùng"
        });
    }
};

// 2. Khóa hoặc mở khóa tài khoản
const changeUserStatus = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { status } = req.body || {};

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({
                message: "ID người dùng không hợp lệ"
            });
        }

        if (!["ACTIVE", "BLOCKED"].includes(status)) {
            return res.status(400).json({
                message: "Trạng thái không hợp lệ"
            });
        }

        if (userId === Number(req.user.id)) {
            return res.status(403).json({
                message: "Không thể thay đổi tài khoản của chính mình"
            });
        }

        const [rows] = await db.execute(
            "SELECT id, role FROM users WHERE id = ?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng"
            });
        }

        if (rows[0].role === "ADMIN") {
            return res.status(403).json({
                message: "Không thể khóa hoặc mở khóa tài khoản ADMIN"
            });
        }

        const [result] = await db.execute(
            `UPDATE users
             SET status = ?
             WHERE id = ?
             AND role IN ('STUDENT', 'EMPLOYER')`,
            [status, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({
                message: "Không thể cập nhật trạng thái"
            });
        }

        return res.status(200).json({
            message: status === "BLOCKED"
                ? "Đã khóa tài khoản thành công"
                : "Đã mở khóa tài khoản thành công",
            data: {
                id: userId,
                status
            }
        });

    } catch (error) {
        console.error("Change user status error:", error);

        return res.status(500).json({
            message: "Lỗi khi cập nhật trạng thái tài khoản"
        });
    }
};

module.exports = {
    listUsers,
    changeUserStatus
};
