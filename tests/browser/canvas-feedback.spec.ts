import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Page, Locator } from '@playwright/test';
import { test, expect } from './fixtures';
import { enterWorld, openSurface, assignMaterial } from './interaction-helpers';
import { storedFixture } from './canvas-fixtures';
import { navigationTuning, cameraTuning } from '../../src/spatial/tuning';
import { proposalSize } from '../../src/domain/proposal-layout';

const snapshot = (page: Page) => page.evaluate(() => window.EverettDebug!.snapshot());
const png = createRequire(import.meta.url)(
  resolve('node_modules/playwright-core/lib/utilsBundle.js'),
).PNG as {
  sync: { read(buffer: Buffer): { data: Buffer } };
};
async function canvas(page: Page): Promise<void> {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
}
async function reload(page: Page): Promise<void> {
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
}
async function drag(page: Page, element: Locator, dx: number, dy: number): Promise<void> {
  const rect = (await element.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 4, rect.y + rect.height / 4);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 4 + dx, rect.y + rect.height / 4 + dy, { steps: 12 });
  await page.mouse.up();
}

test('C08-B30: video arrastrable en reposo y reproducción, controles locales y regreso espacial después de recargar', async ({
  page,
}, testInfo) => {
  await canvas(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.getByRole('button', { name: 'Cargar ejemplos multimedia', exact: true }).click();
  await expect(page.locator('.material.video')).toHaveCount(1);
  const input = await snapshot(page),
    world = input.state.worlds.find((w) => w.id === 'scout')!;
  const node = world.nodes.find((node) => node.data.kind === 'video')!;
  world.nodes = [node];
  world.links = [];
  world.zones = [];
  world.comments = [];
  Object.assign(node, { x: -180, y: -100, width: 320, height: 180 });
  input.state.camera = { x: 0, y: 0, z: 1 };
  input.ui.canvas.selection = null;
  input.ui.canvas.selections = [];
  input.ui.canvas.zoneSelection = null;
  await storedFixture(page, input.state, input.ui);
  await reload(page);
  const video = page.locator('.material.video');
  await expect
    .poll(() => video.locator('video').evaluate((el) => (el as HTMLVideoElement).videoWidth))
    .toBe(640);
  const position = async () =>
    (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.nodes[0]!;
  await drag(page, video, 70, 30);
  expect(await position()).toMatchObject({ id: node.id, x: -110, y: -70 });
  await video.getByRole('button', { name: 'Reproducir video', exact: true }).click();
  await expect
    .poll(() => video.locator('video').evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0);
  await drag(page, video, 55, 25);
  expect(await position()).toMatchObject({ id: node.id, x: -55, y: -45 });
  const controls = (await video.boundingBox())!;
  await page.mouse.click(controls.x + 22, controls.y + controls.height - 20);
  expect(await position()).toMatchObject({ x: -55, y: -45 });
  const camera = (await snapshot(page)).camera;
  await video.dblclick({ position: { x: 50, y: 35 } });
  await expect(page.locator('.media-view video[controls]')).toBeVisible();
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await page.waitForTimeout(navigationTuning.cooldownMs);
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, 360);
  await page.keyboard.up('Alt');
  await expect(page.locator('.material.video')).toBeVisible();
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'scout/canvas/');
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await expect.poll(() => snapshot(page).then((state) => state.camera)).toEqual(camera);
  await reload(page);
  expect(await position()).toMatchObject({ id: node.id, x: -55, y: -45 });
  await expect
    .poll(() => video.locator('video').evaluate((el) => (el as HTMLVideoElement).videoWidth))
    .toBe(640);
  await page.mouse.move(100, 120);
  await page.mouse.wheel(0, 1000);
  const zoom = Math.exp(-1000 * cameraTuning.zoomSensitivity);
  await expect.poll(() => snapshot(page).then((state) => state.camera.z)).toBeCloseTo(zoom, 5);
  await video.getByRole('button', { name: 'Reproducir video', exact: true }).click();
  const small = (await video.boundingBox())!;
  expect(small.height).toBeLessThan(42);
  const beforeSmallDrag = await position();
  await drag(page, video, 35, 15);
  expect((await position()).x - beforeSmallDrag.x).toBeCloseTo(35 / zoom, 0);
  expect((await position()).y - beforeSmallDrag.y).toBeCloseTo(15 / zoom, 0);
  await testInfo.attach('video-arrastre-recuperado', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('C08-B31: extremos reconectables por arrastre y teclado, cancelar, Undo/Redo, etiqueta y eliminación junto al cable', async ({
  page,
}, testInfo) => {
  await canvas(page);
  const input = await snapshot(page),
    world = input.state.worlds.find((w) => w.id === 'scout')!;
  const a = structuredClone(world.nodes.find((n) => n.id === 'note-a')!);
  const b = structuredClone(world.nodes.find((n) => n.id === 'note-b')!);
  const c = { ...structuredClone(a), id: 'third' };
  [a, b, c].forEach((node, i) =>
    Object.assign(node, { x: -450 + i * 320, y: -100, width: 160, height: 120, owner: null }),
  );
  world.nodes = [a, b, c];
  world.zones = [];
  world.assignments = [];
  world.comments = [];
  world.links = [
    {
      id: 'feedback-link',
      from: a.id,
      to: b.id,
      fromAnchor: 'east',
      toAnchor: 'west',
      label: 'Juan',
    },
  ];
  input.state.camera = { x: 0, y: 0, z: 1 };
  input.ui.canvas.selection = null;
  input.ui.canvas.selections = [];
  input.ui.canvas.zoneSelection = null;
  await storedFixture(page, input.state, input.ui);
  await reload(page);
  const cable = page.locator('[data-link=feedback-link]');
  const selectCable = async () => {
    const point = await cable.locator('.link-line').evaluate((el) => {
      const path = el as SVGPathElement;
      const point = path.getPointAtLength(path.getTotalLength() * 0.2);
      return new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM()!).toJSON();
    });
    await page.mouse.dblclick(point.x, point.y + 2);
  };
  await selectCable();
  await page.keyboard.press('Escape');
  const end = page.getByRole('button', { name: 'Reconectar destino', exact: true });
  await expect(end).toBeVisible();
  const source = (await end.boundingBox())!,
    destination = (await page.locator('[data-node=third] [data-anchor=west]').boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  const links = async () =>
    (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.links;
  expect(await links()).toEqual([
    {
      id: 'feedback-link',
      from: a.id,
      to: 'third',
      fromAnchor: 'east',
      toAnchor: 'west',
      label: 'Juan',
    },
  ]);
  await page.keyboard.press('Control+z');
  expect((await links())[0]!.to).toBe(b.id);
  await page.keyboard.press('Control+Shift+z');
  expect((await links())[0]!.to).toBe('third');
  await selectCable();
  await page.keyboard.press('Escape');
  const cancelled = (await end.boundingBox())!;
  await page.mouse.move(cancelled.x + cancelled.width / 2, cancelled.y + cancelled.height / 2);
  await page.mouse.down();
  await page.mouse.move(950, 740, { steps: 8 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await links())[0]!.to).toBe('third');
  await end.press('Enter');
  const form = page.locator('[data-reconnect=feedback-link]');
  await expect(form).toBeVisible();
  await form.getByLabel('Material de destino', { exact: true }).selectOption(b.id);
  await form.getByLabel('Anclaje de destino', { exact: true }).selectOption('north');
  await form.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect((await links())[0]!.to).toBe('third');
  await end.press('Enter');
  await form.getByLabel('Material de destino', { exact: true }).selectOption(b.id);
  await form.getByLabel('Anclaje de destino', { exact: true }).selectOption('north');
  await form.getByRole('button', { name: 'Guardar', exact: true }).click();
  expect((await links())[0]).toMatchObject({
    id: 'feedback-link',
    to: b.id,
    toAnchor: 'north',
    label: 'Juan',
  });
  await page.getByRole('button', { name: 'Reconectar origen', exact: true }).press('Enter');
  await form.getByLabel('Material de origen', { exact: true }).selectOption('third');
  await form.getByLabel('Anclaje de origen', { exact: true }).selectOption('south');
  await form.getByRole('button', { name: 'Guardar', exact: true }).click();
  expect((await links())[0]).toMatchObject({
    id: 'feedback-link',
    from: 'third',
    fromAnchor: 'south',
    to: b.id,
    toAnchor: 'north',
    label: 'Juan',
  });
  await page.keyboard.press('Control+z');
  expect((await links())[0]!.from).toBe(a.id);
  await reload(page);
  expect((await links())[0]).toMatchObject({
    id: 'feedback-link',
    to: b.id,
    toAnchor: 'north',
    label: 'Juan',
  });
  await selectCable();
  await page.keyboard.press('Escape');
  await cable.locator('.link-hit').focus();
  await page.keyboard.press('Shift+F10');
  await expect(
    page.getByRole('menu', { name: 'Acciones de la conexión', exact: true }),
  ).toHaveCount(0);
  await testInfo.attach('conexion-extremos-acciones', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await cable.locator('.link-hit').press('Delete');
  expect(await links()).toEqual([]);
  await page.keyboard.press('Control+z');
  expect((await links())[0]).toMatchObject({
    id: 'feedback-link',
    to: b.id,
    toAnchor: 'north',
    label: 'Juan',
  });
});

test('C08-B32: identificación pinta el nombre con contraste, fallback editable y lápiz durante trazos consecutivos', async ({
  page,
}, testInfo) => {
  await canvas(page);
  const input = await snapshot(page),
    world = input.state.worlds.find((w) => w.id === 'scout')!;
  world.nodes = world.nodes.filter(
    (node) =>
      node.id === 'note-a' || (node.data.kind === 'reference' && node.data.ref.kind === 'document'),
  );
  world.nodes.forEach((node, i) =>
    Object.assign(node, { x: -350 + i * 350, y: -150, width: 260, height: 160, owner: null }),
  );
  world.links = [];
  world.zones = [];
  world.comments = [];
  world.assignments = [];
  if (world.nodes[0]!.data.kind === 'note') world.nodes[0]!.data.title = '';
  world.nodes.push({
    id: 'label-obstruction',
    x: -335,
    y: -188,
    width: 90,
    height: 28,
    owner: null,
    data: { kind: 'shape', shape: 'rectangle', color: '#445566' },
  });
  input.state.camera = { x: 0, y: 0, z: 1 };
  input.ui.canvas.selections = [];
  input.ui.canvas.selection = null;
  input.ui.canvas.zoneSelection = null;
  await storedFixture(page, input.state, input.ui);
  await reload(page);
  for (const node of world.nodes) {
    const material = page.locator(`[data-node="${node.id}"]`);
    await material.click();
    const label = material.locator('.material-identification button');
    await expect(label).not.toBeEmpty();
    if (node.data.kind === 'note') await expect(label).toHaveText('Sin nombre');
    expect(
      await label.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return document.elementFromPoint(r.x + 20, r.y + r.height / 2)?.closest('button') === el;
      }),
    ).toBe(true);
    const color = await label.evaluate((el) =>
      getComputedStyle(el).color.match(/\d+/g)!.map(Number),
    );
    const count = async () => {
      const pixels = png.sync.read(await label.screenshot()).data;
      let ink = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (color.reduce((sum, n, j) => sum + Math.abs(n - pixels[i + j]!), 0) < 70) ink++;
      return ink;
    };
    expect(await count()).toBeGreaterThan(10);
    const original = await label.evaluate((el) => {
      const color = (el as HTMLElement).style.color;
      const background = getComputedStyle(el).backgroundColor;
      (el as HTMLElement).style.color = background;
      return { color, background };
    });
    await expect
      .poll(() => label.evaluate((el) => getComputedStyle(el).color))
      .toBe(original.background);
    expect(await count()).toBe(0);
    await label.evaluate((el, color) => {
      (el as HTMLElement).style.color = color;
    }, original.color);
    await expect
      .poll(() => label.evaluate((el) => getComputedStyle(el).color.match(/\d+/g)!.map(Number)))
      .toEqual(color);
    expect(await count()).toBeGreaterThan(10);
  }
  await page.getByRole('button', { name: 'Dibujar', exact: true }).click();
  for (let stroke = 0; stroke < 2; stroke++) {
    await page.mouse.move(330 + stroke * 170, 640);
    await page.mouse.down();
    await page.mouse.move(450 + stroke * 170, 680, { steps: 12 });
    await page.mouse.up();
    const drawing = page.locator('.material.drawing').last();
    await expect(drawing.locator('.resize-handle')).toHaveCount(0);
    const cursor = await drawing.locator('svg').evaluate((el) => getComputedStyle(el).cursor);
    expect(cursor).toContain('data:image/svg+xml');
    expect((await snapshot(page)).ui.canvas.tool).toBe('drawing');
  }
  expect(await page.locator('.material.drawing').count()).toBe(2);
  await page.getByRole('button', { name: 'Dibujar', exact: true }).click();
  const unnamed = page.locator('.material.drawing').last();
  await unnamed.click();
  await expect(unnamed.locator('.material-identification button')).toHaveText('Sin nombre');
  await unnamed.getByRole('button', { name: 'Sin nombre', exact: true }).click();
  await page.getByLabel('Nombre del material', { exact: true }).fill('Boceto existente');
  await page.getByLabel('Nombre del material', { exact: true }).press('Enter');
  await expect(unnamed.locator('.material-identification button')).toHaveText('Boceto existente');
  await testInfo.attach('identificacion-y-dibujo', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('C08-B33: tarjeta con metadatos identificables, vacío centrado y propuesta cercana con contexto y resultado explícitos', async ({
  page,
}, testInfo) => {
  await canvas(page);
  const task = page.locator('.material[data-reference-kind=task]');
  await expect(task.locator('.task-material-kind')).toHaveText('Tarea');
  const world = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
  const record = world.tasks[0]!;
  await expect(task.locator('[aria-label^="Prioridad:"]')).toHaveText(record.priority);
  await expect(task.locator('[aria-label^="Responsable:"]')).toHaveText(record.assignee);
  for (const value of await task.locator('.task-material-meta > span').all())
    await expect(value.locator('svg')).toHaveCount(1);
  const cardBounds = (await task.boundingBox())!;
  for (const content of await task
    .locator(':scope > :is(.task-material-kind,h3,p,.task-material-meta)')
    .all()) {
    await expect(content).toBeVisible();
    const box = (await content.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(cardBounds.y);
    expect(box.y + box.height).toBeLessThanOrEqual(cardBounds.y + cardBounds.height);
    expect(box.x + box.width).toBeLessThanOrEqual(cardBounds.x + cardBounds.width);
  }
  const zone = page.locator('[data-zone=zone-eve]');
  const empty = page.locator('[data-zone-label=' + (await zone.getAttribute('data-zone')) + ']');
  const z = (await zone.boundingBox())!,
    e = (await empty.boundingBox())!;
  expect(Math.abs(e.x + e.width / 2 - z.x - z.width / 2)).toBeLessThan(2);
  expect(Math.abs(e.y + e.height / 2 - z.y - z.height / 2)).toBeLessThan(2);
  await zone.click();
  const inspector = page.getByRole('complementary', { name: 'Inspector de zona', exact: true });
  await expect(inspector.getByLabel('Nombre de la zona', { exact: true })).toBeVisible();
  await expect(inspector.getByText('Agente asignado', { exact: true })).toBeVisible();
  await expect(inspector.getByRole('button', { name: 'Ver agente', exact: true })).toHaveText(
    'Ver agente',
  );
  await expect(
    inspector.getByRole('button', { name: 'Quitar agente y devolver materiales', exact: true }),
  ).toHaveText('Retirar agente');
  await inspector.getByRole('button', { name: 'Cerrar panel de zona', exact: true }).click();
  await assignMaterial(page, 'note-b', 'Analizar');
  const proposal = page.locator('.proposal');
  await expect(proposal).toBeVisible();
  await zone.click();
  await expect(inspector.locator('.zone-job-state')).toContainText('Analizar');
  await inspector.getByRole('button', { name: 'Revisar propuesta', exact: true }).click();
  await expect(proposal.locator('.proposal-context')).toContainText('Instrucción: Analizar');
  await expect(proposal.locator('.proposal-result-label')).toContainText(
    'Resultado propuesto · revisión 1',
  );
  await expect(
    proposal.getByRole('region', { name: 'Contenido de la propuesta', exact: true }),
  ).toContainText('Observaciones del material');
  const job = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.assignments[0]!;
  const zoneData = world.zones[0]!;
  const dx = Math.max(
    0,
    zoneData.x - job.position.x - proposalSize.width,
    job.position.x - zoneData.x - zoneData.width,
  );
  const dy = Math.max(
    0,
    zoneData.y - job.position.y - proposalSize.height,
    job.position.y - zoneData.y - zoneData.height,
  );
  expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(80);
  const before = (await snapshot(page)).state.worlds
    .find((w) => w.id === 'scout')!
    .nodes.find((n) => n.id === 'note-b')!;
  expect(before.data).toEqual(world.nodes.find((n) => n.id === 'note-b')!.data);
  await proposal.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pedir cambios', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const colors = await proposal
    .locator('.proposal-actions button')
    .evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundColor));
  expect(colors[0]).not.toBe(colors[1]);
  await page.getByRole('button', { name: 'Cancelar pedido de cambios', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pedir cambios', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await testInfo.attach('zona-y-propuesta-contextual', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Rechazar propuesta', exact: true }).click();
  expect(
    (await snapshot(page)).state.worlds
      .find((w) => w.id === 'scout')!
      .nodes.find((n) => n.id === 'note-b')!.data,
  ).toEqual(before.data);
});
