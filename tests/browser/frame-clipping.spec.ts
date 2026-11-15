import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { capture, start, snapshot, world } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { treeFromMaterials } from '../../src/domain/component-tree';
import { newCanvasText } from '../../src/domain/canvas-text';
import type { Material } from '../../src/domain/model';

const shape = (
  id: string,
  title: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): Material => ({
  id,
  x,
  y,
  width,
  height,
  owner: null,
  data: { kind: 'shape', shape: 'rectangle', title, color, fill: true },
});
async function scene(page: Page, edit = true, extraLayers = 0, dockedChat = false) {
  await start(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('#canvas-file-import').setInputFiles('tests/fixtures/link-cover.png');
  await expect(page.locator('.material.image img')).toBeVisible();
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  const photo = w.nodes.find((n) => n.data.kind === 'image')!;
  Object.assign(photo, { x: 60, y: -58, width: 160, height: 90 });
  const bg = shape('paper', 'Explorar', -140, -100, 280, 200, '#eeeeee');
  const card = shape('card', 'Fondo de navegación', -110, -25, 110, 60, '#abaac5');
  const symbol = shape('home', 'Inicio', -90, -14, 35, 35, '#252938');
  const title: Material = {
    id: 'title',
    x: 100,
    y: 55,
    width: 150,
    height: 32,
    owner: null,
    data: { ...newCanvasText('wrap'), text: 'Prisma DJ Set', title: 'Evento', color: '#247349' },
  };
  const line = shape('line', 'Separador', -80, 60, 10, 4, '#374268');
  const members = [bg, photo, card, symbol, title, line];
  for (let i = 1; i <= extraLayers; i++)
    members.push(shape('extra-' + i, 'Pieza ' + i, 0, 0, 12, 12, '#eee'));
  const tree = treeFromMaterials(members, 'Explorar');
  Object.assign(tree.root, { frame: true, width: bg.width, height: bg.height });
  tree.root.children[0]!.background = true;
  w.canvasGroups = [
    {
      id: 'screen',
      name: 'Explorar',
      component: true,
      nodes: members.map((n) => n.id),
      structure: tree,
    },
  ];
  const note: Material = {
    ...shape('memo', 'Nota suelta', -285, -90, 112, 65, '#eeeeee'),
    data: { kind: 'note', title: 'Nota suelta', text: 'Referencia', color: '#eee4b1' },
  };
  w.nodes = [...members, shape('aside', 'Referencia externa', 155, 40, 40, 35, '#ce9254'), note];
  Object.assign(input.ui.canvas, { selection: null, selections: [] });
  if (dockedChat) input.ui.chat.chatMode = 'docked';
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  const heading = page.locator('.group-heading[data-group=screen]');
  if (edit) {
    await heading.focus();
    await heading.getByRole('button', { name: 'Editar marco Explorar' }).click();
  }
  const panel = page.locator('.component-inspector');
  const box = (await page.locator('[data-node=paper]').boundingBox())!;
  const at = (x: number, y: number) => ({ x: box.x + x, y: box.y + y });
  const hits = (x: number, y: number) =>
    page.evaluate(
      (p) =>
        document
          .elementsFromPoint(p.x, p.y)
          .map((el) => el.closest<HTMLElement>('[data-node]')?.dataset.node)
          .filter(Boolean),
      at(x, y),
    );
  return { panel, box, at, hits, photo: photo.id };
}

test('C08-B230: un inspector contextual permite encuadrar, recuperar capas ocultas y reordenar la pila real', async ({
  page,
}, info) => {
  const { panel, hits, at, photo } = await scene(page, false);
  const inspector = page.locator('#canvas-inspector');
  await expect(inspector).toBeHidden();
  await page.locator('.group-heading[data-group=screen]').focus();
  await page.getByRole('button', { name: 'Mover marco Explorar' }).click();
  await expect(inspector).toHaveAccessibleName('Inspector de marco');
  await expect(panel.getByRole('tree', { name: 'Capas' })).toBeVisible();
  const row = (title: string) => panel.locator('[data-part]').filter({ hasText: title });
  const before = (await world(page)).nodes;
  await row('Fondo de navegación').click();
  await panel.getByRole('button', { name: 'Subir capa' }).press('Enter');
  expect((await hits(65, 100)).filter((id) => id === 'card' || id === 'home')[0]).toBe('card');
  const after = (await world(page)).nodes;
  for (const material of before) expect(after.find((n) => n.id === material.id)).toEqual(material);
  await row('Inicio').dragTo(row('Fondo de navegación'), { targetPosition: { x: 36, y: 3 } });
  await expect
    .poll(async () => (await hits(65, 100)).filter((id) => id === 'card' || id === 'home')[0])
    .toBe('home');
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await expect
    .poll(async () => (await hits(65, 100)).filter((id) => id === 'card' || id === 'home')[0])
    .toBe('card');
  await panel.getByRole('treeitem', { name: 'Explorar', exact: true }).click();
  await panel.getByRole('checkbox', { name: 'Recortar contenido' }).check();
  await row('link-cover.png').click();
  const p = at(220, 70);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.keyboard.down('Control');
  await page.mouse.move(p.x + 110, p.y, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Control');
  await expect
    .poll(async () => (await world(page)).nodes.find((n) => n.id === photo)!.x)
    .toBeCloseTo(170);
  expect(await hits(350, 70)).not.toContain(photo);
  await expect(page.locator(`[data-node="${photo}"]`)).toHaveAttribute('inert', '');
  await row('link-cover.png').click();
  await expect(panel.getByLabel('Nombre', { exact: true })).toHaveValue('link-cover.png');
  await capture(page, info, 'inspector-con-capa-fuera-del-marco');
  await panel.getByRole('treeitem', { name: 'Explorar', exact: true }).click();
  await panel.getByRole('checkbox', { name: 'Recortar contenido' }).uncheck();
  expect(await hits(350, 70)).toContain(photo);
  await page.locator('[data-node=memo]').click();
  await expect(inspector).toBeHidden();
  await expect(page.locator('[role=menu]')).toHaveCount(0);
});

test('C08-B231: desplegar un contenedor, trasladar una capa entre niveles y recuperar la pertenencia con Deshacer', async ({
  page,
}) => {
  const { panel } = await scene(page);
  const row = (name: string) => panel.locator('[data-part]').filter({ hasText: name });
  await row('Fondo de navegación').click();
  await row('Inicio').click({ modifiers: ['Shift'] });
  await panel.getByRole('button', { name: 'Agrupar selección en contenedor' }).click();
  const original = await world(page);
  const container = original.canvasGroups![0]!.structure!.root.children.find(
    (c) => c.children.length,
  )!;
  const folder = panel.locator(`[data-part="${container.id}"]`);
  const layer = original.canvasGroups![0]!.structure!.root.children.find(
    (c) => c.material === 'title',
  )!;
  await row('Evento').dragTo(folder);
  const currentParent = async () =>
    (await world(page)).canvasGroups![0]!.structure!.root.children.find((c) =>
      c.children.some((p) => p.id === layer.id),
    )?.id;
  await expect.poll(currentParent).toBe(container.id);
  await expect(row('Evento')).toBeVisible();
  expect((await world(page)).nodes.find((n) => n.id === 'title')).toEqual(
    original.nodes.find((n) => n.id === 'title'),
  );
  const disclosure = panel.locator(`[data-expand="${container.id}"]`);
  await disclosure.click();
  await expect(row('Evento')).toHaveCount(0);
  await disclosure.click();
  await expect(row('Evento')).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect(await currentParent()).toBeUndefined();
  await page.reload();
  expect(await currentParent()).toBeUndefined();
});

test('C08-B235: explorar y buscar capas anidadas conserva la edición y revela la pieza sobre el Canvas', async ({
  page,
}, info) => {
  const { panel } = await scene(page, true, 0, true);
  const layer = (name: string) => panel.getByRole('treeitem', { name, exact: true });
  const activeName = panel.getByRole('textbox', { name: 'Nombre', exact: true });
  await layer('Inicio').click();
  await layer('Fondo de navegación').click({ modifiers: ['Shift'] });
  await panel.getByRole('button', { name: 'Agrupar selección en contenedor' }).click();
  await layer('Evento').click();
  const saved = await world(page);
  const disclosure = panel.getByRole('button', { name: 'Desplegar Contenedor' });
  await disclosure.click();
  await expect(activeName).toHaveValue('Evento');
  await layer('Inicio').hover();
  await expect(page.locator('.layer-highlight[data-origin=inspector] polygon')).toHaveCount(1);
  await expect(layer('Evento')).toHaveAttribute('aria-selected', 'true');
  await panel.getByRole('button', { name: 'Contraer Contenedor' }).click();
  await expect(layer('Inicio')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Buscar capas', exact: true }).click();
  const search = panel.getByRole('searchbox');
  await search.fill('navegacion');
  await expect(layer('Contenedor')).toBeVisible();
  await expect(layer('Fondo de navegación')).toBeVisible();
  await expect(layer('Inicio')).toHaveCount(0);
  await search.fill('inexistente');
  await expect(panel.getByRole('status')).toHaveText('Sin capas con ese nombre.');
  await expect(panel.getByRole('treeitem')).toHaveCount(0);
  await search.press('Escape');
  await expect(disclosure).toBeVisible();
  await expect(activeName).toHaveValue('Evento');
  await panel.getByRole('button', { name: 'Buscar capas', exact: true }).click();
  await search.fill('INICIO');
  await search.press('ArrowDown');
  await expect(layer('Inicio')).toBeFocused();
  await layer('Inicio').press('Enter');
  await expect(activeName).toHaveValue('Inicio');
  await layer('Inicio').press('Escape');
  await expect(layer('Inicio')).toBeVisible();
  await expect(search).toBeHidden();
  expect((await snapshot(page)).ui.canvas.selections).toEqual(['home']);
  expect(await world(page)).toEqual(saved);
  const tree = (await panel.getByRole('tree').boundingBox())!;
  const prop = (await activeName.boundingBox())!;
  const chat = (await page.getByRole('region', { name: 'Chat del Canvas' }).boundingBox())!;
  expect(chat.x + chat.width).toBeLessThan(tree.x);
  expect(tree.x + tree.width).toBeLessThan(prop.x);
  await capture(page, info, 'buscar-y-revelar-una-capa');
});

test('C08-B236: seleccionar un rango, reordenar con teclado y editar a ancho móvil', async ({
  page,
}, info) => {
  const { panel } = await scene(page);
  const layer = (name: string) => panel.getByRole('treeitem', { name, exact: true });
  await layer('Separador').click();
  await layer('Separador').press('Shift+ArrowDown');
  await layer('Evento').press('Shift+ArrowDown');
  expect(new Set((await snapshot(page)).ui.canvas.selections)).toEqual(
    new Set(['line', 'title', 'home']),
  );
  await expect(panel.getByRole('heading', { name: '3 capas seleccionadas' })).toBeVisible();
  await expect(panel.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveCount(0);
  await layer('Evento').click({ modifiers: ['Control'] });
  expect(new Set((await snapshot(page)).ui.canvas.selections)).toEqual(new Set(['home', 'line']));
  await layer('Inicio').click();
  const before = (await world(page)).nodes.map((n) => n.id);
  await layer('Inicio').press('Control+ArrowUp');
  const ordered = (await world(page)).nodes.map((n) => n.id);
  expect(ordered.indexOf('home')).toBeGreaterThan(ordered.indexOf('title'));
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes.map((n) => n.id)).toEqual(before);
  await page.setViewportSize({ width: 390, height: 760 });
  await layer('Evento').click();
  const name = panel.getByRole('textbox', { name: 'Nombre', exact: true });
  await name.fill('Próximo evento');
  await name.press('Enter');
  await expect(layer('Próximo evento')).toHaveAttribute('aria-selected', 'true');
  await expect(panel.getByRole('button', { name: 'Buscar capas', exact: true })).toBeInViewport();
  const left = await panel.getByRole('tree').boundingBox();
  const right = await panel.locator('.inspector-properties-pane').boundingBox();
  expect(left!.x).toBeCloseTo(right!.x, 0);
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await capture(page, info, 'capas-y-propiedades-en-movil');
});

test('C08-B237: al salir de la búsqueda en un marco con muchas capas, la pieza elegida queda a la vista', async ({
  page,
}) => {
  const { panel } = await scene(page, true, 60);
  const tree = panel.getByRole('tree');
  const row = tree.getByRole('treeitem', { name: 'Inicio', exact: true });
  await expect(row).not.toBeInViewport();
  const toggle = panel.getByRole('button', { name: 'Buscar capas', exact: true });
  await toggle.click();
  await panel.getByRole('searchbox').fill('inicio');
  await row.click();
  await toggle.click();
  await expect(row).toBeInViewport({ ratio: 0.99 });
  await expect(row).toHaveAttribute('aria-selected', 'true');
  expect(await tree.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  const scroll = await tree.evaluate((e) => e.scrollTop);
  await toggle.click();
  await panel.getByRole('searchbox').fill('Pieza 54');
  await panel.getByRole('searchbox').press('Escape');
  expect(await tree.evaluate((e) => e.scrollTop)).toBeCloseTo(scroll);
  await expect(panel.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('Inicio');
});

test('C08-B232: un conjunto manual comparte el inspector y conserva el tipo de grupo al ordenar y deshacer', async ({
  page,
}) => {
  const { panel } = await scene(page, false);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  const group = w.canvasGroups![0]!;
  delete group.structure;
  delete group.component;
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  const grip = page.getByRole('button', { name: 'Conjunto: Explorar', exact: true });
  await page.locator('.group-heading[data-group=screen]').focus();
  await grip.click();
  await expect(page.locator('#canvas-inspector')).toHaveAccessibleName('Inspector de conjunto');
  const bg = panel.locator('[data-part=card]');
  await bg.click();
  await panel.getByRole('button', { name: 'Subir capa' }).click();
  const stacked = await world(page);
  expect(stacked.nodes.findIndex((n) => n.id === 'card')).toBeGreaterThan(
    stacked.nodes.findIndex((n) => n.id === 'home'),
  );
  expect(stacked.canvasGroups![0]).toEqual(group);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes.map((n) => n.id)).toEqual(w.nodes.map((n) => n.id));
  await page.locator('[data-node=memo]').click();
  await expect(page.locator('#canvas-inspector')).toBeHidden();
});

test('C08-B228: encuadrar foto y texto en vivo, redimensionar el marco, persistir y recuperar el original', async ({
  page,
}, info) => {
  const { panel, at, hits, photo } = await scene(page);
  const clip = panel.getByRole('checkbox', { name: 'Recortar contenido' });
  expect(await hits(300, 68)).toContain(photo);
  expect(await hits(300, 162)).toContain('title');
  const sample = at(300, 68);
  const pixel = () => page.screenshot({ clip: { ...sample, width: 4, height: 4 } });
  const originalPixel = await pixel();
  await clip.check();
  expect(await pixel()).not.toEqual(originalPixel);
  expect(await hits(300, 68)).not.toContain(photo);
  expect(await hits(270, 68)).toContain(photo);
  expect(await hits(300, 162)).not.toContain('title');
  expect(await hits(310, 150)).toContain('aside');
  await capture(page, info, 'encuadre-con-referencia-externa');
  await panel.locator('[data-part]').filter({ hasText: 'link-cover.png' }).click();
  const initial = (await world(page)).nodes.find((n) => n.id === photo)!;
  const p = at(225, 76);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.keyboard.down('Control');
  await page.mouse.move(p.x - 56, p.y, { steps: 5 });
  expect(await hits(175, 80)).toContain(photo);
  expect(await hits(289, 80)).not.toContain(photo);
  expect((await world(page)).nodes.find((n) => n.id === photo)!.x).toBe(initial.x);
  await page.mouse.up();
  await page.keyboard.up('Control');
  await expect
    .poll(async () => (await world(page)).nodes.find((n) => n.id === photo)!.x)
    .toBeCloseTo(initial.x - 56);
  await panel.getByRole('button', { name: 'Terminar edición' }).click();
  await page.locator('.group-heading[data-group=screen]').focus();
  await page.getByRole('button', { name: 'Mover marco Explorar' }).click();
  const handle = page.locator('[data-resize=group][data-corner=se][data-id=screen]');
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 - 48, h.y + h.height / 2, { steps: 5 });
  expect(await hits(250, 68)).not.toContain(photo);
  expect(await hits(218, 68)).toContain(photo);
  await page.mouse.up();
  await page.keyboard.press('Control+z');
  await expect.poll(() => hits(250, 68)).toContain(photo);
  await page.reload();
  await expect
    .poll(async () => (await world(page)).canvasGroups![0]!.structure!.root.clipContent)
    .toBe(true);
  expect(await hits(289, 80)).not.toContain(photo);
  await page.locator('.group-heading[data-group=screen]').focus();
  await page.getByRole('button', { name: 'Editar marco Explorar' }).click();
  await clip.uncheck();
  expect(await hits(289, 80)).toContain(photo);
  const restored = (await world(page)).nodes.find((n) => n.id === photo)!;
  expect(restored.data).toEqual(initial.data);
  expect(restored.width).toEqual(initial.width);
});

test('C08-B229: elegir el fondo bajo un icono por puntero y teclado, y mover una línea corta', async ({
  page,
}, info) => {
  const { panel, at } = await scene(page, false);
  const p = at(65, 100);
  await page.mouse.click(p.x, p.y, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Seleccionar capa' }).click();
  const menu = page.getByRole('menu', { name: 'Seleccionar capa' });
  await expect(page.locator('#canvas-inspector')).toBeHidden();
  await expect(menu.getByRole('button', { name: 'Subir capa' })).toHaveCount(0);
  const choices = menu.locator('[data-action=layer-select]');
  expect(await choices.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id))).toEqual(
    ['home', 'card', 'paper'],
  );
  const choice = menu.getByRole('menuitem', { name: /Fondo de navegación/ });
  await choice.hover();
  await expect(page.locator('.layer-highlight polygon')).toBeVisible();
  await capture(page, info, 'elegir-fondo-bajo-inicio');
  await choice.click();
  expect((await snapshot(page)).ui.canvas.selections).toEqual(['card']);
  await expect(panel.getByLabel('Nombre', { exact: true })).toHaveValue('Fondo de navegación');
  const handle = page.locator('[data-controls-for=card] [data-corner=se]');
  await handle.focus();
  await handle.press('Shift+ArrowRight');
  const nodes = (await world(page)).nodes;
  expect(nodes.find((n) => n.id === 'card')!.width).toBeGreaterThan(110);
  expect(nodes.find((n) => n.id === 'home')!.width).toBe(35);
  await page.locator('[data-node=home]').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Seleccionar capa' }).press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  expect((await snapshot(page)).ui.canvas.selections).toEqual(['card']);
  const row = panel.locator('[data-part]').filter({ hasText: 'Separador' });
  await row.click();
  for (const zoom of [60, 100, 200]) {
    await page.getByRole('button', { name: /Zoom de Canvas/ }).click();
    const input = page.getByRole('spinbutton', { name: /Porcentaje/ });
    await input.fill(String(zoom));
    await input.press('Enter');
    const b = (await page.locator('[data-node=line]').boundingBox())!;
    const x = b.x + b.width / 2,
      y = b.y + b.height / 2;
    expect(
      await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-resize]') !== null,
        { x, y },
      ),
    ).toBe(false);
    const before = (await world(page)).nodes.find((n) => n.id === 'line')!;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.keyboard.down('Control');
    await page.mouse.move(x + 12, y + 9, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up('Control');
    const after = (await world(page)).nodes.find((n) => n.id === 'line')!;
    expect(after.width).toBe(10);
    expect(after.height).toBe(4);
    expect(after.x).toBeGreaterThan(before.x);
  }
});

test('C08-B238: el filtro de tipos combina búsqueda y conserva selección y ancestros', async ({
  page,
}, info) => {
  const { panel } = await scene(page);
  const layer = (name: string) => panel.getByRole('treeitem', { name, exact: true });
  await layer('Inicio').click();
  const original = await world(page);
  const filter = panel.getByRole('button', { name: /Filtrar capas por tipo/ });
  await filter.click();
  await panel.getByRole('button', { name: 'Imágenes', exact: true }).click();
  await expect(layer('Explorar')).toBeVisible();
  await expect(layer('link-cover.png')).toBeVisible();
  await expect(layer('Inicio')).toHaveCount(0);
  await expect(panel.getByLabel('Nombre', { exact: true })).toHaveValue('Inicio');
  await panel.getByRole('button', { name: 'Buscar capas', exact: true }).click();
  const search = panel.getByRole('searchbox');
  await search.fill('evento');
  await expect(panel.getByRole('status')).toHaveText('Ninguna capa coincide con el filtro.');
  await filter.press('Enter');
  await panel.getByRole('button', { name: 'Todas las capas' }).click();
  await expect(search).toHaveValue('evento');
  await expect(layer('Evento')).toBeVisible();
  await search.press('Escape');
  await filter.click();
  const text = panel.getByRole('button', { name: 'Texto', exact: true });
  await expect(panel.getByRole('button', { name: 'Todas las capas' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(text).toBeHidden();
  await expect(filter).toBeFocused();
  await expect(layer('Inicio')).toHaveAttribute('aria-selected', 'true');
  expect(await world(page)).toEqual(original);
  await filter.press('Enter');
  await capture(page, info, 'filtro-de-tipos');
});

test('C08-B239: las propiedades responden al marco, a una capa y a una selección real', async ({
  page,
}, info) => {
  const { panel } = await scene(page);
  const props = panel.getByRole('region', { name: 'Propiedades', exact: true });
  const layer = (name: string) => panel.getByRole('treeitem', { name, exact: true });
  const node = async (id: string) => (await world(page)).nodes.find((n) => n.id === id)!;
  await expect(props.getByText('Escala proporcional', { exact: true })).toBeVisible();
  await expect(props.getByRole('heading', { name: 'Disposición interna' })).toBeVisible();
  await layer('Inicio').click();
  const initial = await node('home');
  const frame = await node('paper');
  await expect(props.getByText('Escala proporcional')).toHaveCount(0);
  await expect(props.getByLabel('Distribución', { exact: true })).toHaveCount(0);
  await props.getByRole('button', { name: 'Centrar horizontalmente' }).click();
  expect((await node('home')).x).toBeCloseTo(frame.x + (frame.width - initial.width) / 2);
  const x = props.getByLabel('Posición X');
  await x.fill('18');
  await x.press('Enter');
  expect((await node('home')).x).toBeCloseTo(frame.x + 18);
  await layer('Evento').click({ modifiers: ['Control'] });
  await expect(props.getByRole('heading', { name: 'Alinear selección' })).toBeVisible();
  const left = Math.min((await node('home')).x, (await node('title')).x);
  await props.getByRole('button', { name: 'Alinear a la izquierda' }).click();
  expect((await node('home')).x).toBeCloseTo(left);
  expect((await node('title')).x).toBeCloseTo(left);
  await expect(props.getByRole('button', { name: 'Espaciar horizontalmente' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await node('title')).x).not.toBeCloseTo(left);
  await layer('Inicio').click();
  await layer('Evento').click({ modifiers: ['Control'] });
  await layer('Separador').click({ modifiers: ['Control'] });
  await props.getByRole('button', { name: 'Espaciar horizontalmente' }).click();
  const distributed = await Promise.all(['home', 'title', 'line'].map(node));
  const [first, middle, last] = distributed.sort((a, b) => a.x - b.x);
  expect(middle!.x - first!.x - first!.width).toBeCloseTo(last!.x - middle!.x - middle!.width);

  await layer('Explorar').click();
  const direction = props.getByLabel('Distribución', { exact: true });
  await direction.selectOption('column');
  await props.getByRole('combobox', { name: 'Horizontal', exact: true }).selectOption('center');
  await props.getByRole('combobox', { name: 'Vertical', exact: true }).selectOption('end');
  expect((await world(page)).canvasGroups![0]!.structure!.root.layout).toMatchObject({
    direction: 'column',
    align: 'center',
    justify: 'end',
  });
  const alignedHome = await node('home');
  expect(alignedHome.x + alignedHome.width / 2).toBeCloseTo(frame.x + frame.width / 2);
  await capture(page, info, 'disposicion-del-marco');
  await layer('Inicio').click();
  await expect(props.getByRole('button', { name: 'Centrar horizontalmente' })).toHaveCount(0);
  await expect(props.getByLabel('Posición X')).toHaveCount(0);
  await layer('Explorar').click();
  await direction.selectOption('free');
  await layer('Evento').click();
  await capture(page, info, 'propiedades-de-texto');
  await page.setViewportSize({ width: 390, height: 760 });
  expect(await props.evaluate((e) => e.clientWidth >= e.scrollWidth - 1)).toBe(true);
  await capture(page, info, 'propiedades-en-ancho-movil');
});
