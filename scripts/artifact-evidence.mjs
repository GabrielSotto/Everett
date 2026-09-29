import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

export const sha256 = (data) => createHash('sha256').update(data).digest('hex');

export function inside(root, path) {
  const absolute = resolve(root, path);
  const local = relative(root, absolute);
  if (
    !local ||
    isAbsolute(path) ||
    local === '..' ||
    local.startsWith('../') ||
    local.startsWith('..\\')
  )
    throw new Error(`Ruta de evidencia fuera del proyecto: ${path}`);
  return absolute;
}

export async function verifySourceHashes(root, entries) {
  if (!Array.isArray(entries) || entries.length === 0)
    throw new Error('Faltan hashes de las fuentes evaluadas.');
  const seen = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256))
      throw new Error('Registro de fuente inválido.');
    if (seen.has(entry.path)) throw new Error(`Fuente duplicada: ${entry.path}`);
    seen.add(entry.path);
    const bytes = await readFile(inside(root, entry.path));
    if (sha256(bytes) !== entry.sha256)
      throw new Error(`La evidencia pertenece a otra revisión de ${entry.path}.`);
  }
}

export async function verifyBuild(root) {
  const packageInfo = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(resolve(root, 'dist/build-manifest.json'), 'utf8'));
  if (manifest.version !== packageInfo.version)
    throw new Error('La versión del build es distinta de la del proyecto.');
  if (manifest.artifact !== `Everett-${packageInfo.version}.html`)
    throw new Error('Nombre de artefacto inválido.');
  const bytes = await readFile(inside(resolve(root, 'dist'), manifest.artifact));
  if (bytes.length !== manifest.bytes || sha256(bytes) !== manifest.sha256)
    throw new Error('El HTML no coincide con su manifiesto.');
  if (!bytes.toString().includes(`content="${manifest.buildId}"`))
    throw new Error('El HTML no contiene el identificador del build.');
  await verifySourceHashes(root, manifest.sourceHashes);
  return manifest;
}

export async function verifyServedArtifact(url, manifest) {
  if (!url || !['http:', 'https:'].includes(new URL(url).protocol))
    throw new Error('EVERETT_TEST_URL debe indicar el HTML mediante HTTP(S).');
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`El servidor devolvió HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== manifest.bytes || sha256(bytes) !== manifest.sha256)
    throw new Error('El servidor no entrega el HTML del build actual.');
}

export function verifyRunIdentity(result, expected) {
  if (!result || result.runId !== expected.runId || result.version !== expected.version)
    throw new Error('La evidencia pertenece a otra ejecución o versión.');
  if (
    result.status !== 'passed' ||
    result.exitCode !== 0 ||
    !result.summary ||
    !Number.isInteger(result.summary.tests) ||
    result.summary.tests <= 0
  )
    throw new Error('La ejecución no está aprobada.');
}
