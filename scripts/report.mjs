import { removeOutput } from './output-runs.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { deliveryEvidence, deliveryMarkdown, verifyDeliveryReport } from './delivery-evidence.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const [browserPath, unitPath] = process.argv.slice(2);
if (!browserPath || !unitPath)
  throw new Error('Indicá results.json de navegador y result.json unitario.');
for (const [script, path] of [
  ['verify-browser', browserPath],
  ['verify-unit', unitPath],
]) {
  const result = spawnSync(process.execPath, [`scripts/${script}.mjs`, path], {
    cwd: root,
    stdio: 'inherit',
    timeout: 60_000,
  });
  if (result.error || result.status !== 0)
    throw new Error(`Falló ${script}: ${result.error?.message ?? result.status}`);
}
const evidence = await deliveryEvidence(root, browserPath, unitPath);
const directory = 'output/informe';
await removeOutput(root, directory);
await mkdir(resolve(root, directory, 'images'), { recursive: true });
for (const image of evidence.images)
  await writeFile(resolve(root, directory, image.path), image.bytes);
await writeFile(
  resolve(root, directory, 'summary.json'),
  JSON.stringify(evidence.summary, null, 2) + '\n',
);
await writeFile(
  resolve(root, directory, 'informe.md'),
  deliveryMarkdown(evidence.summary, directory),
);
await verifyDeliveryReport(root, directory, evidence);
console.log(`Informe verificado: ${directory}/informe.md`);
