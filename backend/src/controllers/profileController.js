
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
            ? ["full_name", "phone", "university", "major", "bio"]
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

module.exports = { getProfile, editProfile };
