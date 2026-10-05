const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

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