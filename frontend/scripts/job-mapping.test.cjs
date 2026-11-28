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
  const storage = new Map();
  global.localStorage = { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); }, removeItem(key) { storage.delete(key); } };
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
  const paths = [];
  loaded.exports.store.setSession({ id: '2', role: 'EMPLOYER' });
  global.fetch = async url => { paths.push(String(url)); return { ok: true, status: 200, json: async () => ({ data: [{ ...row, applicant_count: 0 }] }) }; };
  await service.load();
  assert.equal(paths.length, 1);
  assert.ok(paths[0].endsWith('/jobs/mine'));

  let jobs = [{ ...row, applicant_count: 1 }, { ...row, id: 100, applicant_count: 1 }];
  let fail = false;
  global.fetch = async url => {
    if (String(url).endsWith('/jobs/mine')) return { ok: true, status: 200, json: async () => ({ data: jobs }) };
    const id = String(url).split('/').pop();
    if (fail) return { ok: false, status: 500, json: async () => ({ message: 'synthetic failure' }) };
    return { ok: true, status: 200, json: async () => ({ data: [{ id: Number(id), job_id: Number(id), student_id: 1, status: 'PENDING' }] }) };
  };
  await service.load();
  assert.equal(loaded.exports.applicationService.all().length, 2);
  jobs = [{ ...row, applicant_count: 0 }];
  await service.load();
  assert.equal(loaded.exports.applicationService.all().length, 0, 'zero count and removed jobs clear stale applications');
  jobs = [{ ...row, applicant_count: 1 }];
  await service.load();
  assert.equal(loaded.exports.applicationService.all().length, 1);
  fail = true;
  const oldError = console.error; console.error = () => {};
  try { await service.load(); } finally { console.error = oldError; }
  assert.equal(loaded.exports.applicationService.all().length, 0, 'failed detail fetch clears stale applications');
  fail = false;
  await service.load();
  assert.equal(loaded.exports.applicationService.all().length, 1);
  global.fetch = async () => ({ ok: false, status: 500, json: async () => ({ message: 'synthetic list failure' }) });
  await assert.rejects(service.load());
  assert.equal(loaded.exports.applicationService.all().length, 0, 'failed employer list clears stale applications');

  let finish;
  global.fetch = async url => String(url).endsWith('/jobs/mine')
    ? { ok: true, status: 200, json: async () => ({ data: jobs }) }
    : await new Promise(resolve => { finish = resolve; });
  const pending = service.load();
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  loaded.exports.store.setSession({ id: '1', role: 'STUDENT' });
  loaded.exports.store.setSession({ id: '2', role: 'EMPLOYER' });
  finish({ ok: true, status: 200, json: async () => ({ data: [{ id: 1, job_id: 99, student_id: 1 }] }) });
  await pending;
  assert.equal(loaded.exports.applicationService.all().length, 0, 'old role response cannot refill cache after switching away and back');

  const deferred = [];
  global.fetch = async () => await new Promise(resolve => deferred.push(resolve));
  const response = (id, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => ok ? { data: [{ id, job_id: 99, student_id: 1 }] } : { message: 'synthetic failure' } });
  const older = loaded.exports.applicationService.loadByJob('99');
  const newer = loaded.exports.applicationService.loadByJob('99');
  deferred[1](response(2)); await newer;
  deferred[0](response(1)); assert.equal(await older, null);
  assert.equal(loaded.exports.applicationService.all()[0].id, '2', 'older job response is ignored');
  deferred.length = 0;
  const oldFailure = loaded.exports.applicationService.loadByJob('99');
  const newest = loaded.exports.applicationService.loadByJob('99');
  deferred[1](response(3)); await newest;
  deferred[0](response(1, false)); assert.equal(await oldFailure, null);
  assert.equal(loaded.exports.applicationService.all()[0].id, '3', 'older failure cannot clear newer job data');

  loaded.exports.store.setSession({ id: '1', role: 'STUDENT' });
  deferred.length = 0;
  const oldMine = loaded.exports.applicationService.loadMine();
  const newMine = loaded.exports.applicationService.loadMine();
  deferred[1](response(5)); await newMine;
  deferred[0](response(4)); assert.equal(await oldMine, null);
  assert.equal(loaded.exports.applicationService.all()[0].id, '5', 'older application list is ignored');
  deferred.length = 0;
  const priorLogin = loaded.exports.applicationService.loadMine();
  loaded.exports.store.setSession(null);
  loaded.exports.store.setSession({ id: '1', role: 'STUDENT' });
  deferred[0](response(6)); assert.equal(await priorLogin, null);
  assert.equal(loaded.exports.applicationService.all().length, 0, 'prior login cannot refill the new session');
  loaded.exports.store.setSession({ id: '3', role: 'ADMIN' });
  deferred.length = 0;
  const oldAdmin = loaded.exports.applicationService.loadAllAdmin();
  const newAdmin = loaded.exports.applicationService.loadAllAdmin();
  deferred[1](response(8)); await newAdmin;
  deferred[0](response(7)); assert.equal(await oldAdmin, null, 'caller cannot render the older result');
  assert.equal(loaded.exports.applicationService.all()[0].id, '8', 'older admin list is ignored');
});
