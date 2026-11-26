'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const JSZip = require('jszip');

// Synthetic fixtures, real parsers and routes; no database or provider network access.
const authPath = require.resolve('../../middleware/authMiddleware');
require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: {
  authenticateToken: (req, res, next) => { req.user = { id: 1 }; next(); },
  authorizeRole: () => (req, res, next) => next(),
} };
const app = express();
app.use(express.json());
app.use('/api/ai', require('../../routes/aiRoutes'));
app.use('/api/cvs', require('../../routes/cvParserRoutes'));

function pdf(stream) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let output = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(output)); output += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output);
}

async function docx(text) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

test('synthetic CV uploads distinguish parser and provider errors with no network provider calls', async () => {
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const nativeFetch = global.fetch;
  const base = `http://127.0.0.1:${server.address().port}`;
  const saved = Object.fromEntries(['API_KEY', 'BASE_URL', 'MODEL_NAME'].map((k) => [k, process.env[k]]));
  let providerCalls = 0;
  let invalid = false;
  global.fetch = async () => {
    providerCalls++;
    const data = invalid ? {} : providerCalls % 2 === 1
      ? { language: 'en', summary: null, education: [], experience: [], skills: [], projects: [], certifications: [] }
      : { overall: 'Hãy bổ sung thông tin nếu có.', items: [] };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(data) } }] }) };
  };
  async function upload(path, name, type, bytes) {
    const form = new FormData(); form.append('file', new Blob([bytes], { type }), name);
    const response = await nativeFetch(base + path, { method: 'POST', body: form });
    const body = await response.json();
    console.log(`${path} ${name} status=${response.status} message=${JSON.stringify(body.message)} warnings=${JSON.stringify(body.warnings ?? null)}`);
    return { status: response.status, body };
  }
  try {
    Object.assign(process.env, { API_KEY: '', BASE_URL: '', MODEL_NAME: '' });
    const mimePdf = 'application/pdf';
    const mimeDocx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const textPdf = pdf('BT /F1 12 Tf 20 250 Td (Synthetic React experience) Tj ET');
    const imagePdf = pdf('q 50 0 0 50 0 0 cm BI /W 1 /H 1 /CS /RGB /BPC 8 /F /AHx ID FF0000> EI Q');
    const blankPdf = pdf('');
    for (const path of ['/api/ai/cv/analyze', '/api/cvs/parse']) {
      const valid = await upload(path, 'text.pdf', mimePdf, textPdf); assert.equal(valid.status, 200);
      assert.doesNotMatch(JSON.stringify(valid.body.data), /--\s*1 of 1\s*--/);
      const textDoc = await upload(path, 'text.docx', mimeDocx, await docx('Synthetic React experience')); assert.equal(textDoc.status, 200);
      const image = await upload(path, 'image.pdf', mimePdf, imagePdf); assert.equal(image.status, 422); assert.match(image.body.message, /OCR/);
      const blank = await upload(path, 'blank.pdf', mimePdf, blankPdf); assert.equal(blank.status, 422);
      const emptyDoc = await upload(path, 'empty.docx', mimeDocx, await docx('')); assert.equal(emptyDoc.status, 422); assert.match(emptyDoc.body.message, /văn bản/);
      const emptyFile = await upload(path, 'empty.pdf', mimePdf, Buffer.alloc(0)); assert.equal(emptyFile.status, path.startsWith('/api/ai') ? 422 : 400);
      const short = await upload(path, 'short.docx', mimeDocx, await docx('A')); assert.equal(short.status, 200);
    }
    assert.equal(providerCalls, 0);
    Object.assign(process.env, { API_KEY: 'synthetic', BASE_URL: 'https://mock.invalid', MODEL_NAME: 'synthetic' });
    const imageEnabled = await upload('/api/ai/cv/analyze', 'image.pdf', mimePdf, imagePdf);
    assert.equal(imageEnabled.status, 422); assert.equal(providerCalls, 0);
    const success = await upload('/api/ai/cv/analyze', 'text.docx', mimeDocx, await docx('Synthetic React experience'));
    assert.equal(success.status, 200); assert.equal(success.body.aiUsed, true); assert.equal(providerCalls, 2);
    invalid = true;
    const failure = await upload('/api/ai/cv/analyze', 'text.docx', mimeDocx, await docx('Synthetic React experience'));
    assert.equal(failure.status, 422); assert.match(failure.body.message, /AI/); assert.equal(providerCalls, 4);
    console.log(`mock provider calls=${providerCalls}; actual provider network calls=0`);
  } finally {
    global.fetch = nativeFetch;
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await new Promise((resolve) => server.close(resolve));
  }
});
