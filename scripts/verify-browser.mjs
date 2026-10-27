import { latestTestResult } from './output-runs.mjs';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inside, verifyBuild, verifySourceHashes } from './artifact-evidence.mjs';
import { verifyCanvasCoverage, verifyContractInventory } from './canvas-contracts.mjs';
import { browserSpecs, verifyBrowserReport } from './browser-evidence.mjs';
import { verifyDevelopment } from './development-evidence.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const supplied = process.argv[2] ?? (await latestTestResult(root, 'navegador'));
if (!supplied) throw new Error('Indicá el results.json de la ejecución de navegador.');
const path = resolve(root, supplied);
const report = JSON.parse(await readFile(path, 'utf8'));
const kind = report.config?.metadata?.targetKind ?? 'artifact';
if (!['development', 'artifact'].includes(kind)) throw new Error('Tipo de objetivo inválido.');
const manifest =
  kind === 'development'
    ? await verifyDevelopment(root, report.config.metadata.targetIdentity)
    : await verifyBuild(root);
if (kind === 'development') {
  const recorded = JSON.parse(await readFile(resolve(dirname(path), 'target.json'), 'utf8'));
  if (JSON.stringify(recorded) !== JSON.stringify(manifest))
    throw new Error('Identidad de ejecución contradictoria.');
}
const discovery = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', '--list', '--reporter=json'],
  {
    cwd: root,
    env: {
      ...process.env,
      EVERETT_TEST_URL: report.config?.metadata?.target,
      EVERETT_BROWSER_RUN_ID: report.config?.metadata?.runId,
      EVERETT_TEST_KIND: kind,
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
  kind,
  ids: browserSpecs(inventory.suites).map((spec) => spec.id),
});
verifyContractInventory(await readFile(resolve(root, 'docs/iteraciones/0.8.md'), 'utf8'));
verifyCanvasCoverage(
  'browser',
  specs.map((spec) => spec.title),
  { targetKind: kind },
);
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
  `Evidencia vigente (${kind}): ${specs.length} casos descubiertos y aprobados, SHA-256 ${manifest.sha256}.`,
);
