const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const esbuild = require('esbuild');

const loadStore = async () => {
  const bundle = await esbuild.build({ entryPoints: [path.join(__dirname, '../src/services/store.ts')], bundle: true, platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env.VITE_API_BASE_URL': '"/api"' } });
  const loaded = new Module(path.join(__dirname, 'job-mapping-bundle.cjs'));
  loaded.filename = path.join(__dirname, 'job-mapping-bundle.cjs');
  loaded.paths = Module._nodeModulePaths(__dirname);
  global.window = { dispatchEvent() {}, addEventListener() {} };
  const storage = new Map();
  global.localStorage = { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); }, removeItem(key) { storage.delete(key); } };
  loaded._compile(bundle.outputFiles[0].text, loaded.filename);
  return loaded.exports;
};
const okResponse = data => ({ ok: true, status: 200, json: async () => ({ data }) });

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
  // EMPLOYER loads both /jobs (public jobService.all()) and /jobs/mine (jobService.mine()).
  assert.equal(paths.length, 2);
  assert.ok(paths.some(p => p.endsWith('/jobs/mine')), 'employer load fetches /jobs/mine');
  assert.ok(paths.some(p => p.endsWith('/jobs')), 'employer load fetches /jobs');
  assert.equal(service.all().length, 1, 'public cache holds the /jobs rows');
  assert.equal(service.mine().length, 1, 'employer cache holds the /jobs/mine rows');

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
  // The public /jobs failure also propagates now; the assertion below still verifies the stale-application clear.
  try { await service.load().catch(() => {}); } finally { console.error = oldError; }
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

test('employer with zero own jobs still sees public jobs and a failed /jobs/mine keeps them', async () => {
  const { store, jobService, applicationService } = await loadStore();
  const publicRows = [
    { id: 11, employer_id: 90, title: 'Public job A', company_name: 'Công ty A', status: 'OPEN', moderation_status: 'APPROVED' },
    { id: 12, employer_id: 91, title: 'Public job B', company_name: 'Công ty B', status: 'OPEN', moderation_status: 'APPROVED' },
  ];
  let mineRows = [];
  let mineOk = true;
  global.fetch = async url => {
    const u = String(url);
    if (u.endsWith('/jobs/mine')) {
      if (!mineOk) return { ok: false, status: 500, json: async () => ({ message: 'mine failure' }) };
      return okResponse(mineRows);
    }
    if (u.endsWith('/jobs')) return okResponse(publicRows);
    if (u.includes('/applications/job/')) return okResponse([{ id: 71, job_id: Number(u.split('/').pop()), student_id: 1, status: 'PENDING' }]);
    return okResponse([]);
  };

  store.setSession({ id: '42', role: 'EMPLOYER' });
  await jobService.load();
  assert.equal(jobService.all().length, 2, 'employer sees public jobs through jobService.all()');
  assert.equal(jobService.mine().length, 0, 'employer with no own jobs has an empty mine()');
  assert.equal(jobService.mineById('11'), undefined, 'public jobs are not part of mine()');
  assert.equal(applicationService.all().length, 0);

  mineRows = [{ id: 13, employer_id: 42, title: 'Own job', status: 'OPEN', moderation_status: 'PENDING', applicant_count: 1 }];
  await jobService.load();
  assert.equal(jobService.mine().length, 1);
  assert.equal(jobService.byId('13').title, 'Own job', 'own job is resolvable through byId');
  assert.equal(applicationService.all().length, 1, 'own job application detail is loaded');

  mineOk = false;
  await assert.rejects(jobService.load());
  assert.equal(jobService.mine().length, 0, 'failed /jobs/mine clears jobService.mine()');
  assert.equal(applicationService.all().length, 0, 'failed /jobs/mine clears applicationCache');
  assert.equal(jobService.all().length, 2, 'failed /jobs/mine keeps public jobs in jobService.all()');
  assert.ok(jobService.byId('11'), 'public job still resolvable after mine failure');
  assert.equal(jobService.byId('13'), undefined, 'own job no longer resolvable after mine failure');
  assert.equal(jobService.mineById('13'), undefined);
});

test('logout keeps public jobs while clearing employer, admin pending, and application caches', async () => {
  const { store, authService, jobService, applicationService } = await loadStore();
  const publicRows = [
    { id: 11, employer_id: 90, title: 'Public job A', company_name: 'Công ty A', status: 'OPEN', moderation_status: 'APPROVED' },
    { id: 12, employer_id: 91, title: 'Public job B', company_name: 'Công ty B', status: 'OPEN', moderation_status: 'APPROVED' },
  ];
  const pendingRows = [
    { id: 12, employer_id: 92, title: 'Pending duplicate', company_name: 'Công ty A', status: 'OPEN', moderation_status: 'PENDING' },
    { id: 14, employer_id: 93, title: 'Pending job', company_name: 'Công ty C', status: 'OPEN', moderation_status: 'PENDING' },
  ];
  const mineRows = [{ id: 13, employer_id: 42, title: 'Own job', status: 'OPEN', moderation_status: 'APPROVED', applicant_count: 1 }];
  global.fetch = async url => {
    const u = String(url);
    if (u.endsWith('/jobs/mine')) return okResponse(mineRows);
    if (u.endsWith('/admin/jobs/pending')) return okResponse(pendingRows);
    if (u.endsWith('/jobs')) return okResponse(publicRows);
    if (u.includes('/applications/job/')) return okResponse([{ id: 71, job_id: Number(u.split('/').pop()), student_id: 1, status: 'PENDING' }]);
    return okResponse([]);
  };

  store.setSession({ id: '42', role: 'EMPLOYER' });
  await jobService.load();
  assert.equal(jobService.all().length, 2);
  assert.equal(jobService.mine().length, 1);
  assert.equal(applicationService.all().length, 1);

  authService.logout();
  assert.equal(jobService.mine().length, 0, 'logout clears employer jobs');
  assert.equal(applicationService.all().length, 0, 'logout clears applications');
  assert.equal(jobService.all().length, 2, 'logout keeps public jobs for the guest view');

  store.setSession({ id: '9', role: 'STUDENT' });
  assert.equal(jobService.all().length, 2, 'public jobs survive the switch to a student session');
  assert.equal(jobService.mine().length, 0, 'student never sees employer jobs');
  assert.equal(jobService.byId('13'), undefined);
  await jobService.load();
  assert.equal(jobService.all().length, 2, 'student reload keeps the public listing');
  assert.equal(applicationService.all().length, 0);

  store.setSession({ id: '3', role: 'ADMIN' });
  await jobService.load();
  assert.deepEqual(jobService.adminAll().map(j => j.id).sort(), ['11', '12', '14'], 'admin sees public jobs plus deduplicated pending jobs');
  authService.logout();
  assert.deepEqual(jobService.adminAll().map(j => j.id).sort(), ['11', '12'], 'logout clears pending jobs but keeps public jobs');
});

test('mid-flight job responses are discarded across role switches and newer loads', async () => {
  const { store, jobService } = await loadStore();
  const publicRows = [{ id: 11, employer_id: 90, title: 'Public job A', company_name: 'Công ty A', status: 'OPEN', moderation_status: 'APPROVED' }];
  let deferred = [];
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const waitDeferred = async n => { while (deferred.length < n) await tick(); };

  // Seed a known-good public cache.
  global.fetch = async url => String(url).endsWith('/jobs') ? okResponse(publicRows) : okResponse([]);
  await jobService.load();
  assert.equal(jobService.all().length, 1);

  // Employer load mid-flight, then the user switches to another employer account:
  // public /jobs is role-independent and still commits, while stale /jobs/mine is discarded.
  deferred = [];
  global.fetch = async url => {
    const u = String(url);
    if (u.endsWith('/jobs') || u.endsWith('/jobs/mine')) return new Promise(resolve => { deferred.push({ u, resolve }); });
    return okResponse([]);
  };
  store.setSession({ id: '42', role: 'EMPLOYER' });
  const staleLoad = jobService.load();
  await waitDeferred(1);
  store.setSession({ id: '43', role: 'EMPLOYER' });
  deferred[0].resolve(okResponse([...publicRows, { id: 98, employer_id: 42, title: 'Public during switch', status: 'OPEN', moderation_status: 'APPROVED' }]));
  await waitDeferred(2);
  deferred[1].resolve(okResponse([{ id: 99, employer_id: 42, title: 'Stale own', status: 'OPEN', moderation_status: 'APPROVED', applicant_count: 2 }]));
  await staleLoad;
  assert.equal(jobService.all().length, 2, 'role-independent public /jobs commits unless a newer load superseded it');
  assert.equal(jobService.mine().length, 0, 'stale /jobs/mine response cannot refill after a role switch');
  assert.equal(jobService.mineById('99'), undefined);
  assert.equal(jobService.byId('99'), undefined);

  // A fresh load under the new employer account recovers both caches.
  global.fetch = async url => {
    const u = String(url);
    if (u.endsWith('/jobs')) return okResponse([...publicRows, { id: 15, employer_id: 44, title: 'Fresh public', status: 'OPEN', moderation_status: 'APPROVED' }]);
    if (u.endsWith('/jobs/mine')) return okResponse([{ id: 16, employer_id: 43, title: 'Fresh own', status: 'OPEN', moderation_status: 'APPROVED' }]);
    return okResponse([]);
  };
  await jobService.load();
  assert.equal(jobService.all().length, 2);
  assert.equal(jobService.mine().length, 1);
  assert.equal(jobService.mineById('16').title, 'Fresh own');

  // Same-session generation guard: an older load's responses lose to a newer load.
  deferred = [];
  global.fetch = async url => {
    const u = String(url);
    if (u.endsWith('/jobs') || u.endsWith('/jobs/mine')) return new Promise(resolve => { deferred.push({ u, resolve }); });
    return okResponse([]);
  };
  const older = jobService.load();
  await waitDeferred(1);
  const newer = jobService.load();
  await waitDeferred(2);
  deferred[1].resolve(okResponse([{ id: 20, employer_id: 43, title: 'Newer public', status: 'OPEN', moderation_status: 'APPROVED' }]));
  await waitDeferred(3);
  deferred[2].resolve(okResponse([{ id: 21, employer_id: 43, title: 'Newer own', status: 'OPEN', moderation_status: 'APPROVED' }]));
  await newer;
  assert.equal(jobService.all()[0].id, '20', 'newer public response wins while an older load is still in flight');
  assert.equal(jobService.mine()[0].id, '21');
  deferred[0].resolve(okResponse([{ id: 19, employer_id: 43, title: 'Older public', status: 'OPEN', moderation_status: 'APPROVED' }]));
  await waitDeferred(4);
  deferred[3].resolve(okResponse([{ id: 22, employer_id: 42, title: 'Older own', status: 'OPEN', moderation_status: 'APPROVED' }]));
  await older;
  assert.equal(jobService.all()[0].id, '20', 'older /jobs response is discarded');
  assert.equal(jobService.mine()[0].id, '21', 'older /jobs/mine response is discarded');

  // Admin pending responses obey the same epoch guard across account switches.
  deferred = [];
  global.fetch = async url => {
    const u = String(url);
    if (u.endsWith('/jobs') || u.endsWith('/admin/jobs/pending')) return new Promise(resolve => { deferred.push({ u, resolve }); });
    return okResponse([]);
  };
  store.setSession({ id: '3', role: 'ADMIN' });
  const adminLoad = jobService.load();
  await waitDeferred(1);
  store.setSession({ id: '4', role: 'ADMIN' });
  deferred[0].resolve(okResponse([{ id: 31, employer_id: 50, title: 'Stale public', status: 'OPEN', moderation_status: 'APPROVED' }]));
  await waitDeferred(2);
  deferred[1].resolve(okResponse([{ id: 30, employer_id: 50, title: 'Stale pending', status: 'OPEN', moderation_status: 'PENDING' }]));
  await adminLoad;
  assert.equal(jobService.adminAll().some(j => j.id === '30'), false, 'stale /admin/jobs/pending response cannot refill after a role switch');
  assert.equal(jobService.adminAll().every(j => j.moderation === 'APPROVED'), true, 'admin view still shows the intact public cache');
  assert.equal(jobService.mine().length, 0, 'non-employer never sees employer jobs');
});

test('stale employer session expiring with 401 still keeps public /jobs visible', async () => {
  const { store, jobService } = await loadStore();
  store.setSession({ id: '999', role: 'EMPLOYER' });
  global.fetch = async url => {
    const u = String(url);
    if (u.endsWith('/jobs')) {
      store.setSession(null);
      return okResponse([{ id: 51, employer_id: 1, title: 'Public after 401', status: 'OPEN', moderation_status: 'APPROVED' }]);
    }
    if (u.endsWith('/jobs/mine')) {
      return { ok: false, status: 401, json: async () => ({ message: 'Unauthorized' }) };
    }
    return okResponse([]);
  };
  await assert.rejects(jobService.load());
  assert.equal(jobService.all().length, 1, 'public jobs stay visible even when stale employer auth expires mid-flight');
  assert.equal(jobService.all()[0].id, '51');
  assert.equal(jobService.mine().length, 0);
});
