import { test, expect } from './fixtures';
import { start, world, capture, snapshot } from './canvas-utility-helpers';
import { entries, availableStates } from '../../design/wireframe-library/samples.js';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { libraryTile, openLibrary, librarySearch } from './sketch-library-helpers';

async function library(page: Page) {
  await page.getByRole('button', { name: 'Bosquejos', exact: true }).click();
  return page.getByRole('dialog', { name: 'Biblioteca de bosquejos' });
}

test('C08-B148: Bosquejos despliega una biblioteca acotada al botón, sin ficha previa, e inserta por selección directa', async ({
  page,
}, info) => {
  await start(page);
  const panel = await openLibrary(page);
  await expect(
    page.locator('[data-action=wireframe-add],.library-detail,.library-preview-wrap'),
  ).toHaveCount(0);
  await expect(panel.locator('[data-library-add]')).toHaveCount(24);
  await expect(panel.locator('[data-library-entry=block]')).toHaveCount(0);
  const tab = panel.getByRole('tab', { name: 'Piezas', exact: true });
  const contrast = () =>
    tab.evaluate((element) => {
      const luminance = (value: string) => {
        const channels = value
          .match(/\d+/g)!
          .slice(0, 3)
          .map(Number)
          .map((v) => v / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
      };
      const style = getComputedStyle(element),
        a = luminance(style.color),
        b = luminance(style.backgroundColor);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
  await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  await tab.evaluate((el) => (el.style.color = '#b9a5df'));
  await expect.poll(contrast, 'detectar el contraste insuficiente anterior').toBeLessThan(4.5);
  await tab.evaluate((el) => (el.style.color = ''));
  await expect(panel.locator('[data-thumbnail=block]')).toHaveAttribute('data-ready', 'true');
  await capture(page, info, 'desplegable-piezas');
  let requestedSymbols = 0;
  await page.route('**/design/wireframe-library/vendor/*.svg', (route) => {
    requestedSymbols++;
    return route.abort();
  });
  await panel.getByRole('tab', { name: 'Componentes', exact: true }).click();
  await panel.getByRole('button', { name: 'Filtrar componentes' }).click();
  await panel.getByRole('menuitemradio', { name: 'Navegación', exact: true }).click();

  await panel.locator('[data-library-entry=toolbar]').click();
  await expect(page.locator('.library-choice-options')).toBeVisible();
  await expect(panel.locator('.library-browse')).toBeVisible();

  await expect(panel.locator('[data-thumbnail=toolbar]')).toHaveAttribute('data-ready', 'true');
  expect(requestedSymbols, 'sin peticiones tardías de símbolos').toBe(0);
  await page
    .locator('.library-choice-options')
    .getByRole('button', { name: 'Cerrar opciones' })
    .click();
  await expect(panel.locator('[data-library-entry=toolbar]')).toBeFocused();
  await expect(panel.getByRole('button', { name: 'Filtrar componentes' })).toHaveAttribute(
    'title',
    'Filtrar: Navegación',
  );
  await panel.locator('[data-library-entry=toolbar]').click();
  await expect(page.locator('.library-choice-options select').first()).toBeFocused();
  await panel.locator('.library-items').hover();
  await page.mouse.wheel(0, 500);
  await expect(page.locator('.library-choice-options')).toHaveCount(0);
  await expect(panel).toBeVisible();
  await (await libraryTile(page, 'block')).click();
  await expect.poll(async () => (await world(page)).nodes.length).toBe(1);
  await expect(panel).toHaveCount(0);
  await (await libraryTile(page, 'block')).click();
  await expect.poll(async () => (await world(page)).nodes.length).toBe(2);
  await expect(panel).toHaveCount(0);
  await openLibrary(page);
  const before = await world(page);
  await (await librarySearch(page)).fill('Notificación del seguimiento internacional');
  await expect(panel.getByText(/No hay coincidencias/)).toBeVisible();
  expect((await world(page)).nodes).toEqual(before.nodes);
  await (await librarySearch(page)).fill('');
  await panel.getByRole('button', { name: 'Buscar en la biblioteca' }).click();
  for (const size of [
    { width: 1440, height: 900 },
    { width: 550, height: 668 },
    { width: 320, height: 720 },
  ]) {
    await page.setViewportSize(size);
    const box = (await panel.boundingBox())!,
      anchor = (await page.getByRole('button', { name: 'Bosquejos', exact: true }).boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(280);
    expect(box.height).toBeLessThanOrEqual(360);
    expect(Math.abs(box.y - anchor.y - anchor.height - 8)).toBeLessThan(2);
    expect(box.x).toBeGreaterThanOrEqual(8);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width - 8);
    expect(size.height - box.y - box.height).toBeGreaterThan(200);
    await capture(page, info, 'desplegable-' + size.width);
  }
  await panel.locator('.library-items').hover();
  await page.mouse.wheel(0, 2000);
  await expect
    .poll(() => panel.locator('.library-items').evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await page.setViewportSize({ width: 550, height: 360 });
  await (await librarySearch(page)).fill('');
  const shortBox = (await panel.boundingBox())!;
  expect(shortBox.y + shortBox.height).toBeLessThanOrEqual(352);
  await expect(panel.getByRole('switch', { name: 'Mostrar rótulos' })).toBeInViewport();
  await panel.locator('.library-items').hover();
  await page.mouse.wheel(0, 2000);
  await expect
    .poll(() => panel.locator('.library-items').evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await capture(page, info, 'desplegable-altura-reducida');
  await page.setViewportSize({ width: 320, height: 720 });
  await page.keyboard.press('Escape');
  await expect(panel.getByRole('button', { name: 'Buscar en la biblioteca' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Bosquejos', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Bosquejos', exact: true }).press('ArrowDown');
  await expect(panel.getByRole('tab', { name: 'Piezas', exact: true })).toBeFocused();
  await page.mouse.click(300, 650);
  await expect(panel).toHaveCount(0);
});

test('C08-B149: miniaturas de piezas centradas y distinguibles, sin depender de los espacios vacíos del catálogo', async ({
  page,
}, info) => {
  await start(page);
  const panel = await openLibrary(page);
  const png = createRequire(import.meta.url)(
    resolve('node_modules/playwright-core/lib/utilsBundle.js'),
  ).PNG as { sync: { read(buffer: Buffer): { data: Buffer; width: number; height: number } } };
  const results: { id: string; dx: number; dy: number; pixels: number }[] = [];
  for (const { id, family } of entries.filter(
    (entry) =>
      entry.family === 'base' ||
      ['button', 'icon-button', 'radio', 'steps', 'timeline'].includes(entry.id),
  )) {
    await libraryTile(page, id);
    const thumbnail = panel.locator(`[data-thumbnail="${id}"]`);
    await expect(thumbnail).toHaveAttribute('data-ready', 'true');
    const measure = async () => {
      const image = png.sync.read(await thumbnail.screenshot());
      let minX = image.width,
        minY = image.height,
        maxX = -1,
        maxY = -1,
        pixels = 0;
      for (let y = 4; y < image.height - 4; y++)
        for (let x = 4; x < image.width - 4; x++) {
          const i = (y * image.width + x) * 4;
          // Tinta oscura de la pieza: el fondo y su relleno claro no cuentan como contorno legible.
          if (
            Math.max(image.data[i]!, image.data[i + 1]!, image.data[i + 2]!) < 145 &&
            image.data[i + 3]! > 240
          ) {
            pixels++;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      return {
        id,
        dx: Math.abs((minX + maxX) / 2 - image.width / 2),
        dy: Math.abs((minY + maxY) / 2 - image.height / 2),
        pixels,
      };
    };
    const measured = await measure();
    results.push(measured);
    expect(measured.pixels, id + ': contorno reconocible').toBeGreaterThan(18);
    if (id === 'icon-button') {
      const symbol = await thumbnail.locator('.library-symbol').boundingBox();
      expect(symbol!.width, 'símbolo reconocible a escala de miniatura').toBeGreaterThanOrEqual(20);
      expect(symbol!.height).toBeGreaterThanOrEqual(20);
    }
    if (id === 'button') {
      await expect(thumbnail.locator('.library-text-bar')).toHaveCSS(
        'background-color',
        'rgb(217, 224, 232)',
      );
    }
    if (family === 'base') {
      expect(measured.dx, id + ': centrado horizontal').toBeLessThan(6);
      expect(measured.dy, id + ': centrado vertical').toBeLessThan(6);
    }
    if (id === 'ellipse') {
      const artwork = thumbnail.locator('.library-preview-artwork');
      await artwork.evaluate((el) => ((el as HTMLElement).style.opacity = '0.12'));
      expect((await measure()).pixels, 'rechazar contornos sin contraste').toBeLessThan(18);
      await artwork.evaluate((el) => ((el as HTMLElement).style.opacity = ''));
      await capture(page, info, 'miniatura-circulo-elipse');
    }
    if (id === 'dot') {
      await thumbnail
        .locator('.library-preview-artwork')
        .evaluate((el) => ((el as HTMLElement).style.marginLeft = '22px'));
      expect((await measure()).dx).toBeGreaterThan(15);
      await thumbnail
        .locator('.library-preview-artwork')
        .evaluate((el) => ((el as HTMLElement).style.marginLeft = ''));
      await capture(page, info, 'miniatura-puntos');
    }
  }
  await info.attach('centrado-de-tinta', {
    body: JSON.stringify(results),
    contentType: 'application/json',
  });
  await (await librarySearch(page)).fill('');
  await capture(page, info, 'miniaturas-centradas');
});

test('C08-B143: biblioteca crea chat compuesto editable, historial atómico y persistencia', async ({
  page,
}, info) => {
  await start(page);
  const panel = await library(page);
  await (await librarySearch(page)).fill('chat completo');
  await panel.getByRole('switch', { name: 'Mostrar rótulos' }).click();
  await expect(panel.locator('[data-thumbnail=chat]')).toHaveAttribute('data-ready', 'true');
  await capture(page, info, 'biblioteca-chat');
  await panel.locator('[data-library-add=chat]').click();
  await expect(panel).toHaveCount(0);
  const created = await world(page);
  expect(created.nodes.length).toBeGreaterThan(15);
  expect(created.canvasGroups).toHaveLength(1);
  expect(created.canvasGroups![0]!.nodes).toHaveLength(created.nodes.length);
  await expect(page.locator('.material .library-piece')).toHaveCount(created.nodes.length);
  await expect(
    page.locator('.material input,.material textarea,.material button[role=button]'),
  ).toHaveCount(0);
  await capture(page, info, 'chat-compuesto-en-canvas');
  await page.getByRole('button', { name: /Deshacer/ }).click();
  expect((await world(page)).nodes).toHaveLength(0);
  await page.getByRole('button', { name: /Rehacer/ }).click();
  expect((await world(page)).nodes).toHaveLength(created.nodes.length);
  const text = created.nodes.find(
    (n) =>
      n.data.kind === 'wireframe' &&
      n.data.content.type === 'text' &&
      n.data.content.text === 'Ana García',
  )!;
  expect(text).toBeTruthy();
  await page.locator(`[data-node="${text.id}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Desagrupar componente', exact: true }).click();
  await page.locator(`[data-node="${text.id}"]`).dblclick();
  await page.getByRole('textbox', { name: 'Contenido del bosquejo', exact: true }).fill('Gabriela');
  await expect(page.locator(`[data-node="${text.id}"] .library-piece`)).toHaveText('Gabriela');
  await page.getByRole('textbox', { name: 'Contenido del bosquejo', exact: true }).fill('Gabriel');
  await expect(page.locator(`[data-node="${text.id}"] .library-piece`)).toHaveText('Gabriel');
  await page.getByRole('textbox', { name: 'Contenido del bosquejo', exact: true }).fill('Gabriela');
  await page.getByRole('button', { name: 'Apariencia y tamaño', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Tamaño del texto', exact: true }).fill('18');
  await page.getByRole('spinbutton', { name: 'Tamaño del texto', exact: true }).press('Enter');
  await expect(page.locator(`[data-node="${text.id}"] .library-piece`)).toHaveCSS(
    'font-size',
    '18px',
  );
  await page.keyboard.press('Escape');
  await expect(page.locator(`[data-node="${text.id}"] .library-piece`)).toHaveText('Gabriela');
  await page.reload();
  await expect(page.locator(`[data-node="${text.id}"] .library-piece`)).toHaveText('Gabriela');
  await capture(page, info, 'chat-editado-recuperado');
});

test('C08-B147: un símbolo que no carga bloquea la creación y permite reintentar, editar y guardar', async ({
  page,
}, info) => {
  await start(page);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      return this.dataset.librarySymbol
        ? Promise.reject(new DOMException('Invalid image', 'EncodingError'))
        : decode.call(this);
    };
    Object.assign(window, {
      restoreLibraryDecode: () => {
        HTMLImageElement.prototype.decode = decode;
      },
    });
  });
  const panel = await library(page);
  await (await librarySearch(page)).fill('Icono y símbolo');
  await panel.locator('[data-library-add="symbol"]').click();
  await expect(panel.getByRole('status')).toContainText('No se pudo cargar un símbolo');
  expect((await world(page)).nodes).toHaveLength(0);
  await capture(page, info, 'biblioteca-error-recuperable');
  await page.evaluate(() => {
    Reflect.get(window, 'restoreLibraryDecode')();
    Reflect.deleteProperty(window, 'restoreLibraryDecode');
  });
  await panel.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(panel).toHaveCount(0);
  const part = (await world(page)).nodes.find(
    (n) => n.data.kind === 'wireframe' && n.data.content.piece?.symbol,
  )!;
  expect(part).toBeTruthy();
  await page.locator(`[data-node="${part.id}"]`).dblclick();
  await page.getByRole('combobox', { name: 'Símbolo de la pieza' }).selectOption('play');
  const expected = await readFile('design/wireframe-library/vendor/play.svg', 'utf8');
  const symbol = page.locator(`[data-node="${part.id}"] .library-symbol`);
  const paintedSymbol = () =>
    symbol.evaluate((el) => {
      const mask = getComputedStyle(el).maskImage;
      const url = mask.match(/url\(["']?(.*?)["']?\)$/)?.[1] ?? '';
      return decodeURIComponent(url.slice('data:image/svg+xml,'.length));
    });
  await expect.poll(paintedSymbol).toBe(expected);
  await page.keyboard.press('Escape');
  await page.reload();
  await expect.poll(paintedSymbol).toBe(expected);
});

test('C08-B144: todas las entradas, variantes y estados se eligen sin formulario previo ni perder el desplegable', async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await start(page);
  const panel = await library(page);
  for (const entry of entries) {
    await libraryTile(page, entry.id);
    const thumbnail = panel.locator(`[data-thumbnail="${entry.id}"]`);
    await expect(thumbnail, entry.id).toHaveAttribute('data-ready', 'true');
    const configure = panel.locator(`[data-library-entry="${entry.id}"]`);
    if (await configure.count()) {
      await configure.click();
      const options = page.locator('.library-choice-options');
      await expect(options).toBeVisible();
      await expect(
        options.locator('input[type=number],.library-preview,.library-insert'),
      ).toHaveCount(0);
      for (const variant of entry.variants) {
        if (entry.variants.length > 1)
          await options.locator('[data-variant]').selectOption(variant.id);
        await expect(thumbnail, entry.id + '/' + variant.id).toHaveAttribute('data-ready', 'true');
      }
      for (const state of await options
        .locator('[data-library-state]')
        .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset.libraryState!))) {
        await options.locator(`[data-library-state="${state}"]`).click();
        await expect(thumbnail, entry.id + '/' + state).toHaveAttribute('data-ready', 'true');
      }
      await options.getByRole('button', { name: 'Cerrar opciones' }).click();
    }
    await expect(panel.locator('.library-browse')).toBeVisible();
    await expect(thumbnail.locator('input,button,textarea,select')).toHaveCount(0);
  }
  await page.setViewportSize({ width: 320, height: 720 });
  await (await librarySearch(page)).fill('zzzz-sin-resultados');
  await expect(panel.getByText(/No hay coincidencias/)).toBeVisible();
  await libraryTile(page, 'composer');
  await panel.getByRole('switch', { name: 'Mostrar rótulos' }).click();
  await expect(panel.locator('[data-thumbnail=composer]')).toHaveAttribute('data-ready', 'true');
  await capture(page, info, 'biblioteca-estrecha');
  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.height).toBeLessThanOrEqual(360);
  await panel.getByRole('button', { name: 'Cerrar biblioteca' }).click();
  expect((await world(page)).nodes).toHaveLength(0);
});

test('C08-B145: arrastrar respeta cámara, cancelar no crea piezas, duplicar conserva independencia y el panel admite teclado', async ({
  page,
}, info) => {
  await start(page);
  const panel = await library(page);
  const camera = (await snapshot(page)).state.camera;
  await (await librarySearch(page)).fill('botón');
  const box = (await panel.locator('[data-library-add=button]').boundingBox())!;
  await page.mouse.move(box.x + box.width / 4, box.y + box.height / 4);
  await page.mouse.down();
  await page.mouse.move(1000, 350, { steps: 12 });
  await expect(page.locator('.library-drag-preview')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(panel).toBeVisible();
  expect((await world(page)).nodes).toHaveLength(0);
  await page.mouse.move(box.x + box.width / 4, box.y + box.height / 4);
  await page.mouse.down();
  await page.mouse.move(1000, 350, { steps: 12 });
  await expect(page.locator('.library-drag-preview')).toHaveAttribute('data-ready', 'true');
  const ghost = (await page.locator('.library-drag-preview').boundingBox())!;
  await page.mouse.up();
  await expect.poll(async () => (await world(page)).nodes.length).toBeGreaterThan(0);
  await expect(panel).toHaveCount(0);
  const original = await world(page);
  const inserted = (await page.locator(`[data-node="${original.nodes[0]!.id}"]`).boundingBox())!;
  expect(
    Math.abs(inserted.x - ghost.x),
    'soltar no desplaza la pieza respecto al arrastre',
  ).toBeLessThan(2);
  expect(Math.abs(inserted.y - ghost.y)).toBeLessThan(2);
  expect((await snapshot(page)).state.camera).toEqual(camera);
  expect(original.nodes.length).toBeGreaterThan(1);
  await page.keyboard.press('Control+d');
  const duplicated = await world(page);
  expect(duplicated.nodes).toHaveLength(original.nodes.length * 2);
  expect(duplicated.canvasGroups).toHaveLength(2);
  const copyText = duplicated.nodes.find(
    (n) =>
      !original.nodes.some((o) => o.id === n.id) &&
      n.data.kind === 'wireframe' &&
      n.data.content.type === 'text',
  )!;
  await page.locator(`[data-node="${copyText.id}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Desagrupar componente', exact: true }).click();
  await page.locator(`[data-node="${copyText.id}"]`).dblclick();
  await page.getByRole('textbox', { name: 'Contenido del bosquejo', exact: true }).fill('Entrar');
  await page.keyboard.press('Escape');
  expect(
    (await world(page)).nodes.filter((n) => original.nodes.some((o) => o.id === n.id)),
  ).toEqual(original.nodes);
  await page.reload();
  await expect(page.locator(`[data-node="${copyText.id}"] .library-piece`)).toHaveText('Entrar');
  await capture(page, info, 'biblioteca-arrastre-duplicado');
});

test('C08-B146: conversión conserva la representación del catálogo, con contraejemplo sin textos', async ({
  page,
}, info) => {
  test.setTimeout(360000);
  await start(page);
  const png = createRequire(import.meta.url)(
    resolve('node_modules/playwright-core/lib/utilsBundle.js'),
  ).PNG as { sync: { read(buffer: Buffer): { data: Buffer; width: number; height: number } } };
  const differences: { id: string; error: number }[] = [];
  const samples = entries.flatMap((entry) =>
    availableStates(entry, entry.variants[0]!.id, {}).flatMap((state) =>
      [true, false].map((labels) => ({ id: entry.id, state, labels })),
    ),
  );
  for (const sample of samples) {
    const { id, state, labels } = sample;
    const sampleName = id + '/' + state + '/' + (labels ? 'labels' : 'bars');
    await page.evaluate(async ({ id, state, labels }) => {
      const definitions = (await import(
        String('/design/wireframe-library/samples.js')
      )) as typeof import('../../design/wireframe-library/samples.js');
      const { renderLibrary } = (await import(
        String('/src/features/canvas/library/render.ts')
      )) as typeof import('../../src/features/canvas/library/render');
      const { compileLibrary } = (await import(
        String('/src/features/canvas/library/compile.ts')
      )) as typeof import('../../src/features/canvas/library/compile');
      const { instantiateLibrary, libraryBounds } = (await import(
        String('/src/domain/sketch-library.ts')
      )) as typeof import('../../src/domain/sketch-library');
      const { wireframeMarkup } = (await import(
        String('/src/features/canvas/wireframe-markup.ts')
      )) as typeof import('../../src/features/canvas/wireframe-markup');
      document.querySelector('#library-comparison')?.remove();
      const entry = definitions.entries.find((item: { id: string }) => item.id === id);
      if (!entry) throw new Error('Muestra inexistente: ' + id);
      const choice = {
        entry,
        variant: entry.variants[0]!.id,
        state,
        options: {},
        width: entry.layout.width,
        labels,
      };
      const root = document.createElement('div');
      root.id = 'library-comparison';
      Object.assign(root.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '1000',
        background: '#ffffff',
        overflow: 'auto',
        display: 'flex',
        gap: '8px',
        alignItems: 'start',
      });
      document.body.append(root);
      const source = document.createElement('div');
      source.id = 'library-source';
      source.style.width = choice.width + 'px';
      source.style.flexShrink = '0';
      root.append(source);
      await renderLibrary(source, choice);
      const composition = await compileLibrary(choice);
      const target = document.createElement('div');
      target.id = 'library-result';
      Object.assign(target.style, {
        position: 'relative',
        width: composition.width + 'px',
        height: composition.height + 'px',
        flexShrink: '0',
      });
      const bounds = libraryBounds(composition);
      // Comparar en las coordenadas del catálogo, incluido su espacio de exhibición.
      const result = instantiateLibrary(composition, 'proof', {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      });
      target.innerHTML = result.nodes
        .map(
          (n) =>
            `<div style="position:absolute;left:${n.x}px;top:${n.y}px;width:${n.width}px;height:${n.height}px">${wireframeMarkup(n)}</div>`,
        )
        .join('');
      root.append(target);
    }, sample);
    const a = png.sync.read(await page.locator('#library-source').screenshot());
    const b = png.sync.read(await page.locator('#library-result').screenshot());
    expect([b.width, b.height], id).toEqual([a.width, a.height]);
    const error =
      a.data.reduce((sum, value, i) => sum + (i % 4 === 3 ? 0 : Math.abs(value - b.data[i]!)), 0) /
      (a.width * a.height * 3);
    differences.push({ id: sampleName, error });
    if (
      error >= 8 ||
      (state === 'default' &&
        ['composer', 'chat', 'image', 'table', 'inspector', 'login', 'time'].includes(id))
    )
      await info.attach(sampleName.replaceAll('/', '-') + '-comparacion', {
        body: await page.locator('#library-comparison').screenshot(),
        contentType: 'image/png',
      });
    expect.soft(error, sampleName).toBeLessThan(8);
    if (!labels && state === 'default' && ['paragraph', 'button'].includes(id)) {
      const expected = await page.locator('#library-source').evaluate((host) =>
        [...host.shadowRoot!.querySelectorAll('.label')].map((label) => ({
          width: label.getBoundingClientRect().width,
          color: getComputedStyle(label, '::after').backgroundColor,
        })),
      );
      const actual = await page.locator('#library-result .library-text-bar').evaluateAll((bars) =>
        bars.map((bar) => ({
          width: bar.getBoundingClientRect().width,
          color: getComputedStyle(bar).backgroundColor,
        })),
      );
      expect(actual, sampleName + ': barras con espacio y tono originales').toEqual(expected);
    }
    // El promedio global no detectaría la pérdida de un indicador pequeño seleccionado.
    const indicators = await page.locator('#library-source').evaluate((host) => {
      const origin = host.getBoundingClientRect();
      return [...host.shadowRoot!.querySelectorAll('.radio-mark.selected')].map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          x: Math.round(rect.x - origin.x + rect.width / 2 - 2),
          y: Math.round(rect.y - origin.y + rect.height / 2 - 2),
        };
      });
    });
    for (const point of indicators) {
      let detailError = 0;
      for (let y = point.y; y < point.y + 4; y++)
        for (let x = point.x; x < point.x + 4; x++) {
          const index = (y * a.width + x) * 4;
          for (let c = 0; c < 3; c++)
            detailError += Math.abs(a.data[index + c]! - b.data[index + c]!);
        }
      expect.soft(detailError / 48, sampleName + ': indicador seleccionado').toBeLessThan(6);
    }
    if (id === 'composer' && state === 'default') {
      await page.locator('#library-result .library-text').evaluateAll((nodes) =>
        nodes.forEach((node) => {
          (node as HTMLElement).style.visibility = 'hidden';
        }),
      );
      const missing = png.sync.read(await page.locator('#library-result').screenshot());
      const missingError =
        a.data.reduce(
          (sum, value, i) => sum + (i % 4 === 3 ? 0 : Math.abs(value - missing.data[i]!)),
          0,
        ) /
        (a.width * a.height * 3);
      expect(missingError).toBeGreaterThan(error * 3 + 0.4);
    }
  }
  await info.attach('diferencias', {
    body: JSON.stringify(differences),
    contentType: 'application/json',
  });
  await page.locator('#library-comparison').evaluate((node) => node.remove());
});
