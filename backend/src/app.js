const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const app = express();

const authRoutes = require("./routes/authRoutes");

const roleTestRoutes = require("./routes/roleTestRoutes");

const jobRoutes = require("./routes/jobRoutes");

const applicationRoutes = require("./routes/applicationRoutes");

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/test", roleTestRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

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