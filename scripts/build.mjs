import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = (data) => createHash('sha256').update(data).digest('hex');
const packageInfo = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const template = await readFile(resolve(root, 'index.html'), 'utf8');
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/main.ts', 'src/styles/main.css'],
  outdir: 'dist/assets',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  loader: { '.webp': 'dataurl', '.png': 'dataurl' },
  target: 'es2023',
  sourcemap: 'inline',
  metafile: true,
  write: false,
  define: { __EVERETT_VERSION__: JSON.stringify(packageInfo.version) },
});
const script = result.outputFiles.find((file) => file.path.endsWith('.js'))?.text;
const styles = result.outputFiles.find((file) => file.path.endsWith('.css'))?.text;
if (!script || !styles) throw new Error('El build no produjo JavaScript y CSS.');
for (const marker of ['<!-- EVERETT_STYLES -->', '<!-- EVERETT_SCRIPT -->', '{{BUILD_ID}}']) {
  if (template.split(marker).length !== 2)
    throw new Error(`Marcador de plantilla inválido: ${marker}`);
}

const buildId = hash(packageInfo.version + template + script + styles).slice(0, 16);
const html = template
  .replace('{{BUILD_ID}}', buildId)
  .replace('<!-- EVERETT_STYLES -->', () => `<style>${styles}</style>`)
  .replace(
    '<!-- EVERETT_SCRIPT -->',
    () => `<script>${script.replace(/<\/script/gi, '<\\/script')}</script>`,
  );
const artifact = `Everett-${packageInfo.version}.html`;
const inputs = [
  ...new Set([
    ...Object.keys(result.metafile.inputs),
    'index.html',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'scripts/build.mjs',
  ]),
].sort();
const sourceHashes = await Promise.all(
  inputs.map(async (path) => ({
    path,
    sha256: hash(await readFile(resolve(root, path))),
  })),
);
await mkdir(resolve(root, 'dist'), { recursive: true });
await writeFile(resolve(root, 'dist', artifact), html);
await writeFile(
  resolve(root, 'dist/build-manifest.json'),
  JSON.stringify(
    {
      version: packageInfo.version,
      buildId,
      artifact,
      sha256: hash(html),
      bytes: Buffer.byteLength(html),
      sourceHashes,
    },
    null,
    2,
  ) + '\n',
);
console.log(`${artifact}: ${Buffer.byteLength(html)} bytes, SHA-256 ${hash(html)}`);
