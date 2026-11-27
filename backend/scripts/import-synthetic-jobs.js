#!/usr/bin/env node
// Uses the existing mysql2 dependency. DB_* credentials come from the runtime.
const fs = require('node:fs');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');

const keys = ['title', 'category', 'employmentType', 'salaryMin', 'salaryMax', 'location', 'workMode', 'deadline', 'status', 'description', 'responsibilities', 'requirements', 'skills'];
const types = { 'Bán thời gian': 'PART_TIME', 'Toàn thời gian': 'FULL_TIME', 'Thực tập': 'INTERNSHIP' };
const modes = new Set(['Trực tiếp', 'Kết hợp', 'Từ xa']);

function prepare(input) {
  if (!Array.isArray(input) || !input.length) throw Error('Input must be a nonempty array');
  const seen = new Set();
  return input.map((item, index) => {
    const fail = message => { throw Error(`Row ${index + 1}: ${message}`); };
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).sort().join('|') !== [...keys].sort().join('|')) fail('unexpected or missing fields');
    for (const key of keys.filter(k => !['salaryMin', 'salaryMax'].includes(k))) {
      if (typeof item[key] !== 'string' || !item[key].trim()) fail(`invalid ${key}`);
      const max = ['title', 'category', 'location', 'workMode'].includes(key) ? 255 : 65535;
      if (Buffer.byteLength(item[key], 'utf8') > (max === 255 ? 1020 : max) || (max === 255 && [...item[key]].length > max)) fail(`${key} too long`);
    }
    for (const key of ['salaryMin', 'salaryMax']) if (!Number.isSafeInteger(item[key]) || item[key] < 0 || item[key] > 9999999999) fail(`invalid ${key}`);
    if (item.salaryMin > item.salaryMax) fail('salary range reversed');
    if (!Object.hasOwn(types, item.employmentType) || !modes.has(item.workMode) || item.status !== 'Đang mở') fail('unknown type, mode or status');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.deadline) || Number.isNaN(Date.parse(item.deadline)) || new Date(item.deadline).toISOString().slice(0, 10) !== item.deadline) fail('invalid deadline');
    const source = Object.fromEntries(keys.map(k => [k, item[k]]));
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(source), 'utf8').digest('hex');
    if (seen.has(fingerprint)) fail('duplicate source content');
    seen.add(fingerprint);
    return { source, fingerprint };
  });
}

function values(row, employer) {
  const s = row.source;
  return [employer, s.title, s.description, s.location, s.salaryMin, s.salaryMax, types[s.employmentType], s.deadline, 'OPEN', 'APPROVED', s.category, s.workMode, s.responsibilities, s.requirements, s.skills, row.fingerprint];
}

async function run() {
  const [file, employerArg, mode, manifest] = process.argv.slice(2);
  if (!file || !/^[1-9]\d*$/.test(employerArg || '') || !['--dry-run', '--apply'].includes(mode) || (mode === '--apply' && !manifest) || process.argv.length !== (mode === '--apply' ? 6 : 5)) throw Error('Usage: node import-synthetic-jobs.js INPUT EMPLOYER_PROFILE_ID --dry-run | --apply MANIFEST');
  const employer = Number(employerArg);
  if (!Number.isSafeInteger(employer)) throw Error('Invalid employer id');
  const rows = prepare(JSON.parse(fs.readFileSync(file, 'utf8')));
  // Reserve the private manifest before touching the database. A pending manifest
  // means the transaction outcome must be checked against its fingerprints.
  const manifestFd = manifest ? fs.openSync(manifest, 'wx', 0o600) : null;
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, dateStrings: true, charset: 'utf8mb4' });
  let transaction = false;
  let locked = false;
  try {
    const [employers] = await db.execute("SELECT ep.id, ep.company_name, u.role, u.status FROM employer_profiles ep JOIN users u ON u.id=ep.user_id WHERE ep.id=?", [employer]);
    if (employers.length !== 1 || employers[0].role !== 'EMPLOYER' || employers[0].status !== 'ACTIVE') throw Error('Active employer profile not found');
    if (mode === '--apply') {
      const name = `studentjob.import.${crypto.createHash('sha256').update(process.env.DB_NAME || '').digest('hex').slice(0, 32)}`;
      const [lock] = await db.execute('SELECT GET_LOCK(?, 30) AS acquired', [name]);
      if (lock[0].acquired !== 1) throw Error('Could not acquire import lock');
      locked = true;
      await db.beginTransaction(); transaction = true;
    }
    const results = [];
    for (const row of rows) {
      const expected = values(row, employer);
      const [existing] = await db.execute('SELECT id, employer_id, title, description, location, salary_min, salary_max, job_type, deadline, status, moderation_status, category, work_mode, responsibilities, requirements, skills, import_fingerprint FROM jobs WHERE import_fingerprint=?', [row.fingerprint]);
      if (existing.length) {
        const actual = existing[0];
        const got = ['employer_id','title','description','location','salary_min','salary_max','job_type','deadline','status','moderation_status','category','work_mode','responsibilities','requirements','skills','import_fingerprint'].map(k => actual[k]);
        if (got.some((v, i) => v == null || (i === 4 || i === 5 ? Number(v) !== expected[i] : String(v) !== String(expected[i])))) throw Error(`Existing imported row ${actual.id} differs from source`);
        results.push({ id: actual.id, fingerprint: row.fingerprint, action: 'skipped' });
      } else if (mode === '--apply') {
        const [result] = await db.execute('INSERT INTO jobs (employer_id,title,description,location,salary_min,salary_max,job_type,deadline,status,moderation_status,category,work_mode,responsibilities,requirements,skills,import_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', expected);
        results.push({ id: result.insertId, fingerprint: row.fingerprint, action: 'inserted' });
      } else results.push({ id: null, fingerprint: row.fingerprint, action: 'would-insert' });
    }
    const summary = { employer, company: employers[0].company_name, mode, total: results.length, inserted: results.filter(x => x.action === 'inserted').length, skipped: results.filter(x => x.action === 'skipped').length, wouldInsert: results.filter(x => x.action === 'would-insert').length, rows: results };
    if (manifestFd !== null) {
      const pending = JSON.stringify({ state: 'pending  ', ...summary }, null, 2) + '\n';
      fs.writeFileSync(manifestFd, pending);
      fs.fsyncSync(manifestFd);
    }
    if (transaction) { await db.commit(); transaction = false; }
    if (manifestFd !== null) {
      // Replace the pending marker in place without losing the pre-commit IDs.
      const offset = Buffer.from(JSON.stringify({ state: 'pending  ', ...summary }, null, 2)).indexOf('pending  ');
      fs.writeSync(manifestFd, 'committed', offset, 'utf8');
      fs.fsyncSync(manifestFd);
    }
    console.log(JSON.stringify({ ...summary, rows: undefined }));
  } finally {
    if (transaction) await db.rollback();
    if (locked) await db.execute('SELECT RELEASE_LOCK(?)', [`studentjob.import.${crypto.createHash('sha256').update(process.env.DB_NAME || '').digest('hex').slice(0, 32)}`]);
    await db.end();
    if (manifestFd !== null) fs.closeSync(manifestFd);
  }
}
if (require.main === module) run().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { prepare, values };
