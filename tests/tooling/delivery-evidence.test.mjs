import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  deliveryEvidence,
  deliveryMarkdown,
  verifyDeliveryReport,
} from '../../scripts/delivery-evidence.mjs';

test('HARNESS-08: rechaza cifras, fechas y capturas del informe distintas de la ejecución', async () => {
  const root = await mkdtemp(join(tmpdir(), 'everett-delivery-'));
  const browserPath = 'output/pruebas/navegador/browser-run/results.json';
  const unitPath = 'output/pruebas/unitarias/unit-run/result.json';
  const directory = 'output/informe';
  const encoded = (value) => Buffer.from(JSON.stringify(value)).toString('base64');
  try {
    for (const path of [
      'dist',
      'output/pruebas/navegador/browser-run',
      'output/pruebas/unitarias/unit-run',
      directory + '/images',
    ])
      await mkdir(join(root, path), { recursive: true });
    const build = {
      version: '0.7.5',
      sha256: 'abc',
      buildId: 'build',
      bytes: 100,
      artifact: 'Everett-0.7.5.html',
    };
    const browser = {
      config: {
        metadata: { version: build.version, runId: 'browser-run', artifactSha256: build.sha256 },
      },
      stats: {
        expected: 1,
        unexpected: 0,
        skipped: 0,
        flaky: 0,
        startTime: '2026-09-29T14:40:18.243Z',
        duration: 2000,
      },
      errors: [],
      suites: [
        {
          specs: [
            {
              id: 'case-1',
              title: 'Recorrido real',
              ok: true,
              tests: [
                {
                  expectedStatus: 'passed',
                  status: 'expected',
                  annotations: [{ type: 'artifact-sha256', description: build.sha256 }],
                  results: [
                    {
                      status: 'passed',
                      retry: 0,
                      errors: [],
                      duration: 1000,
                      attachments: [
                        { name: 'runtime-errors', body: encoded([]) },
                        { name: 'everett-trace', body: encoded([{ event: 'ready' }]) },
                        {
                          name: 'screenshot',
                          contentType: 'image/png',
                          body: Buffer.from('captura actual').toString('base64'),
                        },
                        { name: 'trace', path: 'trace.zip' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const unit = {
      runId: 'unit-run',
      version: build.version,
      status: 'passed',
      exitCode: 0,
      summary: { tests: 2 },
      startedAt: browser.stats.startTime,
      finishedAt: '2026-09-29T14:40:19.243Z',
    };
    await writeFile(join(root, 'dist/build-manifest.json'), JSON.stringify(build));
    await writeFile(join(root, browserPath), JSON.stringify(browser));
    await writeFile(join(root, unitPath), JSON.stringify(unit));
    const evidence = await deliveryEvidence(root, browserPath, unitPath);
    assert.match(evidence.images[0].path, /recorrido-real-screenshot\.png$/);
    const summaryPath = join(root, directory, 'summary.json');
    const reportPath = join(root, directory, 'informe.md');
    const summary = JSON.stringify(evidence.summary);
    const markdown = deliveryMarkdown(evidence.summary, directory);
    await writeFile(summaryPath, summary);
    await writeFile(reportPath, markdown);
    for (const image of evidence.images)
      await writeFile(join(root, directory, image.path), image.bytes);
    await verifyDeliveryReport(root, directory, evidence);
    assert.match(markdown, /\[HTML\]\(\.\.\/\.\.\/dist\/Everett-0\.7\.5\.html\)/);
    await writeFile(summaryPath, summary.replace('"cases":1', '"cases":99'));
    await assert.rejects(verifyDeliveryReport(root, directory, evidence), /resumen/);
    await writeFile(summaryPath, summary);
    await writeFile(
      reportPath,
      markdown.replace(browser.stats.startTime, 'fecha de otra ejecución'),
    );
    await assert.rejects(verifyDeliveryReport(root, directory, evidence), /informe/);
    await writeFile(reportPath, markdown);
    await writeFile(join(root, directory, evidence.images[0].path), 'captura anterior');
    await assert.rejects(verifyDeliveryReport(root, directory, evidence), /captura/);
    await writeFile(join(root, directory, evidence.images[0].path), evidence.images[0].bytes);
    await verifyDeliveryReport(root, directory, evidence);
    await writeFile(
      join(root, browserPath),
      (await readFile(join(root, browserPath), 'utf8')).replace(
        '"artifactSha256":"abc"',
        '"artifactSha256":"otra"',
      ),
    );
    await assert.rejects(deliveryEvidence(root, browserPath, unitPath), /otro HTML/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
