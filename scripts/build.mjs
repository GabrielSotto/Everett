import { createHash } from 'node:crypto';
import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { rawResources } from './raw-resources.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = (data) => createHash('sha256').update(data).digest('hex');
const packageInfo = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const template = await readFile(resolve(root, 'index.html'), 'utf8');
const roughNotices = await readFile(resolve(root, 'src/assets/roughjs-notices.txt'), 'utf8');
const yogaNotice = await readFile(resolve(root, 'src/assets/yoga-license.txt'), 'utf8');
const illustrationNotice = await readFile(
  resolve(root, 'src/assets/illustrations/LICENSE'),
  'utf8',
);
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/main.ts', 'src/styles/main.css'],
  outdir: 'dist/assets',
  bundle: true,
  banner: { js: `/*!\n${roughNotices}\n${yogaNotice}\n${illustrationNotice}\n*/` },
  format: 'iife',
  platform: 'browser',
  loader: { '.webp': 'dataurl', '.png': 'dataurl' },
  plugins: [
    rawResources,
    {
      name: 'pdf-worker-inline',
      setup(builder) {
        builder.onLoad({ filter: /pdf\.worker\.mjs$/ }, async (args) => ({
          contents: await readFile(args.path, 'utf8'),
          loader: 'text',
        }));
      },
    },
  ],
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
const serverInputs = [];
for await (const path of glob('scripts/link-preview/**/*.mjs', { cwd: root }))
  serverInputs.push(path);
const inputs = [
  ...new Set([
    ...Object.keys(result.metafile.inputs).map((path) => path.replace(/\?raw$/, '')),
    'scripts/raw-resources.mjs',
    'index.html',
    'package.json',
    'package-lock.json',
    'bun.lock',
    'tsconfig.json',
    'scripts/build.mjs',
    'src/assets/roughjs-notices.txt',
    'src/assets/yoga-license.txt',
    'src/assets/illustrations/LICENSE',
    'scripts/preview.mjs',
    'scripts/local-server.mjs',
    ...serverInputs,
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
