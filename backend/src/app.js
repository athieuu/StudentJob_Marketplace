const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const app = express();

const authRoutes = require("./routes/authRoutes");

const roleTestRoutes = require("./routes/roleTestRoutes");
const cvParserRoutes = require("./routes/cvParserRoutes");
const jobRoutes = require("./routes/jobRoutes");
const cvRoutes = require("./routes/cvRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoutes = require("./routes/chatRoutes");
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/test", roleTestRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/cvs", cvRoutes);
app.use("/api/cvs", cvParserRoutes);
app.get("/", (req, res) => {
    res.json({
        message: "StudentJob Marketplace API is running!"
    });
});

app.get("/api/health/db", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1 AS result");

        res.json({
            status: "OK",
            database: "Connected",
            result: rows[0].result
        });
    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            status: "ERROR",
            database: "Disconnected",
            message: error.message
        });
    }
});

module.exports = app;