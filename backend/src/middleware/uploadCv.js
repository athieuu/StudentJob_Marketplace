
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "../../uploads/cvs");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, crypto.randomUUID() + ".pdf");
  }
});

const uploadCv = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype !== "application/pdf" ||
      path.extname(file.originalname).toLowerCase() !== ".pdf"
    ) {
      return cb(new Error("Chỉ chấp nhận file PDF"));
    }
    cb(null, true);
  }
});

module.exports = { uploadCv, uploadDir };
