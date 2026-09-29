import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  sha256,
  verifyBuild,
  verifyRunIdentity,
  verifySourceHashes,
  inside,
} from '../../scripts/artifact-evidence.mjs';
import { runProcess } from '../../scripts/run-process.mjs';

test('HARNESS-04: detecta procesos que no inician o exceden su tiempo y los finaliza', async () => {
  const missing = await runProcess('everett-nonexistent-command-92b6', [], { timeoutMs: 1000 });
  assert.ok(missing.startError);
  assert.notEqual(missing.exitCode, 0);
  const timeout = await runProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    timeoutMs: 150,
  });
  assert.equal(timeout.timedOut, true);
  assert.notEqual(timeout.exitCode, 0);
});

test('HARNESS-05: rechaza informes de otra ejecución, versión o sin pruebas aprobadas', () => {
  const expected = { runId: 'actual', version: '0.7.5' };
  const result = { ...expected, status: 'passed', exitCode: 0, summary: { tests: 1 } };
  verifyRunIdentity(result, expected);
  for (const change of [
    null,
    {},
    { ...result, runId: 'anterior' },
    { ...result, version: '0.7.4' },
    { ...result, exitCode: 1 },
    { ...result, summary: null },
    { ...result, summary: { tests: 0 } },
  ])
    assert.throws(() => verifyRunIdentity(change, expected));
});

test('HARNESS-06: detecta HTML ausente, corrupto y construido con otras fuentes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'everett-artifact-'));
  try {
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'package.json'), JSON.stringify({ version: '0.7.5' }));
    await writeFile(join(root, 'source.ts'), 'const value = 1;');
    const sourceHashes = [{ path: 'source.ts', sha256: sha256('const value = 1;') }];
    const html = '<meta name="everett-build" content="build-test">';
    const manifest = {
      version: '0.7.5',
      artifact: 'Everett-0.7.5.html',
      buildId: 'build-test',
      sha256: sha256(html),
      bytes: Buffer.byteLength(html),
      sourceHashes,
    };
    await writeFile(join(root, 'dist/build-manifest.json'), JSON.stringify(manifest));
    await assert.rejects(verifyBuild(root), /ENOENT/);
    await writeFile(join(root, 'dist', manifest.artifact), 'HTML incompleto');
    await assert.rejects(verifyBuild(root), /no coincide/);
    await writeFile(join(root, 'dist', manifest.artifact), html);
    await verifyBuild(root);
    await writeFile(join(root, 'source.ts'), 'const value = 2;');
    await assert.rejects(verifyBuild(root), /otra revisión/);
    await assert.rejects(verifySourceHashes(root, []), /Faltan/);
    assert.throws(() => inside(root, '../outside.txt'), /fuera/);
    await writeFile(join(root, 'dist/build-manifest.json'), '');
    await assert.rejects(verifyBuild(root), SyntaxError);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('BASE-01: las 88 imágenes recuperadas conservan su contenido y el HTML original permanece íntegro', async () => {
  const root = process.cwd();
  const baseline = await readFile(join(root, 'Everett-0.7.5.html'));
  assert.equal(
    sha256(baseline),
    '1389917ed01c2bac74933f10e4e44b4c0fcfd1eb659cd5b33340bf8fe5bf0ccc',
  );
  const manifest = JSON.parse(await readFile(join(root, 'docs/asset-manifest.json'), 'utf8'));
  assert.equal(manifest.length, 88);
  await verifySourceHashes(root, manifest);
});
