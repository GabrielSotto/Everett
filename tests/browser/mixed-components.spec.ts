import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { snapshot, start, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { addLibrary, openLibrary } from './sketch-library-helpers';
import { newCanvasText } from '../../src/domain/canvas-text';
import type { Material } from '../../src/domain/model';
import { readFile } from 'node:fs/promises';

async function saveEventCard(page: Page) {
  await start(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('#canvas-file-import').setInputFiles('tests/fixtures/link-cover.png');
  await expect(page.locator('.material.image img')).toBeVisible();
  const initial = await snapshot(page);
  const w = initial.state.worlds.find((w) => w.id === 'scout')!;
  const cover = w.nodes[0]!;
  cover.x = -303;
  cover.y = -112;
  cover.width = 175;
  if (cover.data.kind !== 'image') throw new Error('Se esperaba la foto importada.');
  cover.height = cover.width / cover.data.ratio;
  cover.data.title = 'Portada';
  const bg: Material = {
    id: 'bg',
    x: -315,
    y: -122,
    width: 200,
    height: 184,
    owner: null,
    data: { kind: 'shape', shape: 'rectangle', color: '#efebe8', title: 'Fondo' },
  };
  const title: Material = {
    id: 'title',
    x: -303,
    y: 12,
    width: 175,
    height: 32,
    owner: null,
    data: { ...newCanvasText('wrap'), text: 'Festival', title: 'Artista' },
  };
  w.nodes = [bg, cover, title];
  w.canvasGroups = [{ id: 'festival', name: 'Tarjeta de evento', nodes: w.nodes.map((n) => n.id) }];
  initial.ui.canvas.selections = w.canvasGroups[0]!.nodes;
  initial.ui.canvas.selection = 'bg';
  await storedFixture(page, initial.state, initial.ui);
  await page.reload();
  const panel = page.locator('.component-inspector');
  await page.getByRole('button', { name: 'Crear componente', exact: true }).click();
  await panel.getByText('Reutilizar', { exact: true }).click();
  await panel.getByRole('button', { name: 'Guardar composición', exact: true }).click();
  expect((await world(page)).compositions).toHaveLength(1);
  await panel.getByRole('button', { name: 'Terminar edición' }).click();
  return { panel, cover };
}
async function insert(page: Page, linked = false) {
  const library = await openLibrary(page);
  await library.getByText('Mis composiciones (1)', { exact: true }).click();
  if (linked) await library.getByLabel('Permitir actualizaciones manuales').check();
  await library.getByRole('button', { name: 'Tarjeta de evento', exact: true }).click();
  return (await world(page)).canvasGroups!.at(-1)!;
}
async function editGroup(page: Page, id: string) {
  const heading = page.locator(`.group-heading[data-group="${id}"]`);
  await heading.focus();
  await heading.locator('[data-action=component-edit]').press('Enter');
}

test('C08-B240: una tarjeta de evento admite foto y texto por copia al publicar y actualizar el diseño', async ({
  page,
}, info) => {
  const { panel, cover } = await saveEventCard(page);
  const independent = await insert(page);
  const custom = await insert(page, true);
  await editGroup(page, custom.id);
  await panel.getByRole('treeitem', { name: 'Artista', exact: true }).click();
  await panel.getByRole('button', { name: 'Editar contenido y apariencia' }).click();
  const writer = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await writer.fill('After Hours');
  await writer.press('Escape');
  await panel.getByRole('treeitem', { name: 'Portada', exact: true }).click();
  await panel.getByRole('button', { name: 'Reemplazar imagen…' }).click();
  await page.locator('.illustration-picker input[type=file]').setInputFiles({
    name: 'Noche.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><rect width="80" height="120" fill="#48516c"/></svg>',
    ),
  });
  await expect(page.locator('.illustration-picker')).toHaveCount(0);
  const node = async (id: string) => (await world(page)).nodes.find((n) => n.id === id)!;
  const image = await node(custom.nodes[1]!);
  expect(image.data).toMatchObject({ kind: 'image', ratio: 80 / 120 });
  await panel.getByRole('button', { name: 'Terminar edición' }).click();
  await editGroup(page, 'festival');
  await panel.getByLabel('Ancho', { exact: true }).fill('240');
  await panel.getByLabel('Ancho', { exact: true }).press('Enter');
  const summary = panel.getByText('Reutilizar', { exact: true });
  if (!(await panel.getByRole('button', { name: 'Actualizar composición guardada' }).isVisible()))
    await summary.click();
  await panel.getByRole('button', { name: 'Actualizar composición guardada' }).click();
  await panel.getByRole('button', { name: 'Terminar edición' }).click();
  await editGroup(page, custom.id);
  const update = panel.getByRole('button', { name: 'Actualizar esta copia desde biblioteca' });
  if (!(await update.isVisible())) await summary.click();
  await update.click();
  expect(
    (await world(page)).canvasGroups!.find((g) => g.id === custom.id)!.structure!.root.width,
  ).toBe(240);
  expect((await node(custom.nodes[2]!)).data).toMatchObject({ text: 'After Hours' });
  expect((await node(custom.nodes[1]!)).data).toEqual(image.data);
  expect((await node(independent.nodes[1]!)).data).toEqual(cover.data);
  expect((await node(independent.nodes[2]!)).data).toMatchObject({ text: 'Festival' });
  await panel.getByRole('treeitem', { name: 'Portada', exact: true }).click();
  await panel.getByText('Cambios de esta copia', { exact: true }).click();
  await capture(page, info, 'portada-personalizada');
  await panel.getByRole('button', { name: 'Restablecer imagen' }).click();
  expect((await node(custom.nodes[1]!)).data).toEqual(cover.data);
  await page.reload();
  expect((await node(custom.nodes[2]!)).data).toMatchObject({ text: 'After Hours' });
});

test('C08-B242: la tarjeta vinculada sigue recibiendo el diseño dentro de la pantalla', async ({
  page,
}) => {
  const { panel } = await saveEventCard(page);
  const [bg] = await addLibrary(page, 'frame');
  const frame = (await world(page)).canvasGroups!.find((g) => g.nodes.includes(bg!.id))!;
  const card = await insert(page, true);
  await editGroup(page, frame.id);
  await panel.getByText('Anidar un componente', { exact: true }).click();
  await panel.getByLabel('Componente del Canvas', { exact: true }).selectOption(card.id);
  await panel.getByRole('button', { name: 'Anidar en este contenedor' }).click();
  await panel.getByRole('button', { name: 'Terminar edición' }).click();
  await editGroup(page, 'festival');
  const width = panel.getByLabel('Ancho', { exact: true });
  await width.fill('252');
  await width.press('Enter');
  await panel.getByText('Reutilizar', { exact: true }).click();
  await panel.getByRole('button', { name: 'Actualizar composición guardada' }).click();
  await panel.getByRole('button', { name: 'Terminar edición' }).click();
  await editGroup(page, frame.id);
  const nested = panel.getByRole('treeitem', { name: 'Tarjeta de evento', exact: true });
  await nested.click();
  await panel.getByText('Reutilizar', { exact: true }).click();
  await panel.getByRole('button', { name: 'Actualizar esta copia desde biblioteca' }).click();
  const live = (await world(page)).canvasGroups!.find((g) => g.id === frame.id)!;
  expect(live.structure!.root.children.find((e) => e.instance)?.width).toBe(252);
  expect(live.nodes).toEqual(expect.arrayContaining(card.nodes));
});

test('C08-B241: un respaldo sin tarjetas visibles conserva los bytes de la biblioteca en un almacenamiento limpio', async ({
  page,
  browser,
}) => {
  const { cover } = await saveEventCard(page);
  await page.locator('.group-heading[data-group=festival] .group-grip').click();
  await page.locator('#canvas-stage').focus();
  await page.keyboard.press('Delete');
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  expect((await world(page)).nodes).toHaveLength(0);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'worlds') throw new DOMException('Cuota simulada', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await page.getByLabel('Escribí un mensaje…', { exact: true }).fill('Guardar la biblioteca');
  await expect(page.locator('#notification')).toContainText('No se pudo guardar');
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar copia', exact: true }).click();
  const download = await pendingDownload;
  const payload = JSON.parse(await readFile((await download.path())!, 'utf8'));
  const asset = payload.assets.find(
    (a: { id: string }) => a.id === (cover.data as { asset: string }).asset,
  );
  expect(Buffer.from(asset.data.split(',')[1], 'base64')).toEqual(
    await readFile('tests/fixtures/link-cover.png'),
  );
  const clean = await browser.newContext();
  try {
    const fresh = await clean.newPage();
    await fresh.goto(page.url());
    await snapshot(fresh);
    await storedFixture(fresh, payload.state, payload.ui, payload.assets);
    await fresh.reload();
    const copy = await insert(fresh);
    await expect(fresh.locator(`[data-node="${copy.nodes[1]}"] img`)).toBeVisible();
    await expect
      .poll(() =>
        fresh
          .locator(`[data-node="${copy.nodes[1]}"] img`)
          .evaluate((img) => (img as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  } finally {
    await clean.close();
  }
});
