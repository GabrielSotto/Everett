import { latestTestResult } from './output-runs.mjs';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inside, verifyBuild, verifySourceHashes } from './artifact-evidence.mjs';
import { browserSpecs, verifyBrowserReport } from './browser-evidence.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const supplied = process.argv[2] ?? (await latestTestResult(root, 'navegador'));
if (!supplied) throw new Error('Indicá el results.json de la ejecución de navegador.');
const path = resolve(root, supplied);
const report = JSON.parse(await readFile(path, 'utf8'));
const manifest = await verifyBuild(root);
const discovery = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', '--list', '--reporter=json'],
  {
    cwd: root,
    env: {
      ...process.env,
      EVERETT_TEST_URL: report.config?.metadata?.target,
      EVERETT_BROWSER_RUN_ID: report.config?.metadata?.runId,
    },
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
  },
);
if (discovery.error || discovery.status !== 0 || discovery.signal)
  throw new Error(
    `No se pudo descubrir el conjunto de pruebas: ${discovery.error?.message ?? discovery.stderr}`,
  );
const inventory = JSON.parse(discovery.stdout);
if (inventory.errors?.length) throw new Error('Falló el descubrimiento de casos.');
const specs = verifyBrowserReport(report, {
  runId: basename(dirname(path)),
  version: manifest.version,
  sha256: manifest.sha256,
  ids: browserSpecs(inventory.suites).map((spec) => spec.id),
});
await verifySourceHashes(root, report.config.metadata.sourceHashes);
const recordedPaths = report.config.metadata.sourceHashes.map((item) => item.path).sort();
const currentPaths = inventory.config.metadata.sourceHashes.map((item) => item.path).sort();
if (JSON.stringify(recordedPaths) !== JSON.stringify(currentPaths))
  throw new Error('Cambió el conjunto de fuentes del arnés.');
for (const spec of specs) {
  for (const attachment of spec.tests[0].results[0].attachments) {
    if (!attachment.path) continue;
    const local = relative(dirname(path), resolve(attachment.path));
    const bytes = await readFile(inside(dirname(path), local));
    if (!bytes.length) throw new Error(`Adjunto vacío: ${attachment.name}.`);
  }
}
await readFile(resolve(dirname(path), 'report/index.html'));
console.log(
  `Evidencia vigente: ${specs.length} casos descubiertos y aprobados, SHA-256 ${manifest.sha256}.`,
);
