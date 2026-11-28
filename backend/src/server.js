
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const setupChatSocket = require("./sockets/chatSocket");
const app = require("./app");

const PORT = process.env.PORT || 5000;

// Tạo HTTP Server dùng chung cho Express và Socket.IO
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

// Khởi tạo Socket.IO
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});
app.set("io", io);

// Kiểm tra kết nối realtime
// Khởi tạo hệ thống chat realtime có xác thực JWT
setupChatSocket(io);

// Khởi động HTTP Server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log("Socket.IO is ready");
});
