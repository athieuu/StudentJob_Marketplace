const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { getAllUsers, getAdminUserById } = require("../models/adminUserModel");

const VALID_ROLES = ["STUDENT", "EMPLOYER", "ADMIN"];
const VALID_STATUSES = ["ACTIVE", "BLOCKED"];

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

// 2. Tạo tài khoản mới
const createUser = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const {
            email,
            password,
            role = "STUDENT",
            status = "ACTIVE",
            name = "",
            company_name = "",
            phone = "",
            university = "",
            major = "",
            address = ""
        } = req.body || {};

        const cleanEmail = String(email || "").trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes("@")) {
            return res.status(400).json({ message: "Email không hợp lệ" });
        }

        if (!password || String(password).length < 6) {
            return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
        }

        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({ message: "Vai trò không hợp lệ" });
        }

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
        }
        const safeStatus = status;
        const passwordHash = await bcrypt.hash(String(password), 10);

        await conn.beginTransaction();

        const [existing] = await conn.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [cleanEmail]
        );
        if (existing.length > 0) {
            await conn.rollback();
            return res.status(409).json({ message: "Email đã tồn tại trong hệ thống" });
        }

        const [insertRes] = await conn.execute(
            "INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, ?)",
            [cleanEmail, passwordHash, role, safeStatus]
        );
        const newUserId = insertRes.insertId;

        if (role === "STUDENT") {
            const fullName = String(name || "").trim() || cleanEmail.split("@")[0];
            await conn.execute(
                `INSERT INTO student_profiles (user_id, full_name, phone, university, major)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    newUserId,
                    fullName,
                    String(phone || "").trim(),
                    String(university || "").trim(),
                    String(major || "").trim()
                ]
            );
        } else if (role === "EMPLOYER") {
            const compName = String(company_name || name || "").trim() || cleanEmail.split("@")[0];
            await conn.execute(
                `INSERT INTO employer_profiles (user_id, company_name, phone, address)
                 VALUES (?, ?, ?, ?)`,
                [
                    newUserId,
                    compName,
                    String(phone || "").trim(),
                    String(address || "").trim()
                ]
            );
        }

        await conn.commit();
        const created = await getAdminUserById(newUserId);

        return res.status(201).json({
            message: "Tạo tài khoản thành công",
            data: created
        });
    } catch (error) {
        await conn.rollback().catch(() => {});
        console.error("Admin create user error:", error);
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Email đã tồn tại trong hệ thống" });
        }
        return res.status(500).json({ message: "Không thể tạo tài khoản mới" });
    } finally {
        conn.release();
    }
};

// 3. Cập nhật thông tin tài khoản
const updateUser = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const userId = Number(req.params.id);
        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ" });
        }

        const {
            email,
            password,
            role,
            status,
            name,
            company_name,
            phone,
            university,
            major,
            address
        } = req.body || {};

        await conn.beginTransaction();

        const [activeAdmins] = await conn.execute(
            "SELECT id FROM users WHERE role = ? AND status = ? FOR UPDATE",
            ["ADMIN", "ACTIVE"]
        );
        const [rows] = await conn.execute(
            "SELECT id, email, role, status FROM users WHERE id = ? LIMIT 1",
            [userId]
        );
        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        const existingUser = rows[0];
        const nextEmail = email !== undefined ? String(email).trim().toLowerCase() : existingUser.email;
        if (!nextEmail || !nextEmail.includes("@")) {
            await conn.rollback();
            return res.status(400).json({ message: "Email không hợp lệ" });
        }

        if ((role !== undefined && !VALID_ROLES.includes(role)) ||
            (status !== undefined && !VALID_STATUSES.includes(status))) {
            await conn.rollback();
            return res.status(400).json({ message: "Vai trò hoặc trạng thái không hợp lệ" });
        }
        const nextRole = role === undefined ? existingUser.role : role;
        if (userId === Number(req.user.id) && nextRole !== existingUser.role) {
            await conn.rollback();
            return res.status(403).json({ message: "Không thể tự thay đổi vai trò của chính mình" });
        }
        if (existingUser.role === "ADMIN" && existingUser.status === "ACTIVE" && nextRole !== "ADMIN" && activeAdmins.length <= 1) {
            await conn.rollback();
            return res.status(409).json({ message: "Phải giữ ít nhất một quản trị viên đang hoạt động" });
        }

        const nextStatus = status && VALID_STATUSES.includes(status) ? status : existingUser.status || "ACTIVE";
        if (existingUser.role === "ADMIN" && nextStatus === "BLOCKED") {
            await conn.rollback();
            return res.status(403).json({ message: "Không thể khóa tài khoản ADMIN" });
        }

        if (nextEmail !== existingUser.email) {
            const [dup] = await conn.execute(
                "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
                [nextEmail, userId]
            );
            if (dup.length > 0) {
                await conn.rollback();
                return res.status(409).json({ message: "Email này đã được tài khoản khác sử dụng" });
            }
        }

        if (password && String(password).trim().length > 0) {
            if (String(password).length < 6) {
                await conn.rollback();
                return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
            }
            const passwordHash = await bcrypt.hash(String(password), 10);
            await conn.execute(
                "UPDATE users SET email = ?, password = ?, role = ?, status = ? WHERE id = ?",
                [nextEmail, passwordHash, nextRole, nextStatus, userId]
            );
        } else {
            await conn.execute(
                "UPDATE users SET email = ?, role = ?, status = ? WHERE id = ?",
                [nextEmail, nextRole, nextStatus, userId]
            );
        }

        if (nextRole === "STUDENT") {
            const [spRows] = await conn.execute(
                "SELECT id, full_name, phone, university, major FROM student_profiles WHERE user_id = ? LIMIT 1",
                [userId]
            );
            const cur = spRows[0] || {};
            const fullName = name !== undefined ? String(name).trim() : (cur.full_name || nextEmail.split("@")[0]);
            const nextPhone = phone !== undefined ? String(phone).trim() : (cur.phone || "");
            const nextUni = university !== undefined ? String(university).trim() : (cur.university || "");
            const nextMajor = major !== undefined ? String(major).trim() : (cur.major || "");

            if (spRows.length > 0) {
                await conn.execute(
                    "UPDATE student_profiles SET full_name = ?, phone = ?, university = ?, major = ? WHERE user_id = ?",
                    [fullName, nextPhone, nextUni, nextMajor, userId]
                );
            } else {
                await conn.execute(
                    "INSERT INTO student_profiles (user_id, full_name, phone, university, major) VALUES (?, ?, ?, ?, ?)",
                    [userId, fullName, nextPhone, nextUni, nextMajor]
                );
            }
        } else if (nextRole === "EMPLOYER") {
            const [epRows] = await conn.execute(
                "SELECT id, company_name, phone, address FROM employer_profiles WHERE user_id = ? LIMIT 1",
                [userId]
            );
            const cur = epRows[0] || {};
            const compName = company_name !== undefined
                ? String(company_name).trim()
                : name !== undefined
                    ? String(name).trim()
                    : (cur.company_name || nextEmail.split("@")[0]);
            const nextPhone = phone !== undefined ? String(phone).trim() : (cur.phone || "");
            const nextAddress = address !== undefined ? String(address).trim() : (cur.address || "");

            if (epRows.length > 0) {
                await conn.execute(
                    "UPDATE employer_profiles SET company_name = ?, phone = ?, address = ? WHERE user_id = ?",
                    [compName, nextPhone, nextAddress, userId]
                );
            } else {
                await conn.execute(
                    "INSERT INTO employer_profiles (user_id, company_name, phone, address) VALUES (?, ?, ?, ?)",
                    [userId, compName, nextPhone, nextAddress]
                );
            }
        }

        await conn.commit();
        const updated = await getAdminUserById(userId);

        if (nextRole !== existingUser.role || nextStatus !== existingUser.status) {
            req.app.get("io")?.in(`user:${userId}`).disconnectSockets(true);
        }

        return res.status(200).json({
            message: "Cập nhật tài khoản thành công",
            data: updated
        });
    } catch (error) {
        await conn.rollback().catch(() => {});
        console.error("Admin update user error:", error);
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Email này đã được tài khoản khác sử dụng" });
        }
        return res.status(500).json({ message: "Không thể cập nhật thông tin tài khoản" });
    } finally {
        conn.release();
    }
};

// 4. Khóa hoặc mở khóa tài khoản
const changeUserStatus = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { status } = req.body || {};

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ" });
        }

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
        }

        if (userId === Number(req.user.id)) {
            return res.status(403).json({ message: "Không thể thay đổi tài khoản của chính mình" });
        }

        const [rows] = await db.execute(
            "SELECT id, role FROM users WHERE id = ?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        if (rows[0].role === "ADMIN") {
            return res.status(403).json({ message: "Không thể khóa hoặc mở khóa tài khoản ADMIN" });
        }

        const [result] = await db.execute(
            `UPDATE users
             SET status = ?
             WHERE id = ?
             AND role IN ('STUDENT', 'EMPLOYER')`,
            [status, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({ message: "Không thể cập nhật trạng thái" });
        }

        req.app.get("io")?.in(`user:${userId}`).disconnectSockets(true);

        return res.status(200).json({
            message: status === "BLOCKED"
                ? "Đã khóa tài khoản thành công"
                : "Đã mở khóa tài khoản thành công",
            data: { id: userId, status }
        });
    } catch (error) {
        console.error("Change user status error:", error);
        return res.status(500).json({ message: "Lỗi khi cập nhật trạng thái tài khoản" });
    }
};

// 5. Xóa tài khoản
const deleteUser = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const userId = Number(req.params.id);
        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ" });
        }

        if (userId === Number(req.user.id)) {
            return res.status(403).json({ message: "Không thể tự xóa tài khoản của chính mình" });
        }

        await conn.beginTransaction();

        const [rows] = await conn.execute(
            "SELECT id, role FROM users WHERE id = ? LIMIT 1 FOR UPDATE",
            [userId]
        );
        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        if (rows[0].role === "ADMIN") {
            await conn.rollback();
            return res.status(403).json({ message: "Không thể xóa tài khoản ADMIN" });
        }

        // Lock profile parents too, so concurrent foreign-key inserts wait for deletion.
        await conn.execute("SELECT id FROM student_profiles WHERE user_id = ? FOR UPDATE", [userId]);
        await conn.execute("SELECT id FROM employer_profiles WHERE user_id = ? FOR UPDATE", [userId]);
        // Reject deletion when cascades could remove marketplace or conversation data.
        const [[linked]] = await conn.execute(
            `SELECT
               EXISTS(SELECT 1 FROM cvs WHERE user_id = ?) OR
               EXISTS(SELECT 1 FROM cv_parse_results WHERE user_id = ?) OR
               EXISTS(SELECT 1 FROM messages WHERE sender_id = ?) OR
               EXISTS(SELECT 1 FROM reviews WHERE user_id = ?) OR
               EXISTS(SELECT 1 FROM student_profiles s JOIN applications a ON a.student_id = s.id WHERE s.user_id = ?) OR
               EXISTS(SELECT 1 FROM student_profiles s JOIN conversations c ON c.student_id = s.id WHERE s.user_id = ?) OR
               EXISTS(SELECT 1 FROM student_profiles s JOIN student_skills k ON k.student_id = s.id WHERE s.user_id = ?) OR
               EXISTS(SELECT 1 FROM student_profiles s JOIN job_match_scores j ON j.student_id = s.id WHERE s.user_id = ?) OR
               EXISTS(SELECT 1 FROM employer_profiles e JOIN jobs j ON j.employer_id = e.id WHERE e.user_id = ?) OR
               EXISTS(SELECT 1 FROM employer_profiles e JOIN conversations c ON c.employer_id = e.id WHERE e.user_id = ?) AS has_data`,
            Array(10).fill(userId)
        );
        if (linked.has_data) {
            await conn.rollback();
            return res.status(409).json({ message: "Không thể xóa tài khoản đang có dữ liệu liên quan" });
        }

        await conn.execute("DELETE FROM student_profiles WHERE user_id = ?", [userId]);
        await conn.execute("DELETE FROM employer_profiles WHERE user_id = ?", [userId]);
        await conn.execute("DELETE FROM users WHERE id = ?", [userId]);

        await conn.commit();
        req.app.get("io")?.in(`user:${userId}`).disconnectSockets(true);
        return res.status(200).json({
            message: "Đã xóa tài khoản thành công",
            data: { id: userId }
        });
    } catch (error) {
        await conn.rollback().catch(() => {});
        console.error("Admin delete user error:", error);
        return res.status(500).json({
            message: "Không thể xóa tài khoản vì tài khoản đang có dữ liệu liên quan"
        });
    } finally {
        conn.release();
    }
};

module.exports = {
    listUsers,
    createUser,
    updateUser,
    changeUserStatus,
    deleteUser
};
