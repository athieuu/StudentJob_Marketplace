
const pool = require("../config/db");

// 1. Tìm hoặc tạo cuộc trò chuyện
async function findOrCreateConversation(studentId, employerId) {
    const [result] = await pool.execute(
        `INSERT INTO conversations (student_id, employer_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [studentId, employerId]
    );

    return result.insertId;
}

// 2. Lấy danh sách cuộc trò chuyện theo người dùng
async function getConversationsByUser(userId, role) {
    let sql;

    if (role === "STUDENT") {
        sql = `
            SELECT
                c.*,
                ep.company_name AS display_name
            FROM conversations c
            JOIN student_profiles sp
                ON c.student_id = sp.id
            JOIN employer_profiles ep
                ON c.employer_id = ep.id
            WHERE sp.user_id = ?
            ORDER BY c.created_at DESC
        `;
    } else if (role === "EMPLOYER") {
        sql = `
            SELECT
                c.*,
                sp.full_name AS display_name
            FROM conversations c
            JOIN employer_profiles ep
                ON c.employer_id = ep.id
            JOIN student_profiles sp
                ON c.student_id = sp.id
            WHERE ep.user_id = ?
            ORDER BY c.created_at DESC
        `;
    } else {
        return [];
    }

    const [rows] = await pool.execute(sql, [userId]);
    return rows;
}

// 3. Lấy thông tin cuộc trò chuyện
async function getConversationById(conversationId) {
    const [rows] = await pool.execute(
        `SELECT * FROM conversations WHERE id = ?`,
        [conversationId]
    );

    return rows[0] || null;
}

// 4. Lưu tin nhắn
async function createMessage(conversationId, senderId, content) {
    const [result] = await pool.execute(
        `INSERT INTO messages
         (conversation_id, sender_id, content)
         VALUES (?, ?, ?)`,
        [conversationId, senderId, content]
    );

    const [rows] = await pool.execute(
        `SELECT * FROM messages WHERE id = ?`,
        [result.insertId]
    );

    return rows[0];
}

// 5. Lấy lịch sử tin nhắn
async function getMessagesByConversation(conversationId) {
    const [rows] = await pool.execute(
        `SELECT *
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC, id ASC`,
        [conversationId]
    );

    return rows;
}

module.exports = {
    findOrCreateConversation,
    getConversationsByUser,
    getConversationById,
    createMessage,
    getMessagesByConversation
};
