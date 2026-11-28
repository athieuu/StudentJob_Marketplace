const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepare, values } = require('./import-synthetic-jobs');

const sample = { title: 'Thực tập', category: 'Technology', employmentType: 'Thực tập', salaryMin: 0, salaryMax: 100, location: 'Hà Nội', workMode: 'Kết hợp', deadline: '2027-01-02', status: 'Đang mở', description: 'Mô tả', responsibilities: 'Một\nHai', requirements: 'Ba\nBốn', skills: 'Một, Hai' };

test('maps internship and preserves source text', () => {
  const row = prepare([sample])[0];
  const result = values(row, 7);
  assert.equal(result[6], 'INTERNSHIP');
  assert.deepEqual(result.slice(10, 15), [sample.category, sample.workMode, sample.responsibilities, sample.requirements, sample.skills]);
  assert.equal(row.fingerprint, prepare([{ ...sample }])[0].fingerprint);
});

test('rejects unknown values, duplicate content, bad dates and unexpected fields', () => {
  for (const input of [[sample, sample], [{ ...sample, employmentType: 'Unknown' }], [{ ...sample, deadline: '2027-02-30' }], [{ ...sample, salaryMin: 101 }], [{ ...sample, extra: true }]]) {
    assert.throws(() => prepare(input));
  }
});
