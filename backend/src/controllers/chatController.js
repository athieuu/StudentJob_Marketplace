
const pool = require("../config/db");
const chatModel = require("../models/chatModel");

// POST /api/chat/conversations
const createConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { employerId, studentId, studentUserId } = req.body || {};

        if (role === "STUDENT") {
            if (!Number.isSafeInteger(employerId) || employerId <= 0) {
                return res.status(400).json({
                    message: "employerId không hợp lệ"
                });
            }

            const [students] = await pool.execute(
                `SELECT id FROM student_profiles WHERE user_id = ?`,
                [userId]
            );
            if (students.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy hồ sơ sinh viên" });
            }

            const [employers] = await pool.execute(
                `SELECT id FROM employer_profiles WHERE id = ?`,
                [employerId]
            );
            if (employers.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy nhà tuyển dụng" });
            }

            const conversationId = await chatModel.findOrCreateConversation(
                students[0].id,
                employerId
            );

            return res.status(200).json({
                message: "Cuộc trò chuyện đã sẵn sàng",
                conversationId
            });
        }

        if (role === "EMPLOYER") {
            const [employers] = await pool.execute(
                `SELECT id FROM employer_profiles WHERE user_id = ?`,
                [userId]
            );
            if (employers.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy hồ sơ nhà tuyển dụng" });
            }

            let targetStudentProfileId = null;
            if (Number.isSafeInteger(studentUserId) && studentUserId > 0) {
                const [students] = await pool.execute(
                    `SELECT id FROM student_profiles WHERE user_id = ?`,
                    [studentUserId]
                );
                if (students.length > 0) targetStudentProfileId = students[0].id;
            } else if (Number.isSafeInteger(studentId) && studentId > 0) {
                const [students] = await pool.execute(
                    `SELECT id FROM student_profiles WHERE id = ?`,
                    [studentId]
                );
                if (students.length > 0) targetStudentProfileId = students[0].id;
            } else {
                return res.status(400).json({ message: "studentUserId hoặc studentId không hợp lệ" });
            }

            if (!targetStudentProfileId) {
                return res.status(404).json({ message: "Không tìm thấy hồ sơ sinh viên" });
            }

            const conversationId = await chatModel.findOrCreateConversation(
                targetStudentProfileId,
                employers[0].id
            );

            return res.status(200).json({
                message: "Cuộc trò chuyện đã sẵn sàng",
                conversationId
            });
        }

        return res.status(403).json({
            message: "Chỉ sinh viên hoặc nhà tuyển dụng mới được bắt đầu cuộc trò chuyện"
        });
    } catch (error) {
        console.error("Create conversation error:", error);

        return res.status(500).json({
            message: "Không thể tạo cuộc trò chuyện"
        });
    }
};




const getMyConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        if (role !== "STUDENT" && role !== "EMPLOYER") {
            return res.status(403).json({
                message: "Bạn không có quyền xem cuộc trò chuyện"
            });
        }

        const conversations =
            await chatModel.getConversationsByUser(userId, role);

        return res.status(200).json({
            message: "Lấy danh sách cuộc trò chuyện thành công",
            conversations
        });

    } catch (error) {
        console.error("Get conversations error:", error);

        return res.status(500).json({
            message: "Không thể lấy danh sách cuộc trò chuyện"
        });
    }
};


const getConversationMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const conversationId = Number(req.params.id);

        if (
            !Number.isSafeInteger(conversationId) ||
            conversationId <= 0
        ) {
            return res.status(400).json({
                message: "ID cuộc trò chuyện không hợp lệ"
            });
        }

        if (role !== "STUDENT" && role !== "EMPLOYER") {
            return res.status(403).json({
                message: "Bạn không có quyền xem tin nhắn"
            });
        }

        const conversation =
            await chatModel.getConversationById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                message: "Không tìm thấy cuộc trò chuyện"
            });
        }

        // Kiểm tra người dùng thuộc cuộc trò chuyện
        const profileId = role === "STUDENT"
            ? conversation.student_id
            : conversation.employer_id;

        const table = role === "STUDENT"
            ? "student_profiles"
            : "employer_profiles";

        const [profiles] = await pool.execute(
            `SELECT id FROM ${table}
             WHERE id = ? AND user_id = ?`,
            [profileId, userId]
        );

        if (profiles.length === 0) {
            return res.status(403).json({
                message: "Bạn không thuộc cuộc trò chuyện này"
            });
        }

        const messages =
            await chatModel.getMessagesByConversation(conversationId);

        return res.status(200).json({
            message: "Lấy lịch sử tin nhắn thành công",
            conversationId,
            messages
        });

    } catch (error) {
        console.error("Get messages error:", error);

        return res.status(500).json({
            message: "Không thể lấy lịch sử tin nhắn"
        });
    }
};


const sendMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const conversationId = Number(req.params.id);
        const { content } = req.body;

        // 1. Kiểm tra ID cuộc trò chuyện
        if (
            !Number.isSafeInteger(conversationId) ||
            conversationId <= 0
        ) {
            return res.status(400).json({
                message: "ID cuộc trò chuyện không hợp lệ"
            });
        }

        // 2. Kiểm tra nội dung tin nhắn
        if (
            typeof content !== "string" ||
            !content.trim() ||
            content.trim().length > 5000
        ) {
            return res.status(400).json({
                message: "Tin nhắn phải có từ 1 đến 5000 ký tự"
            });
        }

        // 3. Kiểm tra vai trò
        if (role !== "STUDENT" && role !== "EMPLOYER") {
            return res.status(403).json({
                message: "Bạn không có quyền gửi tin nhắn"
            });
        }

        // 4. Kiểm tra cuộc trò chuyện tồn tại
        const conversation =
            await chatModel.getConversationById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                message: "Không tìm thấy cuộc trò chuyện"
            });
        }

        // 5. Kiểm tra người gửi thuộc cuộc trò chuyện
        const profileId = role === "STUDENT"
            ? conversation.student_id
            : conversation.employer_id;

        const table = role === "STUDENT"
            ? "student_profiles"
            : "employer_profiles";

        const [profiles] = await pool.execute(
            `SELECT id FROM ${table}
             WHERE id = ? AND user_id = ?`,
            [profileId, userId]
        );

        if (profiles.length === 0) {
            return res.status(403).json({
                message: "Bạn không thuộc cuộc trò chuyện này"
            });
        }

        // 6. Lưu tin nhắn vào MySQL
        const newMessage = await chatModel.createMessage(
            conversationId,
            userId,
            content.trim()
        );

        return res.status(201).json({
            message: "Gửi tin nhắn thành công",
            data: newMessage
        });

    } catch (error) {
        console.error("Send message error:", error);

        return res.status(500).json({
            message: "Không thể gửi tin nhắn"
        });
    }
};


module.exports = {
    createConversation,
    getMyConversations,
    getConversationMessages,
    sendMessage
};