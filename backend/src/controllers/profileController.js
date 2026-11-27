
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const {
    getProfileByUserId,
    updateProfile
} = require("../models/profileModel");

const getProfile = async (req, res) => {
    try {
        const profile = await getProfileByUserId(req.user.id);

        if (!profile) {
            return res.status(404).json({
                message: "Không tìm thấy hồ sơ"
            });
        }

        return res.json({ user: profile });
    } catch (error) {
        console.error("Get profile error:", error);
        return res.status(500).json({
            message: "Lỗi khi lấy hồ sơ"
        });
    }
};

const editProfile = async (req, res) => {
    try {
        const role = req.user.role;

        if (!["STUDENT", "EMPLOYER"].includes(role)) {
            return res.status(403).json({
                message: "Không có quyền chỉnh sửa hồ sơ"
            });
        }

        const current = await getProfileByUserId(req.user.id);

        if (!current) {
            return res.status(404).json({
                message: "Không tìm thấy hồ sơ"
            });
        }

        const allowedFields = role === "STUDENT"
            ? ["full_name", "phone", "university", "major", "bio", "cv_url"]
            : ["company_name", "phone", "address", "description"];

        const data = {};

        for (const field of allowedFields) {
            const value = req.body?.[field];

            if (value !== undefined &&
                value !== null &&
                typeof value !== "string") {
                return res.status(400).json({
                    message: `${field} phải là chuỗi`
                });
            }

            data[field] = value === undefined
                ? (current[field] ?? null)
                : (value === null ? null : value.trim());
        }

        if (role === "STUDENT" && req.body?.skills !== undefined) {
            if (Array.isArray(req.body.skills)) {
                data.skills = req.body.skills.map((s) => String(s).trim()).filter(Boolean);
            } else if (typeof req.body.skills === "string") {
                data.skills = req.body.skills.split(",").map((s) => s.trim()).filter(Boolean);
            } else {
                return res.status(400).json({ message: "skills phải là mảng hoặc chuỗi" });
            }
        }

        const requiredField = role === "STUDENT"
            ? "full_name"
            : "company_name";

        if (!data[requiredField]) {
            return res.status(400).json({
                message: `Không được để trống ${requiredField}`
            });
        }

        const affectedRows = await updateProfile(
            req.user.id,
            role,
            data
        );

        if (!affectedRows) {
            return res.status(404).json({
                message: "Không tìm thấy hồ sơ để cập nhật"
            });
        }

        const updated = await getProfileByUserId(req.user.id);

        return res.json({
            message: "Cập nhật hồ sơ thành công",
            user: updated
        });
    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({
            message: "Lỗi khi cập nhật hồ sơ"
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới"
            });
        }

        if (typeof newPassword !== "string" || newPassword.length < 8) {
            return res.status(400).json({
                message: "Mật khẩu mới phải có ít nhất 8 ký tự"
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                message: "Mật khẩu mới phải khác mật khẩu hiện tại"
            });
        }

        const [rows] = await db.execute(
            "SELECT id, password FROM users WHERE id = ? LIMIT 1",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy tài khoản"
            });
        }

        const matches = await bcrypt.compare(String(currentPassword), rows[0].password);
        if (!matches) {
            return res.status(400).json({
                message: "Mật khẩu hiện tại không chính xác"
            });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await db.execute(
            "UPDATE users SET password = ? WHERE id = ?",
            [newHash, req.user.id]
        );

        return res.status(200).json({
            message: "Đổi mật khẩu thành công"
        });
    } catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({
            message: "Không thể đổi mật khẩu lúc này"
        });
    }
};

module.exports = { getProfile, editProfile, changePassword };
