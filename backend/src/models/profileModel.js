
const pool = require("../config/db");
const { resolveSkill, normalizeSkill } = require("../ai/skills");

const getProfileByUserId = async (userId) => {
    const [rows] = await pool.query(
        `SELECT
            u.id, u.email, u.role,
            s.id AS student_profile_id,
            s.full_name, s.phone AS student_phone,
            s.university, s.major, s.bio, s.cv_url,
            e.company_name, e.phone AS employer_phone,
            e.address, e.description
         FROM users u
         LEFT JOIN student_profiles s ON s.user_id = u.id
         LEFT JOIN employer_profiles e ON e.user_id = u.id
         WHERE u.id = ?`,
        [userId]
    );

    if (!rows.length) return null;

    const user = rows[0];
    let skills = [];
    if (user.role === "STUDENT" && user.student_profile_id) {
        const [skillRows] = await pool.query(
            `SELECT sk.name
             FROM student_skills ss
             INNER JOIN skills sk ON sk.id = ss.skill_id
             WHERE ss.student_id = ?
             ORDER BY ss.created_at ASC`,
            [user.student_profile_id]
        );
        skills = skillRows.map((r) => r.name);
    }

    return {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        company_name: user.company_name,
        phone: user.role === "STUDENT"
            ? user.student_phone
            : user.employer_phone,
        university: user.university,
        major: user.major,
        bio: user.bio,
        cv_url: user.cv_url || "",
        skills,
        address: user.address,
        description: user.description
    };
};

const syncStudentSkills = async (studentProfileId, skillsInput) => {
    if (!Array.isArray(skillsInput)) return;
    const cleaned = [...new Set(skillsInput.map((s) => String(s).trim()).filter(Boolean))].slice(0, 30);

    await pool.query("DELETE FROM student_skills WHERE student_id = ? AND source = 'manual'", [studentProfileId]);
    for (const rawName of cleaned) {
        const resolved = resolveSkill(rawName);
        const name = resolved ? resolved.name : rawName;
        const normalized = resolved ? resolved.normalized_name : normalizeSkill(rawName);
        if (!normalized) continue;

        await pool.query(
            "INSERT IGNORE INTO skills (name, normalized_name, category) VALUES (?, ?, ?)",
            [name.slice(0, 100), normalized.slice(0, 100), resolved?.category || null]
        );
        const [skillRows] = await pool.query("SELECT id FROM skills WHERE normalized_name = ?", [normalized.slice(0, 100)]);
        if (skillRows.length) {
            await pool.query(
                "INSERT IGNORE INTO student_skills (student_id, skill_id, source) VALUES (?, ?, 'manual')",
                [studentProfileId, skillRows[0].id]
            );
        }
    }
};

const updateProfile = async (userId, role, data) => {
    if (role === "STUDENT") {
        const [result] = await pool.query(
            `UPDATE student_profiles
             SET full_name = ?, phone = ?,
                 university = ?, major = ?, bio = ?, cv_url = ?
             WHERE user_id = ?`,
            [
                data.full_name,
                data.phone,
                data.university,
                data.major,
                data.bio,
                data.cv_url ?? null,
                userId
            ]
        );
        if (Array.isArray(data.skills)) {
            const [sp] = await pool.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
            if (sp.length) {
                await syncStudentSkills(sp[0].id, data.skills);
            }
        }
        return result.affectedRows;
    }

    if (role === "EMPLOYER") {
        const [result] = await pool.query(
            `UPDATE employer_profiles
             SET company_name = ?, phone = ?,
                 address = ?, description = ?
             WHERE user_id = ?`,
            [
                data.company_name,
                data.phone,
                data.address,
                data.description,
                userId
            ]
        );
        return result.affectedRows;
    }

    return 0;
};

module.exports = {
    getProfileByUserId,
    updateProfile
};
