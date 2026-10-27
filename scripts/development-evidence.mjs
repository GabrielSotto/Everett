import { glob, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { sha256 } from './artifact-evidence.mjs';

export async function developmentIdentity(root) {
  const paths = [
    'index.html',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.mjs',
    'scripts/development.mjs',
    'scripts/development-evidence.mjs',
    'scripts/artifact-evidence.mjs',
  ];
  for (const pattern of ['src/**/*', 'scripts/link-preview/**/*.mjs'])
    for await (const entry of glob(pattern, { cwd: root, withFileTypes: true }))
      if (entry.isFile())
        paths.push(relative(root, resolve(entry.parentPath, entry.name)).replaceAll('\\', '/'));
  const sourceHashes = await Promise.all(
    [...new Set(paths)].sort().map(async (path) => ({
      path,
      sha256: sha256(await readFile(resolve(root, path))),
    })),
  );
  const { version } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  return {
    kind: 'development',
    version,
    sha256: sha256(JSON.stringify(sourceHashes)),
    sourceHashes,
  };
}

export async function verifyDevelopment(root, recorded) {
  const current = await developmentIdentity(root);
  if (JSON.stringify(current) !== JSON.stringify(recorded))
    throw new Error('Las fuentes de desarrollo cambiaron desde la ejecución evaluada.');
  return current;
}

export async function verifyServedDevelopment(url, expected) {
  const response = await fetch(new URL('/__everett/development', url), {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Identidad de desarrollo: HTTP ${response.status}.`);
  const served = await response.json();
  if (JSON.stringify(served) !== JSON.stringify(expected))
    throw new Error('El servidor de desarrollo no corresponde a las fuentes evaluadas.');
}
