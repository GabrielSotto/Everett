import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { enterWorld, openSurface, assignMaterial } from './interaction-helpers';
import { storedFixture } from './canvas-fixtures';
const snapshot = (page: Page) => page.evaluate(() => window.EverettDebug!.snapshot());
const world = async (page: Page) =>
  (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
const ready = async (page: Page) => {
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
};
async function canvas(page: Page) {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
}
async function simple(page: Page, ids: string[]) {
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = w.nodes.filter((n) => ids.includes(n.id));
  w.links = [];
  w.comments = [];
  w.assignments = [];
  w.zones = [
    { id: 'zone-eve', name: 'Eve', agent: 'eve', x: 180, y: -200, width: 250, height: 240 },
  ];
  w.nodes.forEach((node, i) =>
    Object.assign(node, {
      x: -380 + (i % 2) * 260,
      y: -150 + Math.floor(i / 2) * 200,
      width: 220,
      height: 160,
    }),
  );
  input.state.camera = { x: 0, y: 0, z: 1 };
  input.ui.canvas.selection = null;
  input.ui.canvas.selections = [];
  input.ui.canvas.zoneSelection = null;
  input.ui.canvas.linkSelection = null;
  input.ui.chat.chatMode = 'closed';
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
}
async function review(page: Page) {
  await expect.poll(async () => (await world(page)).assignments[0]?.phase).toBe('ready');
  await page.locator('[data-zone=zone-eve]').press('Enter');
  await page.getByRole('button', { name: 'Revisar propuesta', exact: true }).click();
  await expect
    .poll(() => page.locator('.proposal').evaluate((el) => el.getBoundingClientRect().left >= 10))
    .toBe(true);
  await expect.poll(() => snapshot(page).then((s) => s.camera.z)).toBeCloseTo(1, 5);
  await expect
    .poll(() => page.locator('.proposal').evaluate((el) => el.getBoundingClientRect().width))
    .toBeCloseTo(
      Math.min(
        ((await world(page)).assignments[0]?.output?.length ?? 1) > 1 ? 560 : 320,
        page.viewportSize()!.width - 24,
      ),
      1,
    );
}
function contrast(ink: string, paper: string) {
  const luminance = (color: string) =>
    color
      .match(/[0-9.]+/g)!
      .map(Number)
      .slice(0, 3)
      .map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
  const a = luminance(ink),
    b = luminance(paper);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const png = createRequire(import.meta.url)(
  resolve('node_modules/playwright-core/lib/utilsBundle.js'),
).PNG as { sync: { read(buffer: Buffer): { data: Buffer; width: number; height: number } } };

test('C08-B40: el dibujo conserva un trazo continuo al zoom mínimo y la toolbar superior cabe a 300 píxeles', async ({
  page,
}, testInfo) => {
  await canvas(page);
  await simple(page, []);
  const input = await snapshot(page);
  input.state.camera = { x: 0, y: 0, z: 0.04 };
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  await page.getByRole('button', { name: 'Dibujar', exact: true }).click();
  await page.getByLabel('Color', { exact: true }).fill('#ffffff');
  await page.getByRole('button', { name: 'Grosor 4 px', exact: true }).click();
  const path = [
    { x: 220, y: 170 },
    { x: 650, y: 170 },
    { x: 650, y: 380 },
    { x: 220, y: 380 },
    { x: 220, y: 170 },
    { x: 650, y: 380 },
  ];
  await page.mouse.move(path[0]!.x, path[0]!.y);
  await page.mouse.down();
  for (const point of path.slice(1)) await page.mouse.move(point.x, point.y, { steps: 60 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Dibujar', exact: true }).click();
  const original = structuredClone((await world(page)).nodes[0]!);
  await page.mouse.click(90, 400);
  await page.mouse.move(440, 270);
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 300);
  await expect.poll(async () => (await snapshot(page)).camera.z).toBeCloseTo(0.01, 5);
  const art = page.locator('.drawing-art');
  // La cámara continúa interpolando su posición después de llegar al límite de zoom.
  await expect
    .poll(() =>
      art.evaluate(async (el) => {
        const before = el.getBoundingClientRect();
        for (let i = 0; i < 8; i++) await new Promise(requestAnimationFrame);
        const after = el.getBoundingClientRect();
        return Math.max(Math.abs(before.x - after.x), Math.abs(before.y - after.y));
      }),
    )
    .toBeLessThan(0.01);
  const geometry = await art.evaluate((el) => {
    const r = el.getBoundingClientRect(),
      view = (el as SVGSVGElement).viewBox.baseVal;
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      vw: view.width,
      vh: view.height,
      points: [...(el.querySelector('polyline') as SVGPolylineElement).points].map((p) => ({
        x: p.x,
        y: p.y,
      })),
    };
  });
  const coverage = (buffer: Buffer) => {
    const image = png.sync.read(buffer);
    let hits = 0,
      total = 0;
    for (let i = 1; i < geometry.points.length; i++) {
      const a = geometry.points[i - 1]!,
        b = geometry.points[i]!;
      const ax = geometry.x + (a.x / geometry.vw) * geometry.width,
        ay = geometry.y + (a.y / geometry.vh) * geometry.height;
      const bx = geometry.x + (b.x / geometry.vw) * geometry.width,
        by = geometry.y + (b.y / geometry.vh) * geometry.height;
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
      for (let j = 0; j <= steps; j++) {
        const x = ax + ((bx - ax) * j) / steps,
          y = ay + ((by - ay) * j) / steps;
        let visible = false;
        for (let yy = Math.floor(y) - 1; yy <= Math.ceil(y) + 1; yy++)
          for (let xx = Math.floor(x) - 1; xx <= Math.ceil(x) + 1; xx++) {
            if (xx < 0 || yy < 0 || xx >= image.width || yy >= image.height) continue;
            const k = (yy * image.width + xx) * 4;
            // El suavizado de diagonales reparte la tinta entre píxeles; 110 conserva
            // su contraste visible. El contraejemplo exige detectar los cortes reales.
            if (image.data[k]! > 110 && image.data[k + 1]! > 110 && image.data[k + 2]! > 110)
              visible = true;
          }
        total++;
        if (visible) hits++;
      }
    }
    return hits / total;
  };
  const good = await page.screenshot();
  await testInfo.attach('dibujo-zoom-minimo-continuo', { body: good, contentType: 'image/png' });
  expect(coverage(good)).toBeGreaterThan(0.99);
  await art.locator('polyline').evaluate((el) => ((el as SVGElement).style.strokeWidth = '4px'));
  const broken = await page.screenshot();
  await testInfo.attach('control-negativo-trazo-subpixel', {
    body: broken,
    contentType: 'image/png',
  });
  expect(coverage(broken)).toBeLessThan(0.2);
  await art
    .locator('polyline')
    .evaluate((el) => (el as SVGElement).style.removeProperty('stroke-width'));
  const restored = await page.screenshot();
  await testInfo.attach('trazo-restaurado', { body: restored, contentType: 'image/png' });
  await testInfo.attach('medicion-continuidad', {
    body: JSON.stringify({
      geometry,
      good: coverage(good),
      broken: coverage(broken),
      restored: coverage(restored),
      style: await art.locator('polyline').evaluate((el) => getComputedStyle(el).strokeWidth),
    }),
    contentType: 'application/json',
  });
  expect(coverage(restored)).toBeGreaterThan(0.99);
  expect((await world(page)).nodes[0]).toEqual(original);
  await page.reload();
  await ready(page);
  expect((await world(page)).nodes[0]).toEqual(original);
  for (const width of [800, 390, 300]) {
    await page.setViewportSize({ width, height: 668 });
    const toolbar = page
      .locator('#shell')
      .getByRole('toolbar', { name: 'Historial de cambios de Canvas' });
    await expect(toolbar).toBeVisible();
    for (const button of await toolbar.getByRole('button').all()) {
      const box = (await button.boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(33);
      expect(box.height).toBeLessThanOrEqual(33);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(59);
    }
  }
  await testInfo.attach('toolbar-300px', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('C08-B34: nota legible en los cinco colores, texto pintado, guardado automático y regreso sin enviar con Enter', async ({
  page,
}, testInfo) => {
  await canvas(page);
  await simple(page, ['note-a']);
  const source = (await world(page)).nodes[0]!;
  await page.locator('[data-node=note-a]').press('Enter');
  const title = page.getByLabel('Título de la nota', { exact: true }),
    body = page.getByLabel('Contenido de la nota', { exact: true });
  await title.fill('Nota legible de prueba');
  await body.fill('N C L: escribir no activa herramientas.\nUna segunda línea permanece guardada.');
  for (const name of ['Amarillo', 'Lavanda', 'Verde', 'Azul', 'Rosa']) {
    await page.getByRole('button', { name: 'Color ' + name, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Color ' + name, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    for (const field of [title, body]) {
      const colors = await field.evaluate((el) => ({
        ink: getComputedStyle(el).color,
        paper: getComputedStyle(el.closest('.note-paper')!).backgroundColor,
      }));
      expect(contrast(colors.ink, colors.paper)).toBeGreaterThanOrEqual(4.5);
    }
  }
  // El tooltip de la última muestra puede cubrir el input y contaminar el
  // recuento de tinta. Retirar el puntero sin alterar el comparador ni su umbral.
  await page.mouse.move(30, 100);
  await expect(page.locator('#tooltip')).toHaveCSS('opacity', '0');
  const painted = async () => {
    const image = png.sync.read(await title.screenshot());
    let ink = 0;
    for (let i = 0; i < image.data.length; i += 4)
      if (image.data[i]! < 90 && image.data[i + 1]! < 90 && image.data[i + 2]! < 90) ink++;
    return ink;
  };
  expect(await painted()).toBeGreaterThan(80);
  const before = await title.evaluate((el) => el.getAttribute('style'));
  await title.evaluate((el) => {
    (el as HTMLElement).style.color = getComputedStyle(el.closest('.note-paper')!).backgroundColor;
  });
  await expect
    .poll(() =>
      title.evaluate(
        (el) =>
          getComputedStyle(el).color ===
          getComputedStyle(el.closest('.note-paper')!).backgroundColor,
      ),
    )
    .toBe(true);
  expect(await painted()).toBe(0);
  await title.evaluate(
    (el, style) => (style === null ? el.removeAttribute('style') : el.setAttribute('style', style)),
    before,
  );
  await expect
    .poll(() => title.evaluate((el) => getComputedStyle(el).color))
    .toBe('rgb(37, 49, 60)');
  expect(await painted()).toBeGreaterThan(80);
  const bodyBitmap = png.sync.read(await body.screenshot());
  let bodyInk = 0;
  for (let i = 0; i < bodyBitmap.data.length; i += 4)
    if (bodyBitmap.data[i]! < 90 && bodyBitmap.data[i + 1]! < 90 && bodyBitmap.data[i + 2]! < 90)
      bodyInk++;
  expect(bodyInk).toBeGreaterThan(80);
  await testInfo.attach('nota-contraste-real', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Volver al Canvas', exact: true }).click();
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  const saved = (await world(page)).nodes[0]!;
  expect(saved.id).toBe(source.id);
  expect(saved.x).toBe(source.x);
  expect(saved.data.kind === 'note' && saved.data.title).toBe('Nota legible de prueba');
  await page.reload();
  await ready(page);
  await page.locator('[data-node=note-a]').press('Enter');
  await expect(title).toHaveValue('Nota legible de prueba');
  expect(await body.inputValue()).toContain('Una segunda línea');
});

test('C08-B35: Play mantiene su centro durante una pulsación sostenida y reproduce al primer clic tras recargar con distintos zooms', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await canvas(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.getByRole('button', { name: 'Cargar ejemplos multimedia', exact: true }).click();
  await expect(page.locator('.material.video')).toHaveCount(1);
  const initial = await snapshot(page),
    w = initial.state.worlds.find((w) => w.id === 'scout')!,
    video = w.nodes.find((n) => n.data.kind === 'video')!;
  w.nodes = [video];
  w.zones = [];
  w.links = [];
  w.comments = [];
  initial.ui.canvas.selection = null;
  initial.ui.canvas.selections = [];
  initial.ui.canvas.zoneSelection = null;
  Object.assign(video, { x: -160, y: -90, width: 320, height: 180 });
  for (const zoom of [0.5, 1, 2])
    for (let pass = 0; pass < 2; pass++) {
      initial.state.camera = { x: 0, y: 0, z: zoom };
      await storedFixture(page, initial.state, initial.ui);
      await page.reload();
      await ready(page);
      const player = page.locator('.material.video video'),
        play = page.getByRole('button', { name: 'Reproducir video', exact: true });
      await expect(play).toBeEnabled();
      const box = (await play.boundingBox())!,
        cx = box.x + box.width / 2,
        cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      const frames = await play.evaluate(async (el) => {
        const frames = [];
        for (let i = 0; i < 14; i++) {
          await new Promise(requestAnimationFrame);
          const r = el.getBoundingClientRect();
          frames.push({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
        }
        return frames;
      });
      for (const frame of frames) {
        expect(Math.abs(frame.x - cx)).toBeLessThan(1);
        expect(Math.abs(frame.y - cy)).toBeLessThan(1);
      }
      await page.mouse.up();
      await expect
        .poll(() => player.evaluate((el) => (el as HTMLVideoElement).currentTime))
        .toBeGreaterThan(0);
      await expect(player).toHaveAttribute('controls', '');
      expect((await world(page)).nodes[0]!.x).toBe(video.x);
      expect((await world(page)).nodes[0]!.y).toBe(video.y);
      await testInfo.attach('play-centro-' + zoom + '-' + pass, {
        body: JSON.stringify(frames),
        contentType: 'application/json',
      });
    }
  await testInfo.attach('video-primer-clic', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('C08-B36: cables inversos no se duplican, borrado sin menú, historial visible y Backspace distingue campos de materiales', async ({
  page,
}, testInfo) => {
  await canvas(page);
  await simple(page, ['note-a', 'note-b']);
  const linkCount = async () => (await world(page)).links.length;
  await page.getByRole('button', { name: 'Conectar · L', exact: true }).click();
  const port = (id: string, anchor: string) =>
    page
      .locator('[data-node=' + id + ']')
      .getByRole('button', { name: 'Anclaje ' + anchor, exact: true });
  await port('note-a', 'east').press('Enter');
  await port('note-b', 'west').press('Enter');
  expect(await linkCount()).toBe(1);
  await port('note-b', 'west').press('Enter');
  await port('note-a', 'east').press('Enter');
  expect(await linkCount()).toBe(1);
  await port('note-a', 'north').press('Enter');
  await port('note-b', 'south').press('Enter');
  expect(await linkCount()).toBe(2);
  await page.getByRole('button', { name: 'Conectar · L', exact: true }).click();
  await page.locator('.link-hit').first().press('Enter');
  await page.getByLabel('Etiqueta de conexión', { exact: true }).fill('NCL etiqueta');
  await page.getByLabel('Etiqueta de conexión', { exact: true }).press('Backspace');
  expect(await linkCount()).toBe(2);
  await page.keyboard.press('Escape');
  await page.locator('.link-hit').first().focus();
  await page.keyboard.press('Shift+F10');
  await expect(
    page.getByRole('menu', { name: 'Acciones de la conexión', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.link-hit').first()).toBeFocused();
  await expect(page.locator('.link-actions,[data-label] button')).toHaveCount(0);
  await testInfo.attach('conexion-con-borrado-por-teclado', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.keyboard.press('Delete');
  await expect(page.locator('dialog.removal-dialog')).toHaveCount(0);
  expect(await linkCount()).toBe(1);
  const history = page.getByRole('toolbar', { name: 'Historial de cambios de Canvas' });
  await expect(
    page.locator('#shell').getByRole('toolbar', { name: 'Historial de cambios de Canvas' }),
  ).toBeVisible();
  for (const button of await history.getByRole('button').all()) {
    const box = (await button.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(33);
    expect(box.height).toBeLessThanOrEqual(33);
    expect(box.y + box.height).toBeLessThanOrEqual(59);
  }
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect(await linkCount()).toBe(2);
  await page.getByRole('button', { name: 'Rehacer · Ctrl+Shift+Z', exact: true }).click();
  expect(await linkCount()).toBe(1);
  const before = structuredClone((await world(page)).nodes[0]!);
  await page.locator('[data-node=note-a]').click();
  await page.keyboard.press('Backspace');
  await expect(page.locator('dialog.removal-dialog')).toHaveCount(0);
  expect((await world(page)).nodes.some((n) => n.id === 'note-a')).toBe(false);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes.find((n) => n.id === 'note-a')).toEqual(before);
});

test('C08-B37: previews independientes de notas, documentos y archivos; revisión durable y aceptar aplica los materiales mostrados', async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  await canvas(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.getByRole('button', { name: 'Cargar ejemplos multimedia', exact: true }).click();
  await expect(page.locator('.material.video')).toHaveCount(1);
  const original = await snapshot(page),
    w = original.state.worlds.find((w) => w.id === 'scout')!;
  const inputs = w.nodes.filter(
    (n) =>
      ['image', 'video', 'pdf'].includes(n.data.kind) ||
      n.id === 'note-b' ||
      (n.data.kind === 'reference' && n.data.ref.kind === 'document'),
  );
  w.nodes = inputs;
  w.comments = [];
  w.links = [];
  w.assignments = [];
  w.zones = [
    { id: 'zone-eve', name: 'Eve', agent: 'eve', x: 160, y: -180, width: 240, height: 260 },
  ];
  inputs.forEach((n, i) => {
    n.x = -380;
    n.y = -180 + i * 230;
  });
  original.state.camera = { x: 0, y: 0, z: 1 };
  original.ui.canvas.selection = null;
  original.ui.canvas.selections = [];
  original.ui.canvas.zoneSelection = null;
  await storedFixture(page, original.state, original.ui);
  await page.reload();
  await ready(page);
  for (const input of inputs) {
    const source = structuredClone((await world(page)).nodes.find((n) => n.id === input.id)!);
    const documents = structuredClone((await world(page)).docs);
    await page.locator('[data-node="' + input.id + '"]').press('Shift+F10');
    await page.getByRole('menuitem', { name: 'Asignar a una zona', exact: false }).click();
    await page
      .getByRole('menu', { name: 'Destinos del Mundo', exact: true })
      .getByRole('menuitem', { name: input.id === 'note-b' ? 'Analizar' : 'Resumir', exact: true })
      .first()
      .click();
    await review(page);
    const proposal = page.locator('.proposal'),
      ghosts = proposal.locator('[data-proposed-node]');
    const job = (await world(page)).assignments[0]!,
      count = job.output!.length;
    expect(count).toBe(input.id === 'note-b' ? 2 : 1);
    await expect(ghosts).toHaveCount(count);
    await expect(ghosts.first()).toHaveClass(
      new RegExp(source.data.kind === 'reference' ? 'reference' : source.data.kind),
    );
    expect((await world(page)).nodes.find((n) => n.id === source.id)!.data).toEqual(source.data);
    expect((await world(page)).docs).toEqual(documents);
    const decision = (await proposal.locator('.proposal-decision').boundingBox())!,
      preview = (await proposal.locator('.proposal-preview').boundingBox())!;
    expect(decision.y).toBeGreaterThanOrEqual(preview.y + preview.height);
    if (['image', 'video', 'pdf'].includes(source.data.kind)) {
      await expect(ghosts.locator('.note')).toHaveCount(0);
      const media = ghosts.locator(source.data.kind === 'video' ? 'video' : 'img');
      await expect
        .poll(() =>
          media.evaluate((el) =>
            el instanceof HTMLImageElement ? el.naturalWidth : (el as HTMLVideoElement).videoWidth,
          ),
        )
        .toBeGreaterThan(0);
      await proposal.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
      await page
        .getByLabel('Cambios solicitados', { exact: true })
        .fill('Conservar el archivo completo');
      await page.getByRole('button', { name: 'Enviar cambios', exact: true }).click();
      await review(page);
      const revised = (await world(page)).assignments[0]!;
      expect(revised.id).toBe(job.id);
      expect(revised.revision).toBe(2);
      expect(revised.input).toBe(job.input);
      expect(revised.output![0]!.material.data).toEqual(job.output![0]!.material.data);
      await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
      await page
        .getByLabel('Cambios solicitados', { exact: true })
        .fill('Pedido privado sin enviar');
      await page.reload();
      await ready(page);
      await expect(page.locator('.proposal')).toHaveCount(1);
      expect((await world(page)).assignments[0]!.output).toEqual(revised.output);
      expect((await world(page)).nodes.find((n) => n.id === source.id)!.owner).toBe('eve');
      await review(page);
      await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
      await expect(page.getByLabel('Cambios solicitados', { exact: true })).toHaveValue(
        'Pedido privado sin enviar',
      );
      await page.getByRole('button', { name: 'Cancelar pedido de cambios', exact: true }).click();
    }
    const pending = (await world(page)).assignments[0]!;
    await testInfo.attach('preview-' + source.data.kind, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await page.getByRole('button', { name: 'Aceptar propuesta', exact: true }).click();
    await expect(proposal).toHaveCount(0);
    for (const draft of pending.output!) {
      const actual = (await world(page)).nodes.find((n) => n.id === draft.material.id)!;
      expect(actual.data).toEqual(draft.material.data);
      expect(actual.owner).toBeNull();
      if (draft.document)
        expect((await world(page)).docs.find((d) => d.id === draft.document!.id)).toMatchObject(
          draft.document,
        );
    }
    expect((await world(page)).nodes.find((n) => n.id === source.id)!.data).toEqual(source.data);
  }
});

test('C08-B38: chips en una línea durante aperturas repetidas, decisión suave y sin desplazamientos de ancho con zoom y motion reducido', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await canvas(page);
  await assignMaterial(page, 'note-b', 'Analizar');
  await review(page);
  for (const reduced of [false, true])
    for (const [width, height] of [
      [1440, 900],
      [390, 668],
      [300, 500],
    ] as const) {
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await page.setViewportSize({ width, height });
      await expect(page.locator('.proposal')).toBeVisible();
      // Aislar el gesto del reencuadre que provoca resize; luego repetir
      // aperturas rápidas, incluida la inversión de una contracción en curso.
      await expect
        .poll(async () => (await page.locator('.proposal').boundingBox())?.x ?? -Infinity)
        .toBeCloseTo((width - Math.min(560, width - 24)) / 2, 1);
      await expect
        .poll(async () => (await page.locator('.proposal').boundingBox())?.y ?? -Infinity)
        .toBeCloseTo(83, 1);
      await expect
        .poll(() =>
          page
            .locator('.proposal')
            .evaluate(
              (el) =>
                el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
            ),
        )
        .toBe(0);
      for (let pass = 0; pass < 2; pass++) {
        const sampling = page.evaluate(async () => {
          const frames = [];
          for (let i = 0; i < 35; i++) {
            await new Promise(requestAnimationFrame);
            const box = document.querySelector('.proposal-decision')!.getBoundingClientRect();
            const chips = Array.from(
              document.querySelectorAll('.revision-suggestions button'),
              (button) => {
                const range = document.createRange();
                range.selectNodeContents(button);
                return {
                  rows: new Set(Array.from(range.getClientRects(), (r) => Math.round(r.top))).size,
                  whiteSpace: getComputedStyle(button).whiteSpace,
                };
              },
            );
            frames.push({
              active:
                document
                  .querySelector('[data-action=assignment-revise]')!
                  .getAttribute('aria-pressed') === 'true',
              width: box.width,
              height: box.height,
              previewHeight: document.querySelector('.proposal-preview')!.getBoundingClientRect()
                .height,
              previewAnimations: document.querySelector('.proposal-preview')!.getAnimations()
                .length,
              chips,
              animations: document.querySelector('.proposal-decision')!.getAnimations().length,
            });
          }
          return frames;
        });
        await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
        const frames = await sampling;
        expect(
          Math.max(...frames.map((f) => f.width)) - Math.min(...frames.map((f) => f.width)),
        ).toBeLessThan(1);
        expect(
          frames.every((f) => f.chips.every((c) => c.rows === 1 && c.whiteSpace === 'nowrap')),
        ).toBe(true);
        if (!reduced) {
          expect(frames.some((f) => f.animations > 0)).toBe(true);
          expect(new Set(frames.map((f) => Math.round(f.height))).size).toBeGreaterThan(3);
        } else expect(frames.every((f) => f.animations === 0)).toBe(true);
        const opening = frames.filter((frame) => frame.active);
        if (!reduced && width !== 1440) {
          expect(opening.some((frame) => frame.previewAnimations > 0)).toBe(true);
          expect(
            new Set(opening.map((frame) => Math.round(frame.previewHeight))).size,
          ).toBeGreaterThan(3);
        }
        if (reduced) expect(frames.every((frame) => frame.previewAnimations === 0)).toBe(true);
        for (let i = 1; i < opening.length; i++) {
          expect(opening[i]!.height - opening[i - 1]!.height).toBeGreaterThanOrEqual(-1);
          expect(opening[i]!.previewHeight - opening[i - 1]!.previewHeight).toBeLessThanOrEqual(1);
        }
        await testInfo.attach('chips-' + width + '-' + reduced + '-' + pass, {
          body: JSON.stringify(frames),
          contentType: 'application/json',
        });
        await expect(
          page.getByRole('button', { name: 'Pedir cambios', exact: true }),
        ).toHaveAttribute('aria-pressed', 'true');
        await page.getByRole('button', { name: 'Cancelar pedido de cambios', exact: true }).click();
        await expect(page.getByLabel('Cambios solicitados', { exact: true })).toHaveCount(0);
      }
    }
  await testInfo.attach('propuesta-chips-estables', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('C08-B39: Formas enlaza su menú y estado, lápiz continuo desde la primera carga, comentario compacto y nombre de zona independiente', async ({
  page,
}, testInfo) => {
  await canvas(page);
  await simple(page, ['note-a']);
  await page.getByRole('button', { name: 'Formas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Formas', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Seleccionar · V', exact: true }),
  ).not.toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.locator('.shape-menu').evaluate((el) => getComputedStyle(el, '::after').content),
  ).not.toBe('none');
  await page.getByRole('button', { name: 'Estrella', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Formas', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const trigger = (await page.getByRole('button', { name: 'Formas', exact: true }).boundingBox())!,
    style = (await page.locator('.canvas-style').boundingBox())!;
  expect(style.y + style.height).toBeLessThan(trigger.y);
  expect(
    await page.locator('.canvas-style').evaluate((el) => getComputedStyle(el, '::after').content),
  ).not.toBe('none');
  await page.getByRole('button', { name: 'Dibujar', exact: true }).click();
  for (let pass = 0; pass < 2; pass++) {
    await page.mouse.move(180, 180 + pass * 90);
    await page.mouse.down();
    for (let i = 0; i < 5; i++) {
      const x = 200 + i * 20,
        y = 190 + pass * 90 + i * 8;
      await page.mouse.move(x, y);
      expect(
        await page.evaluate(
          ({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)!).cursor,
          { x, y },
        ),
      ).toContain('data:image/svg+xml');
    }
    await page.mouse.up();
    expect((await snapshot(page)).ui.canvas.tool).toBe('drawing');
  }
  await page.getByRole('button', { name: 'Dibujar', exact: true }).click();
  await page.locator('[data-node=note-a]').click();
  await page.keyboard.press('c');
  await page.getByLabel('Nuevo comentario', { exact: true }).fill('Comentario completo');
  await page.getByRole('button', { name: 'Publicar comentario', exact: true }).click();
  const marker = page.getByRole('button', { name: 'Comentario de Gabi', exact: true });
  expect(
    await marker.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.backgroundColor, s.borderWidth, s.boxShadow, s.borderRadius];
    }),
  ).toEqual(['rgba(0, 0, 0, 0)', '0px', 'none', '0px']);
  await expect(marker.locator('svg')).toHaveCount(1);
  for (const delta of [-500, -400, 600]) {
    await page.mouse.move(100, 300);
    await page.mouse.wheel(0, delta);
    await expect.poll(async () => (await marker.boundingBox())!.width).toBeCloseTo(24, 1);
    const anchoring = await marker.evaluate((el) => {
      const node = el.closest<HTMLElement>('[data-node]')!,
        box = node.getBoundingClientRect(),
        marker = el.getBoundingClientRect(),
        scale = box.width / node.offsetWidth,
        style = getComputedStyle(node);
      return {
        x: marker.x + marker.width / 2,
        y: marker.y + marker.height / 2,
        anchorX: box.right - parseFloat(style.borderRightWidth) * scale,
        anchorY: box.top + parseFloat(style.borderTopWidth) * scale,
      };
    });
    // Separación constante del tirador de tamaño, incluso durante el zoom.
    expect(Math.abs(anchoring.x - anchoring.anchorX - 12)).toBeLessThan(1);
    expect(Math.abs(anchoring.y - anchoring.anchorY - 12)).toBeLessThan(1);
  }
  await testInfo.attach('comentario-sin-crecer-con-zoom', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Dibujar zona', exact: true }).click();
  await page.mouse.move(100, 180);
  await page.mouse.down();
  await page.mouse.move(250, 330, { steps: 8 });
  await page.mouse.up();
  const inspector = page.getByRole('complementary', { name: 'Inspector de zona', exact: true }),
    name = inspector.getByLabel('Nombre de la zona', { exact: true });
  await name.fill('Mi zona');
  await name.press('Tab');
  await inspector.getByLabel('Agente de la zona', { exact: true }).selectOption('milo');
  await expect(name).toHaveValue('Mi zona');
  await expect(inspector.getByLabel('Agente de la zona', { exact: true })).toHaveValue('milo');
  expect((await world(page)).zones.find((z) => z.name === 'Mi zona')!.agent).toBe('milo');
  await page.reload();
  await ready(page);
  expect((await world(page)).zones.find((z) => z.name === 'Mi zona')!.agent).toBe('milo');
});
