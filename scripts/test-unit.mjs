import { createHash } from 'node:crypto';
import { glob, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { withTestRun } from './output-runs.mjs';
import { parseTapSummary } from './test-evidence.mjs';
import { runProcess } from './run-process.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = [];
for (const pattern of ['tests/unit/**/*.test.ts', 'tests/tooling/**/*.test.mjs']) {
  for await (const path of glob(pattern, { cwd: root })) files.push(path);
}
files.sort();
if (files.length === 0) throw new Error('No se encontraron pruebas unitarias.');
await withTestRun(root, 'unitarias', async ({ runId, directory: destination }) => {
  const temporary = await mkdtemp(join(tmpdir(), 'everett-unit-'));
  try {
    const packageInfo = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
    const compiled = await build({
      absWorkingDir: root,
      entryPoints: files,
      outdir: temporary,
      outbase: 'tests',
      bundle: true,
      platform: 'node',
      target: 'node24',
      format: 'esm',
      outExtension: { '.js': '.mjs' },
      define: { __EVERETT_VERSION__: JSON.stringify(packageInfo.version) },
      metafile: true,
    });
    const testFiles = Object.keys(compiled.metafile.outputs).map((path) => resolve(root, path));
    const sourceHashes = [];
    const assets = JSON.parse(await readFile(resolve(root, 'docs/asset-manifest.json'), 'utf8'));
    for (const path of [
      ...new Set([
        ...Object.keys(compiled.metafile.inputs),
        ...assets.map((asset) => asset.path),
        'docs/asset-manifest.json',
        'Everett-0.7.5.html',
        'scripts/test-unit.mjs',
        'scripts/run-process.mjs',
        'scripts/output-runs.mjs',
        'scripts/package.ps1',
        'scripts/report.mjs',
        'scripts/verify-browser.mjs',
        'scripts/verify-unit.mjs',
        'package.json',
        'package-lock.json',
        'tsconfig.json',
      ]),
    ].sort()) {
      sourceHashes.push({
        path,
        sha256: createHash('sha256')
          .update(await readFile(resolve(root, path)))
          .digest('hex'),
      });
    }
    const startedAt = new Date().toISOString();
    const execution = await runProcess(
      process.execPath,
      [
        '--test',
        '--test-isolation=none',
        '--test-reporter=tap',
        '--test-timeout=15000',
        ...testFiles,
      ],
      {
        cwd: root,
        timeoutMs: 60000,
        onStdout: (chunk) => process.stdout.write(chunk),
        onStderr: (chunk) => process.stderr.write(chunk),
      },
    );
    const { stdout, stderr, exitCode } = execution;
    await writeFile(resolve(destination, 'stdout.tap'), stdout);
    await writeFile(resolve(destination, 'stderr.log'), stderr);
    let summary = null;
    let evidenceError = null;
    try {
      if (execution.startError) throw new Error(execution.startError);
      if (execution.timedOut) throw new Error('La ejecución excedió el tiempo máximo.');
      if (execution.signal) throw new Error(`La ejecución fue interrumpida: ${execution.signal}`);
      summary = parseTapSummary(stdout, exitCode);
    } catch (error) {
      evidenceError = error.message;
    }
    const result = {
      runId,
      version: packageInfo.version,
      startedAt,
      finishedAt: new Date().toISOString(),
      runtime: process.version,
      platform: process.platform,
      files,
      sourceHashes,
      exitCode,
      signal: execution.signal,
      timedOut: execution.timedOut,
      startError: execution.startError,
      status: evidenceError ? 'failed' : 'passed',
      summary,
      evidenceError,
    };
    await writeFile(resolve(destination, 'result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(`Evidencia: ${relative(root, destination)}`);
    if (evidenceError) {
      console.error(evidenceError);
      process.exitCode = 1;
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
