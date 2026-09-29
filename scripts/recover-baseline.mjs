import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const expectedHash = '1389917ed01c2bac74933f10e4e44b4c0fcfd1eb659cd5b33340bf8fe5bf0ccc';
const original = await readFile(resolve(root, 'Everett-0.7.5.html'));
const digest = (content) => createHash('sha256').update(content).digest('hex');

if (digest(original) !== expectedHash) {
  throw new Error('El HTML de referencia no coincide con el SHA-256 recibido.');
}

const html = original.toString('utf8');
const encodedMap = html.match(
  /sourceMappingURL=data:application\/json[^,\r\n]*;base64,([A-Za-z0-9+/=]+)/,
)?.[1];
if (!encodedMap) throw new Error('El HTML no contiene el source map esperado.');
const sourceMap = JSON.parse(Buffer.from(encodedMap, 'base64').toString('utf8'));
if (!Array.isArray(sourceMap.sections)) throw new Error('Source map sin secciones.');

const files = new Map();
for (const section of sourceMap.sections) {
  const { sources, sourcesContent } = section.map ?? {};
  if (
    !Array.isArray(sources) ||
    !Array.isArray(sourcesContent) ||
    sources.length !== sourcesContent.length
  ) {
    throw new Error('Una sección del source map está incompleta.');
  }
  for (let index = 0; index < sources.length; index++) {
    const path = sources[index];
    const content = sourcesContent[index];
    if (
      typeof path !== 'string' ||
      !/^src\/(?:[a-z][a-z0-9-]*\/)*[a-z][a-z0-9-]*\.ts$/.test(path)
    ) {
      throw new Error('El source map contiene una ruta de fuente inesperada.');
    }
    if (typeof content !== 'string' || files.has(path)) {
      throw new Error(`Fuente ausente o duplicada: ${path}`);
    }
    files.set(path, content);
  }
}
if (files.size !== 59) throw new Error(`Se esperaban 59 fuentes y se encontraron ${files.size}.`);

const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
if (!css) throw new Error('El HTML no contiene la hoja de estilos esperada.');
files.set('src/styles/main.css', css);
files.set(
  'index.html',
  html
    .replace(
      /<meta name="everett-build" content="[^"]*">/,
      '<meta name="everett-build" content="{{BUILD_ID}}">',
    )
    .replace(/<style>[\s\S]*?<\/style>/, '<!-- EVERETT_STYLES -->')
    .replace(/<script>[\s\S]*<\/script>/, '<!-- EVERETT_SCRIPT -->'),
);

const manifest = {
  source: 'Everett-0.7.5.html',
  sha256: expectedHash,
  files: [...files].map(([path, content]) => ({
    path,
    sha256: digest(content),
    bytes: Buffer.byteLength(content),
  })),
};
files.set('docs/baseline-manifest.json', JSON.stringify(manifest, null, 2) + '\n');

// La recuperación es inicial: nunca sobrescribe fuentes que ya se estén manteniendo.
for (const path of files.keys()) {
  try {
    await readFile(resolve(root, path));
    throw new Error(`La recuperación sobrescribiría ${path}.`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
for (const [path, content] of files) {
  await mkdir(dirname(resolve(root, path)), { recursive: true });
  await writeFile(resolve(root, path), content, { encoding: 'utf8', flag: 'wx' });
}
console.log(`Recuperadas 59 fuentes, estilos y plantilla. SHA-256 de origen: ${expectedHash}`);
