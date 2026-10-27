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
                      { name: 'controls-used', body: encoded([]) },
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
    (r) => {
      r.suites[0].specs[0].tests[0].results[0].attachments[1].body = encoded([
        { event: 'error', level: 'error' },
      ]);
    },
  ]) {
    const report = valid();
    mutate(report);
    assert.throws(() => verifyBrowserReport(report, expected));
  }
});

test('HARNESS-14: rechaza controles ausentes, programáticos u ocultos aunque las aserciones y el HTML estén aprobados', () => {
  const report = valid();
  const spec = report.suites[0].specs[0];
  spec.title = 'C08-B05: importación visible';
  const controls = spec.tests[0].results[0].attachments.find(
    (item) => item.name === 'controls-used',
  );
  for (const uses of [
    [],
    [{ action: 'canvas-import', trusted: false, visible: true }],
    [{ action: 'canvas-import', trusted: true, visible: false }],
    [{ action: 'otra', trusted: true, visible: true }],
  ]) {
    controls.body = encoded(uses);
    assert.throws(() => verifyBrowserReport(report, expected), /Falta entrada visible/);
  }
  controls.body = encoded([{ action: 'canvas-import', trusted: true, visible: true }]);
  assert.equal(verifyBrowserReport(report, expected).length, 1);
  controls.body = encoded({ action: 'canvas-import' });
  assert.throws(() => verifyBrowserReport(report, expected), /Registro de controles inválido/);
  spec.tests[0].results[0].attachments = spec.tests[0].results[0].attachments.filter(
    (item) => item.name !== 'controls-used',
  );
  assert.throws(() => verifyBrowserReport(report, expected), /Falta controls-used/);
});

test('HARNESS-DEV: distingue evidencia de fuentes y de HTML y rechaza tipos y hashes cruzados', () => {
  const report = valid();
  const meta = report.config.metadata;
  meta.targetKind = 'development';
  meta.sourceSha256 = expected.sha256;
  delete meta.artifactSha256;
  const annotation = report.suites[0].specs[0].tests[0].annotations[0];
  annotation.type = 'source-sha256';
  assert.equal(verifyBrowserReport(report, { ...expected, kind: 'development' }).length, 1);
  assert.throws(() => verifyBrowserReport(report, expected), /tipo de objetivo/);
  assert.throws(
    () => verifyBrowserReport(report, { ...expected, kind: 'development', sha256: 'otro' }),
    /otras fuentes/,
  );
  annotation.type = 'artifact-sha256';
  assert.throws(
    () => verifyBrowserReport(report, { ...expected, kind: 'development' }),
    /objetivo cargado/,
  );
});
