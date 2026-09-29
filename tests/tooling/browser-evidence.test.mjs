import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyBrowserReport } from '../../scripts/browser-evidence.mjs';

const expected = { runId: 'run-1', version: '0.7.5', sha256: 'abc', ids: ['case-1'] };
const encoded = (value) => Buffer.from(JSON.stringify(value)).toString('base64');
function valid() {
  return {
    config: {
      metadata: {
        runId: expected.runId,
        version: expected.version,
        artifactSha256: expected.sha256,
      },
    },
    suites: [
      {
        specs: [
          {
            id: 'case-1',
            title: 'caso observable',
            ok: true,
            tests: [
              {
                expectedStatus: 'passed',
                status: 'expected',
                annotations: [{ type: 'artifact-sha256', description: 'abc' }],
                results: [
                  {
                    status: 'passed',
                    retry: 0,
                    errors: [],
                    attachments: [
                      { name: 'runtime-errors', body: encoded([]) },
                      { name: 'everett-trace', body: encoded([{ event: 'ready' }]) },
                      { name: 'screenshot', path: 'screenshot.png' },
                      { name: 'trace', path: 'trace.zip' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    errors: [],
    stats: { expected: 1, unexpected: 0, skipped: 0, flaky: 0 },
  };
}

test('HARNESS-07: el informe de navegador exige todos los casos y el mismo artefacto', () => {
  assert.equal(verifyBrowserReport(valid(), expected).length, 1);
  for (const key of ['runId', 'version', 'sha256'])
    assert.throws(() => verifyBrowserReport(valid(), { ...expected, [key]: 'otro' }));
  assert.throws(() => verifyBrowserReport(valid(), { ...expected, ids: ['case-1', 'case-2'] }));
  for (const mutate of [
    (r) => {
      r.suites = [];
    },
    (r) => {
      r.suites.push(r.suites[0]);
    },
    (r) => {
      r.errors.push({ message: 'interrumpido' });
    },
    (r) => {
      r.stats.skipped = 1;
    },
    (r) => {
      r.stats.unexpected = 1;
    },
    (r) => {
      r.stats.flaky = 1;
    },
    (r) => {
      r.suites[0].specs[0].tests[0].results[0].status = 'failed';
    },
    (r) => {
      r.suites[0].specs[0].tests[0].expectedStatus = 'failed';
    },
    (r) => {
      r.suites[0].specs[0].tests[0].results[0].retry = 1;
    },
    (r) => {
      r.suites[0].specs[0].tests[0].annotations = [];
    },
    (r) => {
      r.suites[0].specs[0].tests[0].results[0].attachments.pop();
    },
    (r) => {
      r.suites[0].specs[0].tests[0].results[0].attachments[0].body = encoded(['error']);
    },
    (r) => {
      r.suites[0].specs[0].tests[0].results[0].attachments[1].body = encoded([]);
    },
  ]) {
    const report = valid();
    mutate(report);
    assert.throws(() => verifyBrowserReport(report, expected));
  }
});
