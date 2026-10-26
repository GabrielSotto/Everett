import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Un resultado de regresión aprobado no oculta un fallo observado con proveedores reales. */
export function publicIssues(artifact, network, inspection) {
  const issues = [];
  for (const [name, result] of [
    ['network', network],
    ['inspection', inspection],
  ]) {
    if (result?.artifact !== artifact) issues.push(`${name}: artefacto distinto`);
    if (result?.failure) issues.push(`${name}: ${result.failure}`);
    const cases = result?.cases;
    if (!Array.isArray(cases) || !cases.length) {
      issues.push(`${name}: sin casos`);
      continue;
    }
    if (new Set(cases.map((item) => item.kind)).size !== cases.length)
      issues.push(`${name}: casos duplicados`);
    for (const item of cases)
      if (item.passed === false || item.contained === false)
        issues.push(`${item.kind}: ${item.limitation ?? 'comprobación fallida'}`);
  }
  const cases = network?.cases ?? [];
  for (const kind of ['reader', 'image', 'video']) {
    const item = cases.find((item) => item.kind === kind);
    if (
      !item?.reloadSameBytes ||
      !Number.isFinite(item.bytes) ||
      item.bytes <= 0 ||
      !/^[a-f\d]{64}$/.test(item.sha256 ?? '')
    )
      issues.push(`${kind}: bytes conservados sin acreditar`);
  }
  const provider = cases.find((item) => item.kind === 'provider');
  if (
    !provider?.playback?.playing ||
    !(provider.playback.time > 0) ||
    !(provider.playback.videoWidth > 0)
  )
    issues.push('provider: reproducción real sin acreditar');
  for (const kind of ['youtube-focused-modifier', 'youtube-parent-modifier'])
    if (cases.find((item) => item.kind === kind)?.passed !== true)
      issues.push(`${kind}: gesto no aprobado`);
  const local = cases.find((item) => item.kind === 'youtube-local-wheel');
  if (!local?.staysInside || !local.geometryStable)
    issues.push('youtube-local-wheel: rueda local sin acreditar');
  if (cases.find((item) => item.kind === 'dns-not-found')?.problem !== 'host-not-found')
    issues.push('dns-not-found: diagnóstico sin acreditar');
  for (const kind of ['visual-selected-gallery', 'visual-spatial-shortcut']) {
    const item = inspection?.cases?.find((item) => item.kind === kind);
    if (!item?.contained || item.width !== 320 || item.textScale !== 2)
      issues.push(`${kind}: adaptación sin acreditar`);
  }
  if (inspection?.cases?.find((item) => item.kind === 'inline-completion')?.acceptedBy !== 'Tab')
    issues.push('inline-completion: Tab sin acreditar');
  return [...new Set(issues)];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = new URL('../../', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('dist/build-manifest.json', root), 'utf8'));
  const directory = new URL(`output/revision/${manifest.version}/`, root);
  const network = JSON.parse(await readFile(new URL('destinos-publicos.json', directory), 'utf8'));
  const inspection = JSON.parse(
    await readFile(new URL('inspeccion-medios.json', directory), 'utf8'),
  );
  const issues = publicIssues(manifest.sha256, network, inspection);
  const result = {
    artifact: manifest.sha256,
    status: issues.length ? 'blocked' : 'passed',
    issues,
  };
  await writeFile(new URL('verificacion-publica.json', directory), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (issues.length) process.exitCode = 1;
}
