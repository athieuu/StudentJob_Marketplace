'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const aiController = require('../controllers/aiController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx') {
      return cb(null, true);
    }
    return cb(new Error('Chỉ hỗ trợ file PDF hoặc DOCX.'));
  },
});

router.use(authenticateToken);
router.use(authorizeRole('STUDENT'));

router.post('/cv/analyze', upload.single('file'), aiController.analyzeCV);
router.post('/cv/feedback', aiController.feedbackCV);
router.post('/cv/assist', aiController.assistCV);
router.post('/jobs/:id/fit', aiController.assessJobFit);
router.get('/jobs/recommended', aiController.recommendJobs);

module.exports = router;
