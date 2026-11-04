import { test, expect } from './fixtures';
import { start, world, capture, snapshot } from './canvas-utility-helpers';
import { entries, availableStates } from '../../design/wireframe-library/samples.js';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

async function library(page: Page) {
  await page.getByRole('button', { name: 'Bosquejos', exact: true }).click();
  await page.getByRole('menuitem', { name: /Biblioteca de componentes/ }).click();
  return page.getByRole('dialog', { name: 'Biblioteca de bosquejos' });
}

test('C08-B143: biblioteca crea chat compuesto editable, historial atómico y persistencia', async ({
  page,
}, info) => {
  await start(page);
  const panel = await library(page);
  await panel.getByRole('searchbox').fill('chat completo');
  await panel.getByRole('option', { name: /Chat completo/ }).click();
  await panel.locator('[data-labels]').selectOption('labels');
  await expect(panel.getByRole('button', { name: 'Agregar al Canvas' })).toBeEnabled();
  await capture(page, info, 'biblioteca-chat');
  await panel.getByRole('button', { name: 'Agregar al Canvas' }).click();
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
  let broken = true;
  await page.route('**/design/wireframe-library/vendor/*.svg', (route) =>
    broken
      ? route.fulfill({ status: 200, contentType: 'image/svg+xml', body: 'recurso incompleto' })
      : route.continue(),
  );
  const panel = await library(page);
  await panel.getByRole('searchbox').fill('Icono y símbolo');
  await panel.locator('[data-library-entry="symbol"]').click();
  await expect(panel.getByRole('status')).toContainText('No se pudo cargar un símbolo');
  await expect(panel.locator('.library-insert')).toBeDisabled();
  expect((await world(page)).nodes).toHaveLength(0);
  await capture(page, info, 'biblioteca-error-recuperable');
  broken = false;
  await panel.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(panel.locator('.library-insert')).toBeEnabled();
  await panel.locator('.library-insert').click();
  const part = (await world(page)).nodes.find(
    (n) => n.data.kind === 'wireframe' && n.data.content.piece?.symbol,
  )!;
  expect(part).toBeTruthy();
  await page.locator(`[data-node="${part.id}"]`).dblclick();
  await page.getByRole('combobox', { name: 'Símbolo de la pieza' }).selectOption('play');
  await expect(page.locator(`[data-node="${part.id}"] .library-symbol`)).toHaveCSS(
    'mask-image',
    /play\.svg/,
  );
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator(`[data-node="${part.id}"] .library-symbol`)).toHaveCSS(
    'mask-image',
    /play\.svg/,
  );
});

test('C08-B144: todas las entradas y variantes se preparan desde controles visibles sin perder piezas ni permitir formularios activos', async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await start(page);
  const panel = await library(page);
  for (const entry of entries) {
    await panel.getByRole('searchbox').fill(entry.name);
    await panel.locator(`[data-library-entry="${entry.id}"]`).click();
    for (const variant of entry.variants) {
      if (entry.variants.length > 1)
        await panel.locator('select[data-variant]').selectOption(variant.id);
      await expect(
        panel.locator('.library-insert'),
        `${entry.id}/${variant.id}: ${await panel.locator('.library-status').textContent()}`,
      ).toBeEnabled();
      await expect(panel.locator('.library-status')).toContainText(/editable/);
    }
    for (const state of await panel
      .locator('[data-library-state]')
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.libraryState!))) {
      await panel.locator(`[data-library-state="${state}"]`).click();
      await expect(panel.locator('.library-insert'), entry.id + '/' + state).toBeEnabled();
    }
  }
  await page.setViewportSize({ width: 320, height: 720 });
  await panel.getByRole('searchbox').fill('zzzz-sin-resultados');
  await expect(panel.locator('.library-detail')).toBeHidden();
  await panel.getByRole('searchbox').fill('composer');
  await panel.locator('[data-library-entry="composer"]').click();
  await expect(panel.locator('.library-insert')).toBeEnabled();
  const width = panel.getByRole('spinbutton', { name: 'Ancho de la composición' });
  await width.fill('0');
  await expect(panel.locator('.library-insert')).toBeDisabled();
  await expect(panel.getByRole('status')).toContainText('Elegí un ancho');
  await width.fill('320');
  await width.press('Enter');
  await expect(panel.locator('.library-insert')).toBeEnabled();
  await panel.locator('.library-insert').scrollIntoViewIfNeeded();
  await capture(page, info, 'biblioteca-estrecha');
  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await panel.getByRole('button', { name: 'Cerrar biblioteca' }).click();
  expect((await world(page)).nodes).toHaveLength(0);
});

test('C08-B145: arrastrar respeta cámara, cancelar no crea piezas, duplicar conserva independencia y el panel admite teclado', async ({
  page,
}, info) => {
  await start(page);
  const panel = await library(page);
  const camera = (await snapshot(page)).state.camera;
  await panel.getByRole('searchbox').fill('botón');
  await panel.locator('[data-library-entry="button"]').click();
  await expect(panel.locator('.library-insert')).toBeEnabled();
  const box = (await panel.locator('.library-preview').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(1000, 350, { steps: 12 });
  await expect(page.locator('.library-drag-preview')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(panel).toBeVisible();
  expect((await world(page)).nodes).toHaveLength(0);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(1000, 350, { steps: 12 });
  await page.mouse.up();
  await expect(panel).toHaveCount(0);
  const original = await world(page);
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
      const { instantiateLibrary } = (await import(
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
      const result = instantiateLibrary(composition, 'proof', {
        x: composition.width / 2,
        y: composition.height / 2,
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
