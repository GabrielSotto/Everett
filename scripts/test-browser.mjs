import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyBuild, verifyServedArtifact } from './artifact-evidence.mjs';
import { withTestRun } from './output-runs.mjs';
import { runProcess } from './run-process.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
await verifyServedArtifact(process.env.EVERETT_TEST_URL, await verifyBuild(root));
await withTestRun(root, 'navegador', async ({ runId, directory }) => {
  process.env.EVERETT_BROWSER_RUN_ID = runId;
  const result = await runProcess(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
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
});
