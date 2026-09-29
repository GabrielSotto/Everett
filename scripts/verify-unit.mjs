import { latestTestResult } from './output-runs.mjs';
import { glob, readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyRunIdentity, verifySourceHashes } from './artifact-evidence.mjs';
import { parseTapSummary } from './test-evidence.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const path = process.argv[2] ?? (await latestTestResult(root, 'unitarias'));
if (!path) throw new Error('Indicá el result.json de la ejecución que querés comprobar.');
const reportPath = resolve(root, path);
const result = JSON.parse(await readFile(reportPath, 'utf8'));
const packageInfo = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
verifyRunIdentity(result, { runId: basename(dirname(reportPath)), version: packageInfo.version });
if (result.timedOut || result.signal || result.startError)
  throw new Error('El proceso no finalizó normalmente.');
const tap = await readFile(resolve(dirname(reportPath), 'stdout.tap'), 'utf8');
const summary = parseTapSummary(tap, result.exitCode);
if (JSON.stringify(summary) !== JSON.stringify(result.summary))
  throw new Error('El resumen no coincide con la salida del proceso.');
const discovered = [];
for (const pattern of ['tests/unit/**/*.test.ts', 'tests/tooling/**/*.test.mjs'])
  for await (const path of glob(pattern, { cwd: root })) discovered.push(path);
if (JSON.stringify(discovered.sort()) !== JSON.stringify(result.files))
  throw new Error('Cambió el conjunto de pruebas del proyecto.');
await verifySourceHashes(root, result.sourceHashes);
console.log(`Evidencia vigente: ${result.runId}, ${summary.tests} pruebas aprobadas.`);
