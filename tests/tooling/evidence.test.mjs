import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { parseTapSummary } from '../../scripts/test-evidence.mjs';

const summary =
  'TAP version 13\nok 1 - primer caso\nok 2 - segundo caso\n1..2\n# tests 2\n# pass 2\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';

test('HARNESS-01: solo aprueba una ejecución completa con pruebas', () => {
  assert.equal(parseTapSummary(summary, 0).pass, 2);
  for (const output of ['', summary.replace('# tests 2', '# tests 0'), summary + summary]) {
    assert.throws(() => parseTapSummary(output, 0));
  }
  for (const code of [null, 1, 2]) assert.throws(() => parseTapSummary(summary, code));
});

test('HARNESS-02: rechaza omisiones, cancelaciones, pendientes y salidas contradictorias', () => {
  for (const name of ['fail', 'cancelled', 'skipped', 'todo']) {
    assert.throws(() => parseTapSummary(summary.replace(`# ${name} 0`, `# ${name} 1`), 0));
  }
  assert.throws(() => parseTapSummary(summary.replace('# pass 2', '# pass 1'), 0));
  assert.throws(() => parseTapSummary('not ok 1 - fallo\n' + summary, 0));
  assert.throws(() => parseTapSummary(summary.replace('ok 1 - primer caso\n', ''), 0));
  assert.throws(() => parseTapSummary(summary.replace('1..2\n', ''), 0));
  assert.throws(() => parseTapSummary(summary.replace('ok 2 -', 'ok 1 -'), 0));
});

test('HARNESS-03: una aserción real fallida impide aprobar la ejecución', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      'import test from "node:test"; import assert from "node:assert/strict"; test("control negativo", () => assert.equal(1, 2));',
    ],
    { encoding: 'utf8', timeout: 5000 },
  );
  assert.ifError(result.error);
  assert.notEqual(result.status, 0);
  assert.throws(() => parseTapSummary(result.stdout, result.status));
});
