import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  sha256,
  verifyBuild,
  verifyRunIdentity,
  verifySourceHashes,
  inside,
  verifyServedArtifact,
} from '../../scripts/artifact-evidence.mjs';
import { runProcess } from '../../scripts/run-process.mjs';

test('HARNESS-12: rechaza un servidor detenido, un error HTTP y un HTML distinto antes de abrir el navegador', async () => {
  const html = '<html>artefacto actual</html>';
  const manifest = { bytes: Buffer.byteLength(html), sha256: sha256(html) };
  let content = html;
  let status = 200;
  const server = createServer((_, response) => {
    response.writeHead(status, { 'Content-Type': 'text/html', Connection: 'close' });
    response.end(content);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    await verifyServedArtifact(url, manifest);
    content = '<html>otro artefacto</html>';
    await assert.rejects(verifyServedArtifact(url, manifest), /build actual/);
    status = 404;
    await assert.rejects(verifyServedArtifact(url, manifest), /HTTP 404/);
    await assert.rejects(verifyServedArtifact('file:///prototipo.html', manifest), /HTTP/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  await assert.rejects(verifyServedArtifact(url, manifest), /fetch failed/);
});

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
