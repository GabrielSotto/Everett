// Sincroniza nombres, SVG y módulo estático. Los símbolos siguen disponibles sin red.
import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { symbolNames } from '../design/wireframe-library/symbols.js';
const folder = new URL('../design/wireframe-library/vendor/', import.meta.url);
const { icons } = JSON.parse(await readFile(new URL('sources.json', folder), 'utf8'));
const ids = Object.keys(symbolNames);
for (let start = 0; start < ids.length; start += 8)
  await Promise.all(
    ids.slice(start, start + 8).map(async (id) => {
      const path = new URL(id + '.svg', folder);
      try {
        await readFile(path);
        return;
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      const r = await fetch(
        'https://raw.githubusercontent.com/phosphor-icons/core/' +
          icons.commit +
          '/assets/regular/' +
          id +
          '.svg',
      );
      if (!r.ok) throw Error('No se pudo obtener ' + id + ': ' + r.status);
      const raw = await r.text();
      if (!raw.startsWith('<svg ') || /<script|<image|\bon\w+=/i.test(raw))
        throw Error('Revisar ' + id);
      await writeFile(path, raw.trimEnd() + '\n');
    }),
  );
const lines = ids.map(
  (id, i) =>
    'import svg' + i + " from '../../../../design/wireframe-library/vendor/" + id + ".svg?raw';",
);
lines.push(
  'const symbols: Record<string, string> = {',
  ...ids.map(
    (id, i) =>
      '  ' + JSON.stringify(id) + ": 'data:image/svg+xml,' + encodeURIComponent(svg" + i + '),',
  ),
  '};',
  'export function librarySymbol(name: string): string {',
  '  const source = symbols[name];',
  "  if (!source) throw new Error('El símbolo de esta pieza no está disponible. Elegí otra variante.');",
  '  return source;',
  '}',
);
const formatted = await format(lines.join('\n'), {
  ...(await resolveConfig('src/features/canvas/library/symbols.ts')),
  parser: 'typescript',
});
await writeFile(new URL('../src/features/canvas/library/symbols.ts', import.meta.url), formatted);
console.log(ids.length + ' símbolos.');
