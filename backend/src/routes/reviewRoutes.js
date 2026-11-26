'use strict';

const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const { listReviews, createReview } = require('../controllers/reviewController');

const router = express.Router();

router.get('/', listReviews);
router.post('/', authenticateToken, authorizeRole('STUDENT'), createReview);

module.exports = router;
