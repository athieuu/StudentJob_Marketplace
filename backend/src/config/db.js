const mysql = require("mysql2/promise");
require("dotenv").config();

const useSsl = String(process.env.DB_SSL || "").toLowerCase() === "true";

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(useSsl
        ? {
              ssl: {
                  rejectUnauthorized:
                      String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true"
              }
          }
        : {}),

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    // Giữ nguyên định dạng DATE từ MySQL, tránh lệch ngày do timezone.
    dateStrings: ["DATE"]
});

module.exports = pool;