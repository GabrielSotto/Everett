import { readFile } from 'node:fs/promises';

/** Mismo contrato de ?raw que Vite, para el arnés y el formato histórico. */
export const rawResources = {
  name: 'library-resources-inline',
  setup(builder) {
    builder.onLoad({ filter: /\.(css|svg)$/ }, async (args) =>
      args.suffix === '?raw'
        ? { contents: await readFile(args.path, 'utf8'), loader: 'text' }
        : undefined,
    );
  },
};
