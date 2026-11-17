
const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  authenticateToken,
  authorizeRole
} = require("../middleware/authMiddleware");

const {
  parseCV
} = require("../controllers/cvParserController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },

  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    console.log("CV UPLOAD:", {
      filename: file.originalname,
      mimetype: file.mimetype,
      extension: ext
    });

    const allowedTypes = {
      ".pdf": [
        "application/pdf",
        "application/octet-stream"
      ],
      ".docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream"
      ]
    };

    if (
      allowedTypes[ext] &&
      allowedTypes[ext].includes(file.mimetype)
    ) {
      return cb(null, true);
    }

    return cb(
      new Error("Tệp không đúng định dạng PDF/DOCX")
    );
  }
});



function validateFileContent(req, res, next) {
  const file = req.file;

  if (!file || !file.buffer) {
    return res.status(400).json({
      message: "Vui lòng chọn file PDF hoặc DOCX."
    });
  }

  const ext = path.extname(file.originalname).toLowerCase();

  // Cho phép PDF có một số byte trước header.
  const header = file.buffer.subarray(0, 1024);

  const isPDF = header.includes(
    Buffer.from("%PDF-", "ascii")
  );

  // DOCX sử dụng định dạng ZIP.
  const isZIP =
    file.buffer.length >= 4 &&
    file.buffer[0] === 0x50 &&
    file.buffer[1] === 0x4b &&
    file.buffer[2] === 0x03 &&
    file.buffer[3] === 0x04;

  if (
    (ext === ".pdf" && !isPDF) ||
    (ext === ".docx" && !isZIP)
  ) {
    return res.status(400).json({
      message: "Nội dung file không khớp định dạng PDF/DOCX."
    });
  }

  next();
}



router.post(
  "/parse",
  authenticateToken,
  authorizeRole("STUDENT"),
  (req, res, next) => {
    upload.single("file")(req, res, error => {
      if (error) {
        console.error("CV upload error:", error.message);

        return res.status(400).json({
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "Tệp vượt quá 5 MB."
              : error.message || "Tệp tải lên không hợp lệ."
        });
      }

      next();
    });
  },
  validateFileContent,
  parseCV
);

module.exports = router;
