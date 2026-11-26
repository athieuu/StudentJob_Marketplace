'use strict';

const pool = require('../config/db');

async function listReviews(req, res) {
  try {
    const jobId = req.query.jobId ? Number(req.query.jobId) : null;
    let query = `
      SELECT r.id, r.job_id, r.user_id, r.rating, r.comment, r.created_at,
             sp.full_name AS student_name
      FROM reviews r
      LEFT JOIN student_profiles sp ON sp.user_id = r.user_id
    `;
    const params = [];
    if (jobId && Number.isSafeInteger(jobId)) {
      query += ' WHERE r.job_id = ?';
      params.push(jobId);
    }
    query += ' ORDER BY r.created_at DESC';

    const [rows] = await pool.query(query, params);
    return res.json({ data: rows });
  } catch (error) {
    console.error('List reviews error:', error.message);
    return res.status(500).json({ message: 'Không thể tải danh sách đánh giá.' });
  }
}

async function createReview(req, res) {
  try {
    const jobId = Number(req.body?.job_id);
    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || '').trim();

    if (!Number.isSafeInteger(jobId) || jobId <= 0) {
      return res.status(400).json({ message: 'ID công việc không hợp lệ.' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Số sao đánh giá phải từ 1 đến 5.' });
    }
    if (comment.length < 10 || comment.length > 600) {
      return res.status(400).json({ message: 'Nội dung đánh giá phải từ 10 đến 600 ký tự.' });
    }

    const [spRows] = await pool.query(
      'SELECT id FROM student_profiles WHERE user_id = ?',
      [req.user.id]
    );
    if (!spRows.length) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ sinh viên.' });
    }
    const studentProfileId = spRows[0].id;

    const [appRows] = await pool.query(
      "SELECT id FROM applications WHERE job_id = ? AND student_id = ? AND status = 'ACCEPTED' LIMIT 1",
      [jobId, studentProfileId]
    );
    if (!appRows.length) {
      return res.status(403).json({
        message: 'Chỉ những sinh viên có đơn ứng tuyển đã được chấp nhận mới có thể đánh giá.',
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM reviews WHERE job_id = ? AND user_id = ?',
      [jobId, req.user.id]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'Bạn đã gửi đánh giá cho công việc này rồi.' });
    }

    const [result] = await pool.query(
      'INSERT INTO reviews (job_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [jobId, req.user.id, rating, comment]
    );

    const [createdRows] = await pool.query(
      'SELECT id, job_id, user_id, rating, comment, created_at FROM reviews WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Gửi đánh giá thành công.',
      data: createdRows[0],
    });
  } catch (error) {
    console.error('Create review error:', error.message);
    return res.status(500).json({ message: 'Không thể lưu đánh giá lúc này.' });
  }
}

module.exports = { listReviews, createReview };
