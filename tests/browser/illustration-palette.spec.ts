import { expect, test } from './fixtures';

test('C08-B212: cada tinta ofrecida cambia el dibujo sin alterar su silueta @development', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const modulePath = '/src/features/canvas/illustrations.ts';
    const lib: typeof import('../../src/features/canvas/illustrations') = await import(modulePath);
    const catalog = await lib.loadIllustrations();
    const surface = document.createElement('canvas');
    surface.width = surface.height = 96;
    const ctx = surface.getContext('2d', { willReadFrequently: true })!;
    async function pixels(blob: Blob) {
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        ctx.clearRect(0, 0, 96, 96);
        ctx.drawImage(image, 0, 0, 96, 96);
        return ctx.getImageData(0, 0, 96, 96).data;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    let inks = 0;
    const errors: string[] = [];
    for (const item of catalog) {
      const original = await pixels(lib.illustrationBlob(item));
      const colors = lib.drawingColors(item);
      if (!colors.length) errors.push(item.id + ': sin paleta');
      for (const ink of colors) {
        inks++;
        const replacement = ink === '#81ff04' ? '#ff05e1' : '#81ff04';
        const variant = { ...item, colors: new Map([[ink, replacement]]) };
        const restored = await lib.illustrationFromAsset(lib.illustrationAsset(variant));
        const after = await pixels(lib.illustrationBlob(restored!));
        let changed = false;
        for (let i = 0; i < original.length; i += 4) {
          const difference =
            original[i] !== after[i] ||
            original[i + 1] !== after[i + 1] ||
            original[i + 2] !== after[i + 2];
          changed ||= difference;
          // Un borde suavizado puede variar un nivel por redondeo al componer colores.
          if (Math.abs(after[i + 3]! - original[i + 3]!) > 2) {
            errors.push(
              item.id + ': silueta ' + ink + ' ' + original[i + 3] + ' → ' + after[i + 3],
            );
            break;
          }
        }
        if (!changed) errors.push(item.id + ': tinta invisible ' + ink);
      }
    }
    return { drawings: catalog.length, inks, errors };
  });
  await info.attach('paletas', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.errors).toEqual([]);
  expect(result.drawings).toBeGreaterThanOrEqual(319);
});
