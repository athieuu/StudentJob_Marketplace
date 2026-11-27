const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const esbuild = require('esbuild');

test('imported job fields display and unrelated edits preserve their original values', async () => {
  const bundle = await esbuild.build({ entryPoints: [path.join(__dirname, '../src/services/store.ts')], bundle: true, platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env.VITE_API_BASE_URL': '"/api"' } });
  const loaded = new Module(path.join(__dirname, 'job-mapping-bundle.cjs'));
  loaded.filename = path.join(__dirname, 'job-mapping-bundle.cjs');
  loaded.paths = Module._nodeModulePaths(__dirname);
  global.window = { dispatchEvent() {}, addEventListener() {} };
  global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  let payload;
  const row = { id: 99, employer_id: 1, title: 'Thực tập', company_name: 'Demo', category: 'Technology', job_type: 'INTERNSHIP', salary_min: 1, salary_max: 2, location: 'Hà Nội', work_mode: 'Kết hợp', description: 'Mô tả', responsibilities: 'Một\nHai', requirements: 'Ba\nBốn', skills: 'Một,  Hai', status: 'OPEN', moderation_status: 'APPROVED' };
  global.fetch = async (_url, options = {}) => {
    if (options.method === 'PUT') payload = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => options.method === 'PUT' ? {} : { data: [row] } };
  };
  loaded._compile(bundle.outputFiles[0].text, loaded.filename);
  const service = loaded.exports.jobService;
  await service.load();
  const job = service.byId('99');
  assert.equal(job.type, 'INTERNSHIP');
  assert.equal(job.arrangement, 'Hybrid');
  assert.deepEqual(job.skills, ['Một', 'Hai']);
  assert.deepEqual(job.responsibilities, ['Một', 'Hai']);
  await service.save({ ...job, title: 'Updated title' });
  for (const key of ['category', 'work_mode', 'responsibilities', 'requirements', 'skills']) assert.ok(!(key in payload), key);
});
