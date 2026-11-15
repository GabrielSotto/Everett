import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, world, snapshot, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { wireframeMaterial } from '../../src/domain/wireframes';
import { addLibrary } from './sketch-library-helpers';

async function setup(page: Page) {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.canvasGroups = [];
  w.nodes = [
    {
      ...wireframeMaterial('screen', 'layout-screen', { x: 0, y: 0 }),
      x: -400,
      y: -250,
      width: 800,
      height: 500,
    },
  ];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await page.locator('[data-node=layout-screen]').click({ position: { x: 10, y: 10 } });
}
async function view(page: Page) {
  await page.getByRole('button', { name: 'Vista y ajustes de Canvas', exact: true }).click();
}
async function edit(page: Page) {
  await view(page);
  await page.getByRole('menuitem', { name: 'Configurar retícula de selección…' }).click();
  return page.getByRole('dialog', { name: 'Retícula del marco' });
}

test('C08-B170: retículas por marco, presets, errores, ocultar, historial, copia y recarga', async ({
  page,
}, info) => {
  await setup(page);
  for (const count of [4, 8, 12]) {
    const editor = await edit(page);
    await editor
      .locator('[data-tracks=columns]')
      .getByRole('button', { name: String(count), exact: true })
      .click();
    await editor.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await expect(page.locator('.canvas-layout-guides [data-axis=x]')).toHaveCount(count);
    const frame = (await world(page)).nodes[0]!;
    const bands = await page.locator('.canvas-layout-guides [data-axis=x]').evaluateAll((els) =>
      els.map((el) => ({
        x: Number(el.getAttribute('x')),
        width: Number(el.getAttribute('width')),
      })),
    );
    expect(bands[0]!.x).toBe(frame.x + frame.layoutGuides!.columns!.margin);
    expect(bands.at(-1)!.x + bands.at(-1)!.width).toBeCloseTo(
      frame.x + frame.width - frame.layoutGuides!.columns!.margin,
      6,
    );
  }
  const before = (await world(page)).nodes[0]!;
  let editor = await edit(page);
  await editor.getByLabel('Margen de columnas', { exact: true }).fill('500');
  await editor.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('no caben');
  expect((await world(page)).nodes[0]).toEqual(before);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+G');
  await expect(page.locator('.canvas-layout-guides')).toHaveCount(0);
  expect((await world(page)).nodes[0]).toEqual(before);
  await page.reload();
  await expect(page.locator('.canvas-layout-guides')).toHaveCount(0);
  await view(page);
  await expect(page.getByRole('menuitemcheckbox', { name: /Mostrar retículas/ })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(
    page.getByRole('menuitemcheckbox', { name: 'Ajustar a las retículas', exact: true }),
  ).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('menuitemcheckbox', { name: /Mostrar retículas/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.canvas-layout-guides [data-axis=x]')).toHaveCount(12);
  await page.locator('[data-node=layout-screen]').click({ position: { x: 10, y: 10 } });
  editor = await edit(page);
  await editor.getByRole('switch', { name: 'Filas', exact: true }).click();
  await editor.getByLabel('Cantidad de filas', { exact: true }).fill('5');
  await editor.getByLabel('Separación de filas', { exact: true }).fill('12');
  await editor.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.locator('.canvas-layout-guides [data-axis=y]')).toHaveCount(5);
  await capture(page, info, 'reticula-columnas-filas');
  await page.keyboard.press('Control+z');
  await expect(page.locator('.canvas-layout-guides [data-axis=y]')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.canvas-layout-guides [data-axis=y]')).toHaveCount(5);
  await page.locator('[data-node=layout-screen]').click({ position: { x: 10, y: 10 } });
  await page.keyboard.press('Control+d');
  expect((await world(page)).nodes).toHaveLength(2);
  expect((await world(page)).nodes[1]!.layoutGuides).toEqual(
    (await world(page)).nodes[0]!.layoutGuides,
  );
  editor = await edit(page);
  await editor.getByRole('button', { name: 'Quitar', exact: true }).click();
  expect((await world(page)).nodes[1]!.layoutGuides).toBeUndefined();
  expect((await world(page)).nodes[0]!.layoutGuides).toBeDefined();
  editor = await edit(page);
  await editor.getByRole('switch', { name: 'Columnas', exact: true }).click();
  await editor.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect((await world(page)).nodes[1]!.layoutGuides).toBeUndefined();

  // Una edición posterior puede dejar un marco menor que sus márgenes. Se
  // conserva la configuración y el editor explica cómo recuperarla.
  const saved = await snapshot(page);
  saved.state.worlds.find((w) => w.id === 'scout')!.nodes[0]!.width = 100;
  await storedFixture(page, saved.state, saved.ui);
  await page.reload();
  await page.locator('[data-node=layout-screen]').click({ position: { x: 5, y: 5 } });
  editor = await edit(page);
  await expect(editor.getByRole('alert')).toContainText('no caben');
  await editor.getByLabel('Cantidad de columnas', { exact: true }).fill('4');
  await editor.getByLabel('Margen de columnas', { exact: true }).fill('4');
  await editor.getByLabel('Separación de columnas', { exact: true }).fill('4');
  await editor.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.locator('[data-layout-frame=layout-screen] [data-axis=x]')).toHaveCount(4);
});

test('C08-B171: retículas en componente, zoom, resize, teclado y panel estrecho sin tocar contenido', async ({
  page,
}, info) => {
  await start(page);
  const nodes = await addLibrary(page, 'frame');
  // La entrada de pantalla se inserta como componente real de la biblioteca.
  await page.locator(`[data-node="${nodes[0]!.id}"]`).click({ position: { x: 5, y: 5 } });
  let editor = await edit(page);
  await editor.getByLabel('Cantidad de columnas', { exact: true }).fill('8');
  await editor.getByLabel('Margen de columnas', { exact: true }).fill('8');
  await editor.getByLabel('Separación de columnas', { exact: true }).fill('4');
  await editor.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.locator('.canvas-layout-guides [data-axis=x]')).toHaveCount(8);
  const original = (await world(page)).nodes;
  const frameId = await page.locator('[data-layout-frame]').getAttribute('data-layout-frame');
  for (const zoom of [1, 3, 17, 38, 60, 100, 431, 600]) {
    await page.getByRole('button', { name: /Zoom de Canvas/ }).click();
    const input = page.getByRole('spinbutton', { name: /Porcentaje/ });
    await input.fill(String(zoom));
    await input.press('Enter');
    await expect(page.locator('.canvas-layout-guides [data-axis=x]')).toHaveCount(8);
    const geometry = await page
      .locator('.canvas-layout-guides rect')
      .first()
      .evaluate((r) => {
        const frame = r.closest('g')!.dataset.layoutFrame!;
        const material =
          document.querySelector(`[data-node="${frame}"]`) ??
          document.querySelector(`[data-component="${frame}"]`);
        const a = r.getBoundingClientRect(),
          b = material!.getBoundingClientRect();
        return {
          left: a.left - b.left,
          right: a.right <= b.right + 1,
          scale: window.EverettDebug!.snapshot().state.camera.z,
        };
      });
    expect(geometry.left).toBeCloseTo((8 * zoom) / 100, 0);
    expect(geometry.right).toBe(true);
    expect((await world(page)).nodes).toEqual(original);
  }
  expect(frameId).toBeTruthy();
  await page.getByRole('button', { name: /Zoom de Canvas/ }).click();
  await page.getByRole('spinbutton', { name: 'Porcentaje de zoom' }).fill('100');
  await page.getByRole('spinbutton', { name: 'Porcentaje de zoom' }).press('Enter');
  const handle = page.locator(`[data-resize=group][data-id="${frameId}"][data-corner=se]`);
  await handle.focus();
  const width = await page
    .locator(`[data-component="${frameId}"]`)
    .evaluate((el) => parseFloat((el as HTMLElement).style.width));
  await handle.press('Shift+ArrowRight');
  expect(
    await page
      .locator(`[data-component="${frameId}"]`)
      .evaluate((el) => parseFloat((el as HTMLElement).style.width)),
  ).toBeCloseTo(width + 10, 5);
  const lastBand = await page
    .locator('.canvas-layout-guides [data-axis=x]')
    .last()
    .evaluate((el) => Number(el.getAttribute('x')) + Number(el.getAttribute('width')));
  const currentGroup = page.locator(`[data-component="${frameId}"]`);
  expect(lastBand).toBeCloseTo(
    await currentGroup.evaluate(
      (el) =>
        parseFloat((el as HTMLElement).style.left) +
        parseFloat((el as HTMLElement).style.width) -
        8,
    ),
    5,
  );
  await page.setViewportSize({ width: 320, height: 700 });
  editor = await edit(page);
  const box = (await editor.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await capture(page, info, 'reticula-panel-estrecho');
  await page.getByLabel('Cantidad de columnas', { exact: true }).focus();
  await page.keyboard.press('Shift+G');
  expect((await snapshot(page)).ui.shell.canvasLayoutGuides).toBe(true);
  await page.keyboard.press('Escape');
  await expect(editor).toHaveCount(0);
});

test('C08-B173: ajuste a retícula independiente de visibilidad y atajo reasignable sin conflictos al recuperar', async ({
  page,
}, info) => {
  await setup(page);
  let editor = await edit(page);
  await editor.getByLabel('Cantidad de columnas', { exact: true }).fill('4');
  await editor.getByLabel('Margen de columnas', { exact: true }).fill('24');
  await editor.getByLabel('Separación de columnas', { exact: true }).fill('16');
  await editor.getByRole('button', { name: 'Aplicar', exact: true }).click();
  let input = await snapshot(page);
  const w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes.push({
    id: 'inside',
    x: -330,
    y: -180,
    width: 60,
    height: 60,
    owner: null,
    data: { kind: 'shape', shape: 'rectangle', color: '#778899', fill: true },
  });
  input.ui.shell.canvasAlignmentGuides = false;
  input.ui.shell.canvasLayoutGuides = false;
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  const box = (await page.locator('[data-node=inside]').boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 30 - 43, box.y + 30, { steps: 10 });
  await expect(page.locator('.alignment-guides [data-snap-source=layout]')).toHaveCount(1);
  await expect(page.locator('[data-node=inside]')).toHaveCSS('left', '-376px');
  await expect(page.locator('.canvas-layout-guides')).toHaveCount(0);
  await page.mouse.up();
  await view(page);
  await page
    .getByRole('menuitemcheckbox', { name: 'Ajustar a las retículas', exact: true })
    .click();
  await page.keyboard.press('Escape');
  const placed = (await page.locator('[data-node=inside]').boundingBox())!;
  await page.mouse.move(placed.x + 30, placed.y + 30);
  await page.mouse.down();
  await page.mouse.move(placed.x + 34, placed.y + 30);
  await page.mouse.up();
  expect((await world(page)).nodes.find((n) => n.id === 'inside')!.x).toBe(-372);
  await view(page);
  await page.getByRole('menuitem', { name: 'Atajos de Canvas', exact: true }).click();
  const shortcut = page.getByLabel('Atajo de Mostrar u ocultar retículas', { exact: true });
  await shortcut.focus();
  await shortcut.press('Control+k');
  await expect(page.locator('.shortcut-conflict')).toBeVisible();
  await page.locator('[data-action=shortcut-conflict-cancel]').click();
  await shortcut.focus();
  await shortcut.press('Shift+r');
  await expect(shortcut).toHaveValue('Shift+R');
  await page.keyboard.press('Escape');
  await page.locator('.canvas-stage').click({ position: { x: 30, y: 30 } });
  await page.keyboard.press('Shift+G');
  await expect(page.locator('.canvas-layout-guides')).toHaveCount(0);
  await page.keyboard.press('Shift+R');
  await expect(page.locator('.canvas-layout-guides [data-axis=x]')).toHaveCount(4);
  await page.reload();
  expect((await snapshot(page)).ui.shortcuts.layoutGuides).toBe('Shift+R');
  // Un guardado anterior ya puede tener Shift+G asignado a otra acción.
  input = await snapshot(page);
  delete input.ui.shortcuts.layoutGuides;
  input.ui.shortcuts.rename = 'Shift+G';
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  expect((await snapshot(page)).ui.shortcuts.layoutGuides).toBe('');
  expect((await snapshot(page)).ui.shortcuts.rename).toBe('Shift+G');
  await page.locator('[data-node=layout-screen]').click({ position: { x: 10, y: 10 } });
  await page.setViewportSize({ width: 550, height: 668 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '26px'));
  editor = await edit(page);
  const bounds = (await editor.boundingBox())!;
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(550);
  expect(await editor.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await capture(page, info, 'reticula-texto-ampliado');
});

test('C08-B172: arrastre elige vecino real, conserva destino, suspende y cancela sin modificar geometría', async ({
  page,
}, info) => {
  await start(page);
  const data = await snapshot(page),
    w = data.state.worlds.find((w) => w.id === 'scout')!;
  w.canvasGroups = [];
  w.nodes = [
    { id: 'moving', x: -160, y: -210 },
    { id: 'near', x: -96, y: -90 },
    { id: 'far', x: -99, y: 40 },
  ].map((point) => ({
    ...point,
    width: 100,
    height: 100,
    owner: null,
    data: { kind: 'shape' as const, shape: 'rectangle' as const, color: '#f0ede7', fill: true },
  }));
  await storedFixture(page, data.state, data.ui);
  await page.reload();
  const box = (await page.locator('[data-node=moving]').boundingBox())!;
  const x = box.x + 50,
    y = box.y + 50;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y, { steps: 12 });
  await expect(page.locator('.alignment-guides line[data-snap-target=near]')).toHaveCount(2);
  await expect(page.locator('[data-node=moving]')).toHaveCSS('left', '-96px');
  await capture(page, info, 'referencia-cercana');
  await page.mouse.move(x + 58, y);
  await expect(page.locator('[data-node=moving]')).toHaveCSS('left', '-96px');
  await page.keyboard.down('Control');
  await page.mouse.move(x + 57, y);
  await expect(page.locator('.alignment-guides')).toHaveCount(0);
  await expect(page.locator('[data-node=moving]')).toHaveCSS('left', '-103px');
  await page.keyboard.up('Control');
  await page.mouse.move(x + 60, y);
  await expect(page.locator('.alignment-guides line[data-snap-target=near]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await world(page)).nodes[0]!.x).toBe(-160);
  await expect(page.locator('.alignment-guides')).toHaveCount(0);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y, { steps: 12 });
  await page.mouse.up();
  expect((await world(page)).nodes[0]!.x).toBe(-96);
  await page.keyboard.press('Control+z');
  expect((await world(page)).nodes[0]!.x).toBe(-160);
});
