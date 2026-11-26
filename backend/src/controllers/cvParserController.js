const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');

function extractFields(text) {
  const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = text.match(/(?:\+84|0)(?:[\s.\-]?\d){9,10}/)?.[0]?.replace(/[\s.\-]/g, '') || '';
  const heading = /^(?:curriculum vitae|resume|cv|hồ sơ xin việc|sơ yếu lý lịch)$/i;
  const full_name = lines.find(x => x.length <= 65 && !heading.test(x) && !x.includes('@') && !/\d{4}/.test(x) && !/^(email|phone|điện thoại|số điện thoại|địa chỉ|address|contact)\b/i.test(x)) || '';
  const address = lines.find(x => /^(?:địa chỉ|address|location)\s*[:：]/i.test(x))?.replace(/^[^:：]+[:：]\s*/, '') || '';
  const skillsIndex = lines.findIndex(x => /^(?:kỹ năng|skills|technical skills)\s*[:：]?$/i.test(x));
  const nextHeading = /^(?:học vấn|education|kinh nghiệm|experience|dự án|projects|chứng chỉ|certifications|giới thiệu|summary|thông tin cá nhân)\s*[:：]?$/i;
  const extractedSkills = [];
  if (skillsIndex >= 0) {
    for (const line of lines.slice(skillsIndex + 1, skillsIndex + 7)) {
      if (nextHeading.test(line)) break;
      extractedSkills.push(...line.replace(/^[•*\-]\s*/, '').split(/[,;|]/).map(s => s.trim()).filter(Boolean));
    }
  }
  return {
    title: full_name ? `CV ${full_name}` : 'CV nhập từ tệp',
    template: 'modern',
    personal_info: { full_name, email, phone, address, summary: '' },
    education: [], experience: [], skills: extractedSkills.slice(0, 30), projects: [], certifications: []
  };
}

async function parseCV(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file PDF hoặc DOCX.' });
  const isPdf = req.file.mimetype === 'application/pdf' && req.file.buffer.subarray(0, 5).toString() === '%PDF-';
  const isDocx = req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && req.file.buffer.subarray(0, 2).toString() === 'PK';
  if (!isPdf && !isDocx) return res.status(400).json({ message: 'Tệp không đúng định dạng PDF/DOCX.' });
  let parser;
  try {
    let text;
    if (isPdf) {
      parser = new PDFParse({ data: new Uint8Array(req.file.buffer) });
      const result = await parser.getText();
      text = result.pages.map(page => page.text).join('\n');
    } else {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    }
    if (!text || !text.trim()) return res.status(422).json({ message: 'Không tìm thấy văn bản trong tệp. Hãy dùng PDF có thể chọn chữ hoặc DOCX; nếu PDF là ảnh, hãy chuyển ảnh thành văn bản bằng OCR trước khi tải lên.' });
    res.json({ message: 'Đã trích xuất văn bản CV. Vui lòng kiểm tra trước khi lưu.', data: extractFields(text), warnings: ['Học vấn, kinh nghiệm và dự án cần nhập hoặc xác nhận thủ công.'] });
  } catch (error) {
    console.error('CV parser failed:', error.message);
    res.status(422).json({ message: 'Không thể phân tích tệp CV này.' });
  } finally {
    if (parser) await parser.destroy().catch(() => {});
  }
}
module.exports = { parseCV };
