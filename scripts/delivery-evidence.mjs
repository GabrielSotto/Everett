import { readFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import { browserSpecs, verifyBrowserReport } from './browser-evidence.mjs';
import { inside, sha256, verifyRunIdentity } from './artifact-evidence.mjs';

export async function deliveryEvidence(root, browserPath, unitPath) {
  const build = JSON.parse(await readFile(resolve(root, 'dist/build-manifest.json'), 'utf8'));
  const browserBytes = await readFile(inside(root, browserPath));
  const unitBytes = await readFile(inside(root, unitPath));
  const browser = JSON.parse(browserBytes);
  const unit = JSON.parse(unitBytes);
  const specs = verifyBrowserReport(browser, {
    runId: basename(dirname(browserPath)),
    version: build.version,
    sha256: build.sha256,
    ids: browserSpecs(browser.suites).map((spec) => spec.id),
  });
  verifyRunIdentity(unit, { runId: basename(dirname(unitPath)), version: build.version });
  const images = [];
  for (const spec of specs) {
    for (const attachment of spec.tests[0].results[0].attachments) {
      if (attachment.contentType !== 'image/png') continue;
      const bytes = attachment.path
        ? await readFile(
            inside(
              resolve(root, dirname(browserPath)),
              relative(resolve(root, dirname(browserPath)), resolve(root, attachment.path)),
            ),
          )
        : Buffer.from(attachment.body ?? '', 'base64');
      if (!bytes.length) throw new Error(`Captura vacía: ${spec.title}`);
      const label = `${spec.title.slice(0, 75)}-${attachment.name}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
        .slice(0, 120);
      images.push({
        path: `images/${String(images.length + 1).padStart(3, '0')}-${label}.png`,
        case: spec.title,
        name: attachment.name,
        sha256: sha256(bytes),
        bytes,
      });
    }
  }
  const summary = {
    version: build.version,
    buildId: build.buildId,
    artifact: { path: `dist/${build.artifact}`, bytes: build.bytes, sha256: build.sha256 },
    browser: {
      path: browserPath,
      sha256: sha256(browserBytes),
      runId: browser.config.metadata.runId,
      startTime: browser.stats.startTime,
      durationMs: browser.stats.duration,
      cases: specs.length,
    },
    unit: {
      path: unitPath,
      sha256: sha256(unitBytes),
      runId: unit.runId,
      startedAt: unit.startedAt,
      finishedAt: unit.finishedAt,
      cases: unit.summary.tests,
    },
    cases: specs.map((spec) => ({
      id: spec.id,
      title: spec.title,
      durationMs: spec.tests[0].results[0].duration,
    })),
    images: images.map(({ bytes, ...image }) => image),
  };
  return { summary, images };
}

export function deliveryMarkdown(summary, reportDirectory) {
  const link = (path) => relative(reportDirectory, path).replaceAll('\\', '/');
  return `# Everett ${summary.version} — ejecución verificada

Build: \`${summary.buildId}\`. HTML: ${summary.artifact.bytes} bytes, SHA-256 \`${summary.artifact.sha256}\`.

| Comprobación | Casos aprobados | Inicio | Duración |
| --- | ---: | --- | ---: |
| Navegador | ${summary.browser.cases} | ${summary.browser.startTime} | ${(summary.browser.durationMs / 1000).toFixed(3)} s |
| Lógica y herramientas | ${summary.unit.cases} | ${summary.unit.startedAt} | ${((Date.parse(summary.unit.finishedAt) - Date.parse(summary.unit.startedAt)) / 1000).toFixed(3)} s |

[HTML](${link(summary.artifact.path)}) · [Resultado de navegador](${link(summary.browser.path)}) · [Resultado unitario](${link(summary.unit.path)}) · [Informe navegable](${link(dirname(summary.browser.path) + '/report/index.html')})

Este informe deriva de las ejecuciones verificadas. La [revisión de alcance y robustez](${link(`output/revision/${summary.version}/revision.md`)}) registra los hallazgos y límites. La aprobación del usuario completa el cierre de producto.

## Casos ejecutados

${summary.cases.map((item) => `- ${item.title} (${(item.durationMs / 1000).toFixed(3)} s)`).join('\n')}

## Capturas de esta ejecución

Cada imagen conserva el hash del adjunto original. Las capturas de controles negativos muestran alteraciones deliberadas identificadas por su caso.

${summary.images.map((image) => `- [${image.case} · ${image.name}](${image.path}) — \`${image.sha256}\``).join('\n')}
`;
}

export async function verifyDeliveryReport(root, directory, evidence) {
  const actual = JSON.parse(await readFile(inside(root, directory + '/summary.json'), 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(evidence.summary))
    throw new Error('El resumen no corresponde a las ejecuciones actuales.');
  const markdown = await readFile(inside(root, directory + '/informe.md'), 'utf8');
  if (markdown !== deliveryMarkdown(evidence.summary, directory))
    throw new Error('El informe contiene datos distintos de la evidencia.');
  for (const image of evidence.images) {
    if (sha256(await readFile(inside(root, directory + '/' + image.path))) !== image.sha256)
      throw new Error(`La captura no corresponde al caso: ${image.path}`);
  }
}
