import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';
import { storedFixture, videoFixture } from './canvas-fixtures';
const snapshot = (page: Page) => page.evaluate(() => window.EverettDebug!.snapshot());
const world = async (page: Page) =>
  (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
const ready = async (page: Page) => {
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
};
async function fixture(page: Page) {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = w.nodes
    .filter(
      (n) =>
        ['note-a', 'note-b'].includes(n.id) ||
        (n.data.kind === 'reference' && n.data.ref.kind === 'document'),
    )
    .slice(0, 3);
  expect(w.nodes).toHaveLength(3);
  for (const [i, n] of w.nodes.entries())
    Object.assign(n, { x: -490 + i * 230, y: -140, width: 190, height: 130, owner: null });
  w.links = [
    {
      id: 'group-link',
      from: w.nodes[0]!.id,
      to: w.nodes[1]!.id,
      fromAnchor: 'east',
      toAnchor: 'west',
      label: 'Juntas',
    },
  ];
  w.zones = [
    {
      id: 'zone-eve',
      name: 'Eve',
      agent: 'eve',
      x: 230,
      y: -170,
      width: 250,
      height: 260,
      instruction: 'Organizar los materiales',
    },
  ];
  w.assignments = [];
  w.comments = [];
  input.state.camera = { x: 0, y: 0, z: 1 };
  Object.assign(input.ui.canvas, {
    selection: null,
    selections: [],
    zoneSelection: null,
    linkSelection: null,
    tool: 'select',
  });
  input.ui.chat.chatMode = 'closed';
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  return input;
}
async function boxSelect(page: Page, ids: string[], reverse = false, additive = false) {
  const boxes = await Promise.all(
    ids.map((id) => page.locator('[data-node="' + id + '"]').boundingBox()),
  );
  const left = Math.min(...boxes.map((b) => b!.x)) - 12,
    top = Math.min(...boxes.map((b) => b!.y)) - 18;
  const right = Math.max(...boxes.map((b) => b!.x + b!.width)) + 12,
    bottom = Math.max(...boxes.map((b) => b!.y + b!.height)) + 18;
  if (additive) await page.keyboard.down('Shift');
  await page.mouse.move(reverse ? right : left, reverse ? bottom : top);
  await page.mouse.down();
  await page.mouse.move(reverse ? left : right, reverse ? top : bottom, { steps: 10 });
  await expect(page.locator('.selection-box')).toHaveCount(1);
  await page.mouse.up();
  if (additive) await page.keyboard.up('Shift');
  await expect(page.locator('.selection-box')).toHaveCount(0);
}

test('C08-B41: arrastrar en Seleccionar reúne tres materiales, mueve el grupo, deshace y transfiere todos a una zona conservando originales y vínculos', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await fixture(page);
  const before = await world(page),
    ids = before.nodes.map((n) => n.id),
    camera = (await snapshot(page)).camera;
  await boxSelect(page, ids);
  expect((await snapshot(page)).ui.canvas.selections.sort()).toEqual([...ids].sort());
  expect((await snapshot(page)).camera).toEqual(camera);
  await expect(page.locator('.material.selected[data-node]')).toHaveCount(3);
  await testInfo.attach('tres-materiales-seleccionados', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  const first = page.locator('[data-node="' + ids[0] + '"]'),
    start = (await first.boundingBox())!;
  await page.mouse.move(start.x + 60, start.y + 55);
  await page.mouse.down();
  await page.mouse.move(start.x + 140, start.y + 85, { steps: 8 });
  for (const n of before.nodes) {
    const r = (await page.locator('[data-node="' + n.id + '"]').boundingBox())!;
    expect(r.x - start.x - (n.x - before.nodes[0]!.x)).toBeCloseTo(80, 1);
  }
  await page.mouse.up();
  for (const n of (await world(page)).nodes) {
    const original = before.nodes.find((x) => x.id === n.id)!;
    expect(n.x).toBeCloseTo(original.x + 80, 3);
    expect(n.y).toBeCloseTo(original.y + 30, 3);
    expect(n.data).toEqual(original.data);
  }
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes).toEqual(before.nodes);
  await page.getByRole('button', { name: 'Rehacer · Ctrl+Shift+Z', exact: true }).click();
  expect((await world(page)).nodes[1]!.x).toBeCloseTo(before.nodes[1]!.x + 80, 3);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await boxSelect(page, ids, true);
  await page.keyboard.press('Backspace');
  await expect(page.locator('dialog.removal-dialog')).toHaveCount(0);
  expect((await world(page)).nodes).toHaveLength(0);
  expect((await world(page)).docs).toEqual(before.docs);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes).toEqual(before.nodes);
  expect((await world(page)).links).toEqual(before.links);
  await boxSelect(page, ids);
  const source = (await first.boundingBox())!,
    zone = (await page.locator('[data-zone=zone-eve]').boundingBox())!;
  await page.mouse.move(source.x + 60, source.y + 55);
  await page.mouse.down();
  await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2, { steps: 15 });
  await page.mouse.up();
  expect((await world(page)).nodes.every((n) => n.owner === 'eve')).toBe(true);
  await expect(page.locator('[data-assigned-id]')).toHaveCount(3);
  const jobIds = (await world(page)).assignments.map((j) => j.id);
  expect(new Set(jobIds).size).toBe(3);
  expect((await world(page)).assignments.map((j) => j.node).sort()).toEqual([...ids].sort());
  await page.reload();
  await ready(page);
  expect((await world(page)).assignments.map((j) => j.id)).toEqual(jobIds);
  await expect
    .poll(async () => (await world(page)).assignments.filter((j) => j.phase === 'ready').length)
    .toBe(3);
  await page.locator('[data-zone=zone-eve]').press('Enter');
  await page
    .getByRole('button', { name: 'Quitar agente y devolver materiales', exact: true })
    .click();
  expect((await world(page)).nodes).toEqual(before.nodes);
  expect((await world(page)).links).toEqual(before.links);
  expect((await world(page)).docs).toEqual(before.docs);
  await expect(page.locator('.proposal,[data-assigned-id]')).toHaveCount(0);
});

test('C08-B42: rectángulo aditivo e inverso a distintos zooms, Shift alterna, Esc y pointercancel conservan selección y paneo usa su herramienta', async ({
  page,
}, testInfo) => {
  const input = await fixture(page),
    ids = (await world(page)).nodes.map((n) => n.id);
  for (const z of [0.4, 1, 2]) {
    input.state.camera = { x: 0, y: 0, z };
    // Centrar el grupo y dejar márgenes para comenzar el rectángulo en el fondo.
    const w = input.state.worlds.find((w) => w.id === 'scout')!;
    w.zones[0]!.y = 220;
    w.nodes.forEach((n, i) =>
      Object.assign(n, { x: -300 + i * 210, y: -120, width: 180, height: 120 }),
    );
    await storedFixture(page, input.state, input.ui);
    await page.reload();
    await ready(page);
    const cam = (await snapshot(page)).camera;
    await boxSelect(page, [ids[0]!]);
    await boxSelect(page, [ids[1]!, ids[2]!], true, true);
    expect((await snapshot(page)).ui.canvas.selections.sort()).toEqual([...ids].sort());
    expect((await snapshot(page)).camera).toEqual(cam);
    await page
      .locator('[data-node="' + ids[1] + '"]')
      .click({ modifiers: ['Shift'], position: { x: 35, y: 35 } });
    expect((await snapshot(page)).ui.canvas.selections).not.toContain(ids[1]);
    const previous = (await snapshot(page)).ui.canvas.selections;
    await page.mouse.move(120, 140);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 5 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect((await snapshot(page)).ui.canvas.selections).toEqual(previous);
    expect((await snapshot(page)).camera).toEqual(cam);
    await page.mouse.move(120, 140);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 5 });
    await page.evaluate(() =>
      document
        .querySelector('#scene')!
        .dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })),
    );
    await page.mouse.up();
    await expect(page.locator('.selection-box')).toHaveCount(0);
    expect((await snapshot(page)).ui.canvas.selections).toEqual(previous);
    await page.getByRole('button', { name: 'Panear · H', exact: true }).click();
    await page.mouse.move(110, 200);
    await page.mouse.down();
    await page.mouse.move(160, 240, { steps: 6 });
    await expect(page.locator('#scene')).toHaveCSS('cursor', 'grabbing');
    await page.mouse.up();
    await expect.poll(async () => (await snapshot(page)).camera.x).not.toBe(cam.x);
    await page.getByRole('button', { name: 'Seleccionar · V', exact: true }).click();
  }
  await testInfo.attach('seleccion-con-zoom', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

const png = createRequire(import.meta.url)(
  resolve('node_modules/playwright-core/lib/utilsBundle.js'),
).PNG as { sync: { read(buffer: Buffer): { data: Buffer; width: number; height: number } } };
test('C08-B43: el video pinta un fotograma real sin Play, recupera previews antiguos y copias tras recargar sin cambiar bytes ni reproducción', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const buffer = await videoFixture(page.context());
  await page
    .locator('#canvas-file-import')
    .setInputFiles({ name: 'Fotograma real.webm', mimeType: 'video/webm', buffer });
  const poster = page.locator('.material.video .video-poster').first();
  await expect(poster).toBeVisible();
  await expect
    .poll(() => poster.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const original = (await world(page)).nodes.find((n) => n.data.kind === 'video')!;
  expect(original.data.kind === 'video' && original.data.preview).toMatch(
    /^data:image\/jpeg;base64,/,
  );
  const pixel = (image: Buffer) => {
    const p = png.sync.read(image),
      i = (Math.floor(p.height * 0.2) * p.width + Math.floor(p.width * 0.2)) * 4;
    return [p.data[i]!, p.data[i + 1]!, p.data[i + 2]!];
  };
  const good = await poster.screenshot();
  const color = pixel(good);
  for (const [i, target] of [102, 117, 191].entries())
    expect(Math.abs(color[i]! - target)).toBeLessThan(12);
  const video = page.locator('.material.video video').first();
  expect(await video.evaluate((el) => (el as HTMLVideoElement).paused)).toBe(true);
  expect(await video.evaluate((el) => (el as HTMLVideoElement).currentTime)).toBe(0);
  await testInfo.attach('video-visible-antes-de-play', { body: good, contentType: 'image/png' });
  await page.locator('[data-node="' + original.id + '"]').press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Duplicar', exact: true }).click();
  await expect(page.locator('.material.video .video-poster')).toHaveCount(2);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = w.nodes.filter((n) => n.data.kind === 'video');
  w.links = [];
  w.zones = [];
  w.assignments = [];
  w.comments = [];
  for (const n of w.nodes) {
    Object.assign(n, { x: -160, y: -90, width: 320, height: 180 });
    if (n.data.kind === 'video') delete n.data.preview;
  }
  input.state.camera = { x: 0, y: 0, z: 1 };
  input.ui.canvas.selection = null;
  input.ui.canvas.selections = [];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  await expect(page.locator('.material.video .video-poster')).toHaveCount(2);
  await expect
    .poll(async () =>
      (await world(page)).nodes.every((n) => n.data.kind === 'video' && !!n.data.preview),
    )
    .toBe(true);
  const recovered = (await world(page)).nodes;
  for (const z of [0.3, 1, 2]) {
    const state = await snapshot(page);
    state.state.camera = { x: 0, y: 0, z };
    await storedFixture(page, state.state, state.ui);
    await page.reload();
    await ready(page);
    const image = page.locator('.material.video .video-poster').last();
    await expect
      .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    const painted = await image.screenshot();
    for (const [i, target] of [102, 117, 191].entries())
      expect(Math.abs(pixel(painted)[i]! - target)).toBeLessThan(12);
    const rect = (await image.boundingBox())!;
    await page
      .locator('.material.video')
      .evaluateAll((elements) =>
        elements.forEach((el) =>
          el
            .querySelectorAll<HTMLElement>('video,.video-poster')
            .forEach((media) => (media.style.visibility = 'hidden')),
        ),
      );
    const blank = await page.screenshot({ clip: rect });
    expect(
      Math.max(...pixel(blank).map((v, i) => Math.abs(v - pixel(painted)[i]!))),
    ).toBeGreaterThan(80);
    await page
      .locator('.material.video')
      .evaluateAll((elements) =>
        elements.forEach((el) =>
          el
            .querySelectorAll<HTMLElement>('video,.video-poster')
            .forEach((media) => media.style.removeProperty('visibility')),
        ),
      );
    expect((await world(page)).nodes).toEqual(recovered);
    await testInfo.attach('video-reposo-zoom-' + z, { body: painted, contentType: 'image/png' });
  }
  const bytes = await page.evaluate(
    async (asset) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open('everett-canvas', 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const blob = await new Promise<Blob>((resolve, reject) => {
        const r = db.transaction('assets').objectStore('assets').get(asset);
        r.onsuccess = () => resolve(r.result as Blob);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    },
    original.data.kind === 'video' ? original.data.asset : '',
  );
  expect(Buffer.from(bytes)).toEqual(buffer);
  const players = page.locator('.material.video video');
  for (const player of await players.all()) {
    expect(await player.evaluate((el) => (el as HTMLVideoElement).paused)).toBe(true);
    expect(await player.evaluate((el) => (el as HTMLVideoElement).currentTime)).toBe(0);
  }
});
