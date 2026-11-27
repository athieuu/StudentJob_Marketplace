
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

function setupChatSocket(io) {

    // Xác thực JWT trước khi kết nối Socket.IO
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Thiếu token"));
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            if (
                !["STUDENT", "EMPLOYER"].includes(decoded.role) ||
                !Number.isSafeInteger(decoded.id)
            ) {
                return next(new Error("Không có quyền chat"));
            }

            const [rows] = await pool.execute(
                "SELECT role, status FROM users WHERE id = ? LIMIT 1",
                [decoded.id]
            );
            if (!rows[0] || rows[0].status !== "ACTIVE" || rows[0].role !== decoded.role) {
                return next(new Error("Phiên đăng nhập không còn hợp lệ"));
            }
            socket.user = decoded;
            next();

        } catch (error) {
            next(new Error("Token không hợp lệ"));
        }
    });

    io.on("connection", (socket) => {
        socket.join(`user:${socket.user.id}`);
        socket.use(async (_packet, next) => {
            try {
                const [rows] = await pool.execute(
                    "SELECT role, status FROM users WHERE id = ? LIMIT 1",
                    [socket.user.id]
                );
                if (!rows[0] || rows[0].status !== "ACTIVE" || rows[0].role !== socket.user.role) {
                    socket.disconnect(true);
                    return next(new Error("Phiên đăng nhập không còn hợp lệ"));
                }
                return next();
            } catch (_) {
                socket.disconnect(true);
                return next(new Error("Không thể xác thực lúc này"));
            }
        });
        console.log("Chat connected:", socket.user.id);

        // Tham gia phòng trò chuyện
        socket.on("join_conversation", async (conversationId) => {
            try {
                const id = Number(conversationId);

                if (!Number.isSafeInteger(id) || id <= 0) {
                    return;
                }

                const role = socket.user.role;
                const userId = socket.user.id;

                const table = role === "STUDENT"
                    ? "student_profiles"
                    : "employer_profiles";

                const column = role === "STUDENT"
                    ? "student_id"
                    : "employer_id";

                // Chỉ cho phép người thuộc cuộc trò chuyện tham gia
                const [rows] = await pool.execute(
                    `SELECT c.id
                     FROM conversations c
                     JOIN ${table} p ON c.${column} = p.id
                     WHERE c.id = ? AND p.user_id = ?`,
                    [id, userId]
                );

                if (rows.length === 0) {
                    socket.emit("chat_error", {
                        message: "Không có quyền tham gia"
                    });
                    return;
                }

                socket.join(`conversation_${id}`);

                socket.emit("joined_conversation", {
                    conversationId: id
                });

            } catch (error) {
                console.error("Join conversation error:", error);
                socket.emit("chat_error", {
                    message: "Không thể tham gia cuộc trò chuyện"
                });
            }
        });
        // Gửi tin nhắn realtime
        socket.on("send_message", async (data, ack) => {
            const respond = (result) => {
                if (typeof ack === "function") ack(result);
            };

            try {
                const conversationId = Number(data?.conversationId);
                const content = data?.content;

                if (
                    !Number.isSafeInteger(conversationId) ||
                    conversationId <= 0 ||
                    typeof content !== "string" ||
                    !content.trim() ||
                    content.trim().length > 5000
                ) {
                    respond({
                        success: false,
                        message: "Dữ liệu tin nhắn không hợp lệ"
                    });
                    return;
                }

                const role = socket.user.role;
                const userId = socket.user.id;

                const table = role === "STUDENT"
                    ? "student_profiles"
                    : "employer_profiles";

                const column = role === "STUDENT"
                    ? "student_id"
                    : "employer_id";

                // Kiểm tra quyền gửi tin nhắn
                const [rows] = await pool.execute(
                    `SELECT c.id
                     FROM conversations c
                     JOIN ${table} p ON c.${column} = p.id
                     WHERE c.id = ? AND p.user_id = ?`,
                    [conversationId, userId]
                );

                if (rows.length === 0) {
                    respond({
                        success: false,
                        message: "Bạn không thuộc cuộc trò chuyện này"
                    });
                    return;
                }

                // Lưu tin nhắn vào MySQL
                const [result] = await pool.execute(
                    `INSERT INTO messages
                     (conversation_id, sender_id, content)
                     VALUES (?, ?, ?)`,
                    [conversationId, userId, content.trim()]
                );

                // Lấy lại tin nhắn vừa lưu
                const [messages] = await pool.execute(
                    `SELECT id, conversation_id, sender_id,
                            content, created_at
                     FROM messages
                     WHERE id = ?`,
                    [result.insertId]
                );

                const message = messages[0];

                // Phát đến các thành viên đang ở trong phòng
                io.to(`conversation_${conversationId}`).emit(
                    "receive_message",
                    message
                );

                respond({
                    success: true,
                    message
                });

            } catch (error) {
                console.error("Send message error:", error);

                respond({
                    success: false,
                    message: "Không thể gửi tin nhắn"
                });
            }
        });
        socket.on("disconnect", () => {
            console.log("Chat disconnected:", socket.user.id);
        });
    });
}

        

module.exports = setupChatSocket;
