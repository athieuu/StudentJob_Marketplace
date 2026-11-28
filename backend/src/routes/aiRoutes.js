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

// Bound the whole route, including upload parsing and history persistence. A stalled
// database write may still complete after this response; it cannot be cancelled here.
router.post('/cv/analyze', (req, res, next) => {
  const deadline = new AbortController();
  const timeoutMs = req.app.locals.cvAnalysisTimeoutMs || 50000;
  const timer = setTimeout(() => {
    deadline.abort();
    if (!res.headersSent) res.status(503).json({ message: 'Phân tích CV quá thời gian. Vui lòng thử lại.' });
  }, timeoutMs);
  req.cvAnalysisSignal = deadline.signal;
  res.once('close', () => { clearTimeout(timer); deadline.abort(); });
  res.once('finish', () => clearTimeout(timer));
  next();
}, upload.single('file'), aiController.analyzeCV);
router.get('/cv/history', aiController.getCvHistory);
router.delete('/cv/history/:id', aiController.deleteCvHistory);
router.post('/cv/feedback', aiController.feedbackCV);
router.post('/cv/assist', aiController.assistCV);
router.post('/jobs/:id/fit', aiController.assessJobFit);
router.get('/jobs/recommended', aiController.recommendJobs);

module.exports = router;
