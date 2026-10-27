import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyBuild, verifyServedArtifact } from './artifact-evidence.mjs';
import { withTestRun } from './output-runs.mjs';
import { runProcess } from './run-process.mjs';
import {
  developmentIdentity,
  verifyDevelopment,
  verifyServedDevelopment,
} from './development-evidence.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const kind = args[0] === '--artifact' ? (args.shift(), 'artifact') : 'development';
const target = process.env.EVERETT_TEST_URL ?? 'http://127.0.0.1:4173/';
const identity = kind === 'development' ? await developmentIdentity(root) : await verifyBuild(root);
if (kind === 'development') await verifyServedDevelopment(target, identity);
else await verifyServedArtifact(target, identity);
await withTestRun(root, 'navegador', async ({ runId, directory }) => {
  process.env.EVERETT_BROWSER_RUN_ID = runId;
  process.env.EVERETT_TEST_URL = target;
  process.env.EVERETT_TEST_KIND = kind;
  await writeFile(resolve(directory, 'target.json'), JSON.stringify(identity, null, 2) + '\n');
  const result = await runProcess(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test', ...args],
    {
      cwd: root,
      onStdout: (chunk) => process.stdout.write(chunk),
      onStderr: (chunk) => process.stderr.write(chunk),
    },
  );
  await writeFile(resolve(directory, 'stdout.log'), result.stdout);
  await writeFile(resolve(directory, 'stderr.log'), result.stderr);
  console.log(`Evidencia: ${directory}`);
  if (result.startError || result.signal || result.exitCode !== 0)
    throw new Error(`Falló Playwright: ${result.startError ?? result.signal ?? result.exitCode}`);
  if (kind === 'development') {
    await verifyDevelopment(root, identity);
    await verifyServedDevelopment(target, identity);
  }
});
