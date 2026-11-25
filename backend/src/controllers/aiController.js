'use strict';

const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');
const { wrapData } = require('../ai/prompts');
const { isConfigured, runStructuredPrompt } = require('../ai/llm');
const {
  detectInjection,
  groundCvExtract,
  checkRerankIds,
  checkBulletsCount,
  hasNewNumbers,
} = require('../ai/checks');
const { ruleScore, combineScores } = require('../ai/scoring/ruleScore');
const { skills: TAXONOMY_SKILLS, resolveSkill, normalizeSkill } = require('../ai/skills');
const jobModel = require('../models/jobModel');
const cvModel = require('../models/cvModel');
const profileModel = require('../models/profileModel');

function parseJsonField(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

function normalizeDbCV(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || 'CV của tôi',
    template: row.template || 'modern',
    personal_info: parseJsonField(row.personal_info, {}),
    education: parseJsonField(row.education, []),
    experience: parseJsonField(row.experience, []),
    skills: parseJsonField(row.skills, []),
    projects: parseJsonField(row.projects, []),
    certifications: parseJsonField(row.certifications, []),
  };
}

function extractContactAndStripPII(rawText) {
  const lines = rawText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = rawText.match(/(?:\+84|0)(?:[\s.\-]?\d){9,10}/)?.[0]?.replace(/[\s.\-]/g, '') || '';
  const heading = /^(?:curriculum vitae|resume|cv|hồ sơ xin việc|sơ yếu lý lịch)$/i;
  const full_name =
    lines.find(
      (x) =>
        x.length <= 65 &&
        !heading.test(x) &&
        !x.includes('@') &&
        !/\d{4}/.test(x) &&
        !/^(email|phone|điện thoại|số điện thoại|địa chỉ|address|contact)\b/i.test(x)
    ) || '';
  const address =
    lines
      .find((x) => /^(?:địa chỉ|address|location)\s*[:：]/i.test(x))
      ?.replace(/^[^:：]+[:：]\s*/, '') || '';

  // Strip email and phone before sending text to LLM per privacy rule
  let anonymized = rawText;
  if (email) anonymized = anonymized.replaceAll(email, '[EMAIL]');
  if (phone) anonymized = anonymized.replaceAll(phone, '[PHONE]');

  return { contact: { full_name, email, phone, address }, anonymized };
}

function extractSkillsFromText(text) {
  const norm = ` ${normalizeSkill(text || '')} `;
  const found = [];
  const seen = new Set();
  for (const s of TAXONOMY_SKILLS) {
    const terms = [s.name, ...(s.aliases || [])];
    const hit = terms.some((t) => {
      const n = normalizeSkill(t);
      return n.length >= 2 && norm.includes(` ${n} `);
    });
    if (hit && !seen.has(s.normalized_name)) {
      seen.add(s.normalized_name);
      found.push(s);
    }
  }
  return found;
}

function mapExtractedToBuilderPayload(extracted, contact) {
  return {
    title: contact.full_name ? `CV ${contact.full_name}` : 'CV phân tích bằng AI',
    template: 'modern',
    personal_info: {
      full_name: contact.full_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      summary: extracted.summary || '',
    },
    education: (extracted.education || []).map((ed) => ({
      school: ed.school || '',
      major: [ed.degree, ed.field].filter(Boolean).join(' - '),
      start_year: ed.startDate || '',
      end_year: ed.endDate || '',
    })),
    experience: (extracted.experience || []).map((ex) => ({
      company: ex.company || '',
      position: ex.title || '',
      start_date: ex.startDate || '',
      end_date: ex.isCurrent ? 'Hiện tại' : ex.endDate || '',
      description: Array.isArray(ex.bullets) ? ex.bullets.join('\n') : '',
    })),
    skills: (extracted.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean),
    projects: (extracted.projects || []).map((p) => ({
      name: p.name || '',
      description: p.description || '',
      technologies: Array.isArray(p.technologies) ? p.technologies : [],
    })),
    certifications: (extracted.certifications || []).map((c) => ({
      name: c.name || '',
      issuer: c.issuer || '',
      year: c.date || '',
    })),
  };
}

function toCompactCvJson(cv) {
  if (!cv) return {};
  return {
    summary: cv.personal_info?.summary || null,
    education: cv.education || [],
    experience: cv.experience || [],
    skills: cv.skills || [],
    projects: cv.projects || [],
    certifications: cv.certifications || [],
  };
}

async function readCvFileText(file) {
  const isPdf =
    file.mimetype === 'application/pdf' ||
    file.buffer.subarray(0, 5).toString() === '%PDF-';
  const isDocx =
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.buffer.subarray(0, 2).toString() === 'PK';

  if (!isPdf && !isDocx) {
    throw new Error('Tệp không đúng định dạng PDF/DOCX.');
  }

  if (isPdf) {
    const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
    try {
      const result = await parser.getText();
      return result.text || '';
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  const result = await mammoth.extractRawText({ buffer: file.buffer });
  return result.value || '';
}

/**
 * POST /api/ai/cv/analyze
 * Upload PDF/DOCX -> extract raw text -> AI cv_extract + groundCvExtract + AI cv_feedback
 */
async function analyzeCV(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Vui lòng chọn file PDF hoặc DOCX.' });
  }

  try {
    const rawText = await readCvFileText(req.file);
    if (!rawText.trim()) {
      return res.status(422).json({ message: 'Không đọc được văn bản từ file. PDF dạng ảnh cần OCR.' });
    }

    const { contact, anonymized } = extractContactAndStripPII(rawText);
    const injectionFlag = detectInjection(rawText);

    if (!isConfigured()) {
      const fallbackSkills = extractSkillsFromText(rawText).map((s) => s.name);
      return res.json({
        message: 'Đã trích xuất cơ bản (AI chưa được cấu hình).',
        aiUsed: false,
        data: {
          title: contact.full_name ? `CV ${contact.full_name}` : 'CV nhập từ tệp',
          template: 'modern',
          personal_info: { ...contact, summary: '' },
          education: [],
          experience: [],
          skills: fallbackSkills,
          projects: [],
          certifications: [],
        },
        feedback: null,
        warnings: ['AI provider chưa cấu hình đầy đủ, chỉ trích xuất cơ bản.'],
      });
    }

    const warnings = [];
    if (injectionFlag) warnings.push('Phát hiện nội dung bất thường trong CV, đã cô lập an toàn.');

    const extractRes = await runStructuredPrompt(
      'cv_extract',
      wrapData('cv_text', anonymized.slice(0, 14000))
    );
    const grounded = groundCvExtract(extractRes.data, rawText);
    warnings.push(...grounded.warnings);

    const builderPayload = mapExtractedToBuilderPayload(grounded.data, contact);

    let feedback = null;
    try {
      const fbRes = await runStructuredPrompt(
        'cv_feedback',
        wrapData('cv_json', JSON.stringify(grounded.data))
      );
      feedback = fbRes.data;
    } catch (fbErr) {
      console.warn('cv_feedback skipped:', fbErr.message);
      warnings.push('Không thể tạo nhận xét chi tiết cho CV lúc này.');
    }

    return res.json({
      message: 'Phân tích CV bằng AI thành công.',
      aiUsed: true,
      model: extractRes.model,
      data: builderPayload,
      feedback,
      warnings,
    });
  } catch (error) {
    console.error('AI analyzeCV error:', error.message);
    return res.status(422).json({ message: error.message || 'Không thể phân tích tệp CV.' });
  }
}

/**
 * POST /api/ai/cv/feedback
 * Body: { cv, targetJob? }
 */
async function feedbackCV(req, res) {
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Tính năng AI chưa được cấu hình trên máy chủ.' });
  }
  const { cv, targetJob } = req.body || {};
  if (!cv || typeof cv !== 'object') {
    return res.status(400).json({ message: 'Thiếu dữ liệu CV.' });
  }

  try {
    let input = wrapData('cv_json', JSON.stringify(toCompactCvJson(cv)));
    if (targetJob && typeof targetJob === 'string' && targetJob.trim()) {
      input += `\n${wrapData('target_job', targetJob.trim().slice(0, 2500))}`;
    }
    const result = await runStructuredPrompt('cv_feedback', input);
    return res.json({ data: result.data, model: result.model });
  } catch (error) {
    console.error('AI feedbackCV error:', error.message);
    return res.status(500).json({ message: 'Không thể tạo nhận xét CV lúc này.' });
  }
}

/**
 * POST /api/ai/cv/assist
 * Body: { type: 'summary' | 'bullets' | 'skills', cv?, experience?, targetJob? }
 */
async function assistCV(req, res) {
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Tính năng AI chưa được cấu hình trên máy chủ.' });
  }

  const { type, cv, experience, targetJob } = req.body || {};
  try {
    if (type === 'summary') {
      if (!cv) return res.status(400).json({ message: 'Thiếu dữ liệu CV.' });
      const compact = toCompactCvJson(cv);
      let input = wrapData('cv_json', JSON.stringify(compact));
      if (targetJob) input += `\n${wrapData('target_job', String(targetJob).slice(0, 2000))}`;
      const result = await runStructuredPrompt('cv_summary', input);
      const warning = hasNewNumbers(result.data.summary, JSON.stringify(compact))
        ? 'Vui lòng kiểm tra lại các con số được AI đề xuất.'
        : null;
      return res.json({ data: result.data, warning, model: result.model });
    }

    if (type === 'bullets') {
      if (!experience || !Array.isArray(experience.bullets) || experience.bullets.length === 0) {
        return res.status(400).json({ message: 'Vui lòng nhập ít nhất 1 dòng mô tả kinh nghiệm để AI tối ưu.' });
      }
      const cleanBullets = experience.bullets.map((b) => String(b).trim()).filter(Boolean).slice(0, 8);
      let input = wrapData(
        'experience_json',
        JSON.stringify({
          title: experience.position || experience.title || '',
          company: experience.company || '',
          bullets: cleanBullets,
        })
      );
      if (targetJob) input += `\n${wrapData('target_job', String(targetJob).slice(0, 2000))}`;
      const result = await runStructuredPrompt('cv_bullets', input);
      if (!checkBulletsCount(result.data, cleanBullets)) {
        return res.status(422).json({ message: 'Kết quả AI không khớp số lượng gạch đầu dòng, vui lòng thử lại.' });
      }
      return res.json({ data: result.data, model: result.model });
    }

    if (type === 'skills') {
      if (!cv || !targetJob) {
        return res.status(400).json({ message: 'Cần có dữ liệu CV và mô tả công việc mục tiêu để gợi ý kỹ năng.' });
      }
      const input = `${wrapData('cv_json', JSON.stringify(toCompactCvJson(cv)))}\n${wrapData('job_text', String(targetJob).slice(0, 3000))}`;
      const result = await runStructuredPrompt('cv_skills_suggest', input);
      return res.json({ data: result.data, model: result.model });
    }

    return res.status(400).json({ message: 'Loại hỗ trợ AI không hợp lệ (summary | bullets | skills).' });
  } catch (error) {
    console.error('AI assistCV error:', error.message);
    return res.status(500).json({ message: error.message || 'Không thể gọi trợ lý AI lúc này.' });
  }
}

async function getStudentContext(userId, overrideCv) {
  if (overrideCv && typeof overrideCv === 'object') {
    return overrideCv;
  }
  try {
    const cvs = await cvModel.getMyCVs(userId);
    if (cvs && cvs.length > 0) {
      return normalizeDbCV(cvs[0]);
    }
  } catch (err) {
    console.warn('getStudentContext getMyCVs skipped:', err.message);
  }
  try {
    const profile = await profileModel.getProfileByUserId(userId);
    return {
      personal_info: {
        full_name: profile?.full_name || '',
        summary: profile?.bio || '',
      },
      education:
        profile?.university || profile?.major
          ? [{ school: profile.university || '', major: profile.major || '' }]
          : [],
      experience: [],
      skills: [],
      projects: [],
    };
  } catch (err) {
    console.warn('getStudentContext getProfile skipped:', err.message);
    return { personal_info: {}, education: [], experience: [], skills: [], projects: [] };
  }
}

/**
 * POST /api/ai/jobs/:id/fit
 * Tính điểm phù hợp (Rule + AI Fit Assess) giữa sinh viên và Job
 */
async function assessJobFit(req, res) {
  try {
    const job = await jobModel.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Không tìm thấy tin tuyển dụng.' });
    }

    const cv = await getStudentContext(req.user.id, req.body?.cv);
    const jobText = `${job.title || ''}\n${job.description || ''}`;
    const extractedJobSkills = extractSkillsFromText(jobText);

    const jobSkillItems = extractedJobSkills.map((s) => ({
      skillId: s.normalized_name,
      name: s.name,
      isRequired: true,
      weight: 1,
    }));

    const rawStudentSkills = Array.isArray(cv.skills) ? cv.skills : [];
    const studentSkillItems = rawStudentSkills.map((name) => {
      const resolved = resolveSkill(name);
      return {
        skillId: resolved ? resolved.normalized_name : normalizeSkill(name),
        name,
        source: 'manual',
      };
    });

    const ruleRes = ruleScore(jobSkillItems, studentSkillItems);
    const skillNameById = new Map(jobSkillItems.map((s) => [s.skillId, s.name]));
    const matchedNames = ruleRes.matched.map((id) => skillNameById.get(id) || id);
    const missingNames = ruleRes.missing.map((id) => skillNameById.get(id) || id);

    let llmData = null;
    if (isConfigured()) {
      try {
        const fitInput = [
          wrapData('cv_json', JSON.stringify(toCompactCvJson(cv))),
          wrapData('job_text', `${job.title}\nCông ty: ${job.company_name || ''}\n${job.description || ''}`.slice(0, 4000)),
          wrapData(
            'rule_result',
            JSON.stringify({
              ruleScore: ruleRes.rule,
              matchedSkills: matchedNames,
              missingSkills: missingNames,
            })
          ),
        ].join('\n');

        const aiRes = await runStructuredPrompt('fit_assess', fitInput);
        llmData = aiRes.data;
      } catch (aiErr) {
        console.warn('fit_assess fallback to ruleScore:', aiErr.message);
      }
    }

    const combined = combineScores(ruleRes.rule, llmData?.score ?? null);

    return res.json({
      data: {
        jobId: job.id,
        score: combined.score,
        band: combined.band,
        method: combined.method,
        flags: combined.flags,
        matchedSkills: matchedNames,
        missingSkills: missingNames,
        strengths: llmData?.strengths || [],
        gaps: llmData?.gaps || [],
        advice: llmData?.advice || [],
        evidenceThin: llmData?.evidenceThin ?? (rawStudentSkills.length === 0),
      },
    });
  } catch (error) {
    console.error('AI assessJobFit error:', error.message);
    return res.status(500).json({ message: 'Không thể đánh giá độ phù hợp lúc này.' });
  }
}

/**
 * GET /api/ai/jobs/recommended
 * Gợi ý danh sách việc làm phù hợp nhất với hồ sơ sinh viên
 */
async function recommendJobs(req, res) {
  try {
    const allJobs = await jobModel.getAllJobs();
    const openJobs = (allJobs || []).filter((j) => j.status === 'OPEN');
    if (openJobs.length === 0) {
      return res.json({ data: [], aiUsed: false });
    }

    const cv = await getStudentContext(req.user.id);
    const rawStudentSkills = Array.isArray(cv.skills) ? cv.skills : [];
    const studentSkillItems = rawStudentSkills.map((name) => {
      const resolved = resolveSkill(name);
      return {
        skillId: resolved ? resolved.normalized_name : normalizeSkill(name),
        name,
        source: 'manual',
      };
    });

    const scored = openJobs.map((job) => {
      const extracted = extractSkillsFromText(`${job.title || ''}\n${job.description || ''}`);
      const jobSkills = extracted.map((s) => ({ skillId: s.normalized_name, name: s.name, isRequired: true }));
      const r = ruleScore(jobSkills, studentSkillItems);
      return {
        job,
        ruleScore: r.rule ?? 0,
        matched: r.matched,
        requiredSkills: extracted.map((s) => s.name),
      };
    });

    scored.sort((a, b) => b.ruleScore - a.ruleScore);
    const candidates = scored.slice(0, 10);

    if (!isConfigured() || rawStudentSkills.length === 0) {
      return res.json({
        aiUsed: false,
        data: candidates.map((c) => ({
          jobId: c.job.id,
          score: c.ruleScore,
          reason: c.matched.length
            ? `Khớp ${c.matched.length} kỹ năng từ hồ sơ của bạn`
            : 'Công việc mới đang mở tuyển cho sinh viên',
        })),
      });
    }

    try {
      const studentProfile = {
        skills: rawStudentSkills.slice(0, 25),
        fieldOfStudy: cv.education?.[0]?.major || '',
        pastTitles: (cv.experience || []).slice(0, 3).map((e) => e.position || e.title).filter(Boolean),
      };
      const candidateList = candidates.map((c) => ({
        jobId: c.job.id,
        title: c.job.title,
        location: c.job.location || '',
        jobType: c.job.job_type,
        requiredSkills: c.requiredSkills.slice(0, 10),
        description: (c.job.description || '').slice(0, 260),
      }));

      const input = `${wrapData('student_profile', JSON.stringify(studentProfile))}\n${wrapData('candidates', JSON.stringify(candidateList))}`;
      const aiRes = await runStructuredPrompt('job_rerank', input);
      const candidateIds = candidates.map((c) => c.job.id);

      let ranking = Array.isArray(aiRes.data?.ranking) ? aiRes.data.ranking : [];
      if (!checkRerankIds(ranking, candidateIds)) {
        ranking = [];
      }

      // Append any omitted candidates at the end
      const rankedIds = new Set(ranking.map((r) => String(r.jobId)));
      const scoreMap = new Map(candidates.map((c) => [String(c.job.id), c.ruleScore]));
      const finalRanking = ranking.map((r) => ({
        jobId: Number(r.jobId),
        score: scoreMap.get(String(r.jobId)) ?? 0,
        reason: r.reason,
      }));
      for (const c of candidates) {
        if (!rankedIds.has(String(c.job.id))) {
          finalRanking.push({
            jobId: c.job.id,
            score: c.ruleScore,
            reason: c.matched.length ? `Khớp kỹ năng: ${c.matched.join(', ')}` : 'Phù hợp để khám phá thêm',
          });
        }
      }

      return res.json({ aiUsed: true, model: aiRes.model, data: finalRanking });
    } catch (aiErr) {
      console.warn('job_rerank fallback:', aiErr.message);
      return res.json({
        aiUsed: false,
        data: candidates.map((c) => ({
          jobId: c.job.id,
          score: c.ruleScore,
          reason: c.matched.length
            ? `Khớp ${c.matched.length} kỹ năng từ hồ sơ của bạn`
            : 'Công việc đang tuyển phù hợp cho sinh viên',
        })),
      });
    }
  } catch (error) {
    console.error('AI recommendJobs error:', error.message);
    return res.status(500).json({ message: 'Không thể gợi ý việc làm lúc này.' });
  }
}

module.exports = {
  analyzeCV,
  feedbackCV,
  assistCV,
  assessJobFit,
  recommendJobs,
};
