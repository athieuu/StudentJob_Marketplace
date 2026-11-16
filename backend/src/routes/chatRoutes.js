
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

const {
    authenticateToken,
    authorizeRole
} = require("../middleware/authMiddleware");

const {
    createConversation,
    getMyConversations,
    getConversationMessages,
    sendMessage
} = require("../controllers/chatController");

// Sinh viên tạo hoặc tìm cuộc trò chuyện
router.post(
    "/conversations",
    authenticateToken,
    authorizeRole("STUDENT"),
    createConversation
);


router.get(
    "/conversations",
    authenticateToken,
    authorizeRole("STUDENT", "EMPLOYER"),
    getMyConversations
);


router.get(
    "/conversations/:id/messages",
    authenticateToken,
    authorizeRole("STUDENT", "EMPLOYER"),
    getConversationMessages
);


router.post(
    "/conversations/:id/messages",
    authenticateToken,
    authorizeRole("STUDENT", "EMPLOYER"),
    sendMessage
);


module.exports = router;
