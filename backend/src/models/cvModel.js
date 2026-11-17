
const pool = require("../config/db");

const CV_FIELDS = [
  "personal_info",
  "education",
  "experience",
  "skills",
  "projects",
  "certifications"
];

function serializeCV(data) {
  return CV_FIELDS.map(field =>
    JSON.stringify(data[field] ?? null)
  );
}

async function createCV(userId, data) {
  const [result] = await pool.execute(
    `INSERT INTO cvs
     (user_id, title, template, personal_info, education,
      experience, skills, projects, certifications)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.title,
      data.template || "modern",
      ...serializeCV(data)
    ]
  );

  return result.insertId;
}

async function getMyCVs(userId) {
  const [rows] = await pool.execute(
    "SELECT * FROM cvs WHERE user_id = ? ORDER BY updated_at DESC",
    [userId]
  );
  return rows;
}

async function getCVById(id, userId) {
  const [rows] = await pool.execute(
    "SELECT * FROM cvs WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return rows[0] || null;
}

async function updateCV(id, userId, data) {
  const [result] = await pool.execute(
    `UPDATE cvs SET
      title = ?, template = ?, personal_info = ?,
      education = ?, experience = ?, skills = ?,
      projects = ?, certifications = ?
     WHERE id = ? AND user_id = ?`,
    [
      data.title,
      data.template || "modern",
      ...serializeCV(data),
      id,
      userId
    ]
  );
  return result.affectedRows;
}

async function deleteCV(id, userId) {
  const [result] = await pool.execute(
    "DELETE FROM cvs WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return result.affectedRows;
}

module.exports = {
  createCV,
  getMyCVs,
  getCVById,
  updateCV,
  deleteCV
};
