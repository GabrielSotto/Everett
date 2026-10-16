import type { Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test, expect } from './fixtures';
import { storedFixture } from './canvas-fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { openSurface, assignMaterial } from './interaction-helpers';

const search = (page: Page) =>
  page.getByRole('textbox', { name: 'Buscar en Everett', exact: true });
const trigger = (page: Page) =>
  page.getByRole('button', { name: 'Buscar en Everett', exact: true });
const png = createRequire(import.meta.url)(
  resolve('node_modules/playwright-core/lib/utilsBundle.js'),
).PNG as { sync: { read(buffer: Buffer): { data: Buffer } } };

async function prepare(page: Page): Promise<void> {
  await start(page);
  const input = await snapshot(page),
    project = input.state.worlds.find((item) => item.id === 'scout')!;
  project.nodes = [
    {
      id: 'origin',
      x: -300,
      y: -100,
      width: 200,
      height: 140,
      owner: null,
      data: { kind: 'note', title: 'Origen', text: 'Trabajo en curso', color: '#e4efdf' },
    },
    {
      id: 'far-note',
      x: 8000,
      y: 5000,
      width: 240,
      height: 180,
      owner: null,
      data: {
        kind: 'note',
        title: 'Decisión: guardado local',
        text: 'Cámara, contenido y borradores conservados',
        color: '#e4efdf',
      },
    },
  ];
  input.state.camera = { x: 145, y: -88, z: 0.8 };
  input.ui.canvas.selection = 'origin';
  input.ui.canvas.selections = ['origin'];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
}

async function styleGeometry(page: Page, selector = '.canvas-style') {
  return page.locator(selector).evaluate((panel) => {
    const box = panel.getBoundingClientRect(),
      dock = document.querySelector('.canvas-tools')!.getBoundingClientRect();
    const dx = Math.max(box.left - dock.right, dock.left - box.right, 0);
    const dy = Math.max(box.top - dock.bottom, dock.top - box.bottom, 0);
    return {
      box: box.toJSON(),
      gap: Math.hypot(dx, dy),
      overlap:
        Math.max(0, Math.min(box.right, dock.right) - Math.max(box.left, dock.left)) *
        Math.max(0, Math.min(box.bottom, dock.bottom) - Math.max(box.top, dock.top)),
      width: innerWidth,
      height: innerHeight,
    };
  });
}
function expectStyle(sample: Awaited<ReturnType<typeof styleGeometry>>) {
  expect(sample.box.left).toBeGreaterThanOrEqual(11);
  expect(sample.box.right).toBeLessThanOrEqual(sample.width - 11);
  expect(sample.box.top).toBeGreaterThanOrEqual(69);
  expect(sample.box.bottom).toBeLessThanOrEqual(sample.height - 11);
  expect(sample.overlap).toBe(0);
  expect(sample.gap).toBeLessThanOrEqual(20);
}

test('C08-B50: estilo durante gestos sucesivos, bordes, chat, zoom, resize y contraejemplo separado', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await start(page);
  const samples: unknown[] = [];
  let drawingWidth = 0;
  for (const [index, width] of [1440, 704, 390, 300].entries()) {
    await page.setViewportSize({ width, height: 740 });
    if (index === 1) {
      await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
      await page.getByRole('button', { name: 'Anclar chat', exact: true }).click();
    }
    for (const mode of ['Dibujar', 'Formas']) {
      await page.getByRole('button', { name: 'Seleccionar · V', exact: true }).click();
      if (
        mode === 'Formas' &&
        !(await page.getByRole('button', { name: mode, exact: true }).isVisible())
      ) {
        await page.getByRole('button', { name: 'Más herramientas', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Rectángulo', exact: true }).click();
      } else {
        await page.getByRole('button', { name: mode, exact: true }).click();
        if (mode === 'Formas') {
          expectStyle(await styleGeometry(page, '.shape-menu'));
          for (const name of ['Rectángulo', 'Elipse', 'Triángulo', 'Estrella']) {
            const choice = page.getByRole('button', { name, exact: true });
            await expect(choice).toBeInViewport();
            expect(
              await choice.evaluate((element) => {
                const box = element.getBoundingClientRect();
                return element.contains(
                  document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
                );
              }),
            ).toBe(true);
          }
          await page.getByRole('button', { name: 'Rectángulo', exact: true }).click();
        }
      }
      if (mode === 'Dibujar') {
        if (!drawingWidth) drawingWidth = (await styleGeometry(page)).box.width;
        expect((await styleGeometry(page)).box.width).toBeCloseTo(drawingWidth, 1);
      }
      for (const destination of [
        { x: 14, y: 110 },
        { x: width - 14, y: 620 },
      ]) {
        const grip = (await page.locator('.dock-grip').boundingBox())!;
        await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
        await page.mouse.down();
        for (let step = 1; step <= 5; step++) {
          await page.mouse.move(
            grip.x + ((destination.x - grip.x) * step) / 5,
            grip.y + ((destination.y - grip.y) * step) / 5,
          );
          const sample = await styleGeometry(page);
          expectStyle(sample);
          samples.push({ mode, phase: 'drag', step, ...sample });
        }
        await page.mouse.up();
        expectStyle(await styleGeometry(page));
      }
      await expect
        .poll(() =>
          page
            .locator('.canvas-style')
            .evaluate(
              (element) =>
                element.getAnimations().filter((animation) => animation.playState === 'running')
                  .length,
            ),
        )
        .toBe(0);
      const before = await styleGeometry(page);
      for (const z of [0.1, 6]) {
        await page.mouse.move(width - 25, 400);
        for (let turn = 0; turn < 4; turn++) await page.mouse.wheel(0, z === 0.1 ? 900 : -900);
        await expect.poll(async () => (await snapshot(page)).camera.z).toBeCloseTo(z, 5);
        expectStyle(await styleGeometry(page));
        const afterZoom = (await styleGeometry(page)).box;
        for (const key of ['x', 'y', 'width', 'height'] as const)
          expect(afterZoom[key]).toBeCloseTo(before.box[key], 1);
      }
      await capture(page, info, `estilo-${width}-${mode === 'Formas' ? 'formas' : 'dibujo'}`);
    }
  }
  const panel = page.locator('.canvas-style'),
    original = await panel.getAttribute('style');
  await panel.evaluate((element) => {
    (element as HTMLElement).style.left = '5000px';
  });
  const invalid = await styleGeometry(page);
  expect(() => expectStyle(invalid), 'El comparador debe rechazar un panel desprendido').toThrow();
  await panel.evaluate((element, value) => element.setAttribute('style', value ?? ''), original);
  expectStyle(await styleGeometry(page));
  // Una cancelación no debe dejar capturado el dock ni impedir el siguiente gesto.
  const grip = (await page.locator('.dock-grip').boundingBox())!;
  await page.mouse.move(grip.x + 4, grip.y + 4);
  await page.mouse.down();
  await page.mouse.move(40, 360);
  await page.locator('.canvas-stage').dispatchEvent('pointercancel');
  await page.mouse.up();
  await page.setViewportSize({ width: 704, height: 668 });
  // El resize se representa al actualizar el frame, después de sus listeners.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expectStyle(await styleGeometry(page));
  await page.getByLabel('Relleno', { exact: true }).uncheck();
  expect((await snapshot(page)).ui.canvas.fill).toBe(false);
  await info.attach('geometria-durante-gestos', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
});

test('C08-B51: buscar sin alterar trabajo, enfocar fuera de pantalla, regresar, recargar y retirar el material', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await prepare(page);
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await page.getByRole('button', { name: 'Anclar chat', exact: true }).click();
  const draft = page.getByLabel('Escribí un mensaje…', { exact: true });
  await draft.fill('Este borrador sigue en su conversación');
  const original = await snapshot(page),
    content = await world(page);
  await trigger(page).click();
  await search(page).fill('');
  await search(page).pressSequentially('ncl-ningun-resultado');
  await search(page).press('Control+z');
  expect(await world(page)).toEqual(content);
  await search(page).fill('ncl-ningun-resultado');
  await expect(page.getByRole('status').filter({ hasText: 'Sin resultados' })).toBeVisible();
  expect((await snapshot(page)).ui.canvas.tool).toBe('select');
  await search(page).fill('decision guardado');
  const result = page.locator('#global-results button');
  await expect(result).toHaveCount(1);
  await expect(result).toContainText('Decisión: guardado local');
  await expect(result).toContainText('Nota · Canvas · Resource Scout');
  expect((await snapshot(page)).camera).toEqual(original.camera);
  expect((await snapshot(page)).ui.canvas.selections).toEqual(['origin']);
  await expect(draft).toHaveValue('Este borrador sigue en su conversación');
  await capture(page, info, 'buscar-material-existente');
  await search(page).press('ArrowDown');
  await page.keyboard.press('Enter');
  const node = page.locator('[data-node=far-note]');
  await expect(node).toBeFocused();
  await capture(page, info, 'material-localizado-con-chat');
  const box = (await node.boundingBox())!,
    chat = (await page.locator('.canvas-chat.docked').boundingBox())!;
  expect(box.x).toBeGreaterThan(chat.x + chat.width);
  expect(box.x + box.width).toBeLessThan(1440);
  expect(box.y).toBeGreaterThan(59);
  expect(box.y + box.height).toBeLessThan(800);
  expect((await snapshot(page)).ui.canvas.selection).toBe('far-note');
  expect(await world(page)).toEqual(content);
  await page.keyboard.press('c');
  await page
    .getByLabel('Nuevo comentario', { exact: true })
    .fill('Comentario privado antes de buscar');
  await trigger(page).click();
  await search(page).fill('Trabajo en curso');
  await page.locator('#global-results button[data-world=scout][data-id=origin]').click();
  await expect(page.getByLabel('Nuevo comentario', { exact: true })).toHaveCount(0);
  expect(Object.values((await snapshot(page)).ui.commentDrafts)).toContain(
    'Comentario privado antes de buscar',
  );
  expect((await world(page)).comments).toHaveLength(0);
  await page.keyboard.press('Escape');
  expect((await snapshot(page)).camera).toEqual(original.camera);
  expect((await snapshot(page)).ui.canvas.selection).toBe('origin');
  await trigger(page).click();
  await search(page).fill('Decisión: guardado local');
  await search(page).press('Enter');
  const located = await snapshot(page);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  expect((await snapshot(page)).camera).toEqual(located.camera);
  expect((await snapshot(page)).ui.canvas.selection).toBe('far-note');
  await expect(draft).toHaveValue('Este borrador sigue en su conversación');
  await node.click();
  await page.keyboard.press('Delete');
  expect((await world(page)).nodes.some((item) => item.id === 'far-note')).toBe(false);
  await trigger(page).click();
  await search(page).fill('Decisión: guardado local');
  await expect(page.locator('#global-results button')).toHaveCount(0);
  await search(page).press('Escape');
  await expect(trigger(page)).toBeFocused();
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await trigger(page).click();
  await search(page).fill('Decisión: guardado local');
  await expect(page.locator('#global-results button')).toHaveCount(1);
});

test('C08-B52: búsqueda con teclado, listas extensas, nombres largos, movimiento reducido y barra accesible', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await prepare(page);
  const input = await snapshot(page),
    project = input.state.worlds.find((item) => item.id === 'scout')!;
  for (let i = 0; i < 30; i++)
    project.nodes.push({
      ...project.nodes[1]!,
      id: `long-${i}`,
      data: {
        kind: 'note',
        title: `Criterio ${i}: ` + 'Nombre largo de una decisión del proyecto '.repeat(4),
        text: `Contenido ${i}`,
        color: '#e4efdf',
      },
    });
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  const measurements: unknown[] = [];
  await page.getByRole('button', { name: 'Estado', exact: true }).click();
  await expect(page.locator('.status-pop')).toBeVisible();
  for (const width of [1440, 801, 800, 799, 564, 390, 300]) {
    await page.setViewportSize({ width, height: width <= 390 ? 500 : 668 });
    await page.keyboard.press('Control+k');
    await expect(search(page)).toBeFocused();
    await expect(page.locator('.status-pop')).toHaveCount(0);
    await search(page).fill('Criterio');
    await expect(page.locator('#global-results button')).toHaveCount(30);
    await expect(page.locator('[data-action=search-clear]')).toHaveCount(0);
    for (const name of ['Superficies', 'Estado']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeInViewport();
      expect(
        await button.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
          );
        }),
      ).toBe(true);
    }
    await search(page).dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true });
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
    await search(page).press('ArrowUp');
    await expect(page.locator('#global-results button').last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.locator('#global-results button').first()).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.locator('#global-results button').last()).toBeFocused();
    await expect(page.locator('#global-results button').last()).toBeInViewport();
    await expect(page.locator('#global-results button').last()).toHaveAttribute(
      'title',
      ('Criterio 29: ' + 'Nombre largo de una decisión del proyecto '.repeat(4)).trim(),
    );
    measurements.push({
      width,
      search: await search(page).boundingBox(),
      results: await page.locator('#global-results').boundingBox(),
    });
    await capture(page, info, `busqueda-${width}`);
    await page.keyboard.press('Escape');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await trigger(page).click();
  await search(page).fill('Origen');
  expect(
    await search(page).evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s');
  await page.locator('#global-results button[data-world=scout][data-id=origin]').click();
  await expect(page.locator('[data-node=origin]')).toBeFocused();
  await page.keyboard.press('Escape');
  await openSurface(page, 'Docs');
  await trigger(page).click();
  await search(page).fill('decision guardado');
  await page.locator('#global-results button').click();
  expect((await snapshot(page)).state.route).toEqual({
    kind: 'surface',
    world: 'scout',
    surface: 'canvas',
    entity: null,
  });
  await expect(page.locator('[data-node=far-note]')).toBeFocused();
  await page.getByRole('button', { name: 'Everett', exact: true }).click();
  expect((await snapshot(page)).state.route).toEqual({ kind: 'universe' });
  await trigger(page).click();
  await search(page).fill('Decisión: guardado local');
  await expect(
    page.locator('#global-results button[data-world=scout][data-id=far-note]'),
  ).toBeVisible();
  await page.locator('#global-results button[data-world=scout][data-id=far-note]').click();
  await expect(page.locator('[data-node=far-note]')).toBeFocused();
  await info.attach('busqueda-adaptable', {
    body: JSON.stringify(measurements),
    contentType: 'application/json',
  });
});

test('C08-B53: referencias renombradas, destino de otro Mundo y materiales asignados conservan identidad y trabajo', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await prepare(page);
  const input = await snapshot(page),
    project = input.state.worlds.find((item) => item.id === 'scout')!;
  const doc = project.docs[0]!;
  doc.title = 'Contrato consultable';
  doc.body = 'Normas del guardado y de la recuperación del proyecto.';
  project.nodes.push({
    id: 'doc-search',
    x: 50,
    y: -100,
    width: 240,
    height: 160,
    owner: null,
    data: { kind: 'reference', ref: { kind: 'document', id: doc.id } },
  });
  project.zones = [
    {
      id: 'search-zone',
      name: 'Trabajo asignado',
      agent: 'eve',
      x: 3500,
      y: 1800,
      width: 360,
      height: 300,
    },
  ];
  const other = input.state.worlds.find((item) => item.id === 'everett')!;
  other.nodes.push({
    ...project.nodes[1]!,
    id: 'far-note',
    data: {
      kind: 'note',
      title: 'Decisión: guardado local',
      text: 'Contenido de otro Mundo',
      color: '#e4efdf',
    },
  });
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await page.locator('[data-node=doc-search]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Renombrar', exact: true }).click();
  await page.getByLabel('Nombre del material', { exact: true }).fill('Contrato actualizado');
  await page.getByLabel('Nombre del material', { exact: true }).press('Enter');
  expect((await world(page)).docs.find((item) => item.id === doc.id)?.body).toBe(doc.body);
  await trigger(page).click();
  await search(page).fill('Contrato consultable');
  await expect(page.locator('#global-results button')).toHaveCount(0);
  await search(page).fill('Contrato actualizado');
  await expect(page.locator('#global-results button')).toHaveCount(1);
  await page.locator('#global-results button').click();
  await expect(page.locator('[data-node=doc-search]')).toBeFocused();
  await page.keyboard.press('Enter');
  await trigger(page).click();
  await search(page).fill('Contrato actualizado');
  await page
    .getByLabel('Título del documento', { exact: true })
    .fill('Contrato actualizado en Docs');
  await page.getByLabel('Título del documento', { exact: true }).press('Tab');
  await expect(page.locator('#global-results button')).toHaveAttribute(
    'title',
    'Contrato actualizado en Docs',
  );
  await search(page).press('Escape');
  await page.keyboard.press('Escape');
  await trigger(page).click();
  await search(page).fill('Contrato actualizado en Docs');
  await expect(page.locator('#global-results button')).toHaveCount(1);
  await expect(page.locator('#global-results button')).toHaveAttribute(
    'title',
    'Contrato actualizado en Docs',
  );
  await page.locator('#global-results button').click();
  await page.keyboard.press('Escape');
  await assignMaterial(page, 'origin', 'Reorganizar');
  await expect.poll(async () => (await world(page)).assignments[0]?.phase).toBe('ready');
  const job = structuredClone((await world(page)).assignments[0]!);
  await trigger(page).click();
  await search(page).fill('Origen');
  await expect(page.locator('#global-results button[data-world=scout]')).toContainText('En zona');
  await page.locator('#global-results button[data-world=scout]').click();
  await expect(page.locator('[data-zone=search-zone]')).toBeFocused();
  expect((await world(page)).nodes.find((item) => item.id === 'origin')?.owner).toBe('eve');
  expect((await world(page)).assignments[0]).toEqual(job);
  await capture(page, info, 'localizar-material-asignado');
  await page.getByRole('button', { name: 'Revisar propuesta', exact: true }).click();
  await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
  await page
    .getByLabel('Cambios solicitados', { exact: true })
    .fill('Conservar la evidencia del material');
  await trigger(page).click();
  await search(page).fill('Contrato actualizado en Docs');
  await page.locator('#global-results button[data-world=scout]').click();
  await expect(page.getByLabel('Cambios solicitados', { exact: true })).toHaveCount(0);
  expect((await snapshot(page)).ui.revisionDrafts[job.id]).toBe(
    'Conservar la evidencia del material',
  );
  expect((await world(page)).assignments[0]).toEqual(job);
  await page.keyboard.press('Escape');
  await trigger(page).click();
  await search(page).fill('Decisión: guardado local');
  await expect(page.locator('#global-results button')).toHaveCount(2);
  await page.locator('#global-results button[data-world=everett][data-id=far-note]').click();
  expect((await snapshot(page)).state.route).toEqual({
    kind: 'surface',
    world: 'everett',
    surface: 'canvas',
    entity: null,
  });
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await expect(page.locator('[data-node=far-note]')).toContainText('Contenido de otro Mundo');
  await page.keyboard.press('Escape');
  await trigger(page).click();
  await search(page).fill('Contrato actualizado');
  await page.locator('#global-results button[data-world=scout]').click();
  expect((await world(page)).assignments[0]).toEqual(job);
  // Entrada adversa de recuperación: un trabajo conservado cuyo agente ya no tiene zona.
  const orphan = await snapshot(page);
  const orphanWorld = orphan.state.worlds.find((item) => item.id === 'scout')!;
  orphanWorld.zones = [];
  const originalAgent = orphanWorld.agents.find((agent) => agent.id === job.agent)!;
  const orphanAgent = { ...originalAgent, id: 'orphan-agent', templateId: originalAgent.id };
  orphanWorld.agents.push(orphanAgent);
  orphanWorld.assignments[0]!.agent = orphanAgent.id;
  orphanWorld.nodes.find((node) => node.id === job.node)!.owner = orphanAgent.id;
  const orphanJob = structuredClone(orphanWorld.assignments[0]!);
  await storedFixture(page, orphan.state, orphan.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await trigger(page).click();
  await search(page).fill('Origen');
  const orphanResult = page.locator('#global-results button[data-world=scout]');
  await expect(orphanResult).toContainText('En trabajo');
  await orphanResult.click();
  await expect(page.locator('#notification')).toContainText('agente sin zona');
  await expect(page.locator('#notification')).toContainText('Creá una zona');
  expect((await world(page)).assignments[0]).toEqual(orphanJob);
  await page.getByRole('button', { name: 'Dibujar zona', exact: true }).click();
  await page.mouse.move(80, 150);
  await page.mouse.down();
  await page.mouse.move(350, 390, { steps: 10 });
  await page.mouse.up();
  await page.getByLabel('Agente de la zona', { exact: true }).selectOption({
    label: `${orphanAgent.name} · Trabajo sin zona`,
  });
  expect((await world(page)).zones[0]?.agent).toBe(orphanAgent.id);
  const relocatedJob = (await world(page)).assignments[0]!;
  // El preview se reubica junto a la zona nueva; identidad, contexto y resultado se conservan.
  expect({ ...relocatedJob, position: orphanJob.position }).toEqual(orphanJob);
  expect(relocatedJob.position).not.toEqual(orphanJob.position);
  await expect(page.getByRole('button', { name: 'Revisar propuesta', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Devolver Origen al Canvas', exact: true }).click();
  const recovered = await world(page);
  expect(recovered.assignments).toHaveLength(0);
  expect(recovered.nodes.find((node) => node.id === job.node)?.owner).toBeNull();
  expect(recovered.nodes.find((node) => node.id === job.node)?.data).toEqual(
    orphanWorld.nodes.find((node) => node.id === job.node)!.data,
  );
});

test('C08-B54: apertura y reversión continuas, campo conservado y contraejemplo de resultado sin tinta', async ({
  page,
}, info) => {
  await prepare(page);
  const samples: unknown[] = [];
  for (let cycle = 0; cycle < 3; cycle++) {
    await trigger(page).click();
    const frames = await page.locator('.global-search').evaluate(async (element) => {
      const result = [];
      for (let i = 0; i < 20; i++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const box = element.getBoundingClientRect();
        result.push({ width: box.width, left: box.left, right: box.right });
      }
      return result;
    });
    expect(frames.some((frame) => frame.width > 40 && frame.width < 240)).toBe(true);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i]!.width).toBeGreaterThanOrEqual(frames[i - 1]!.width - 1);
      expect(Math.abs(frames[i]!.right - frames[0]!.right)).toBeLessThan(2);
    }
    samples.push(frames);
    await trigger(page).click();
    await trigger(page).click();
    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(search(page)).toHaveAttribute('inert', '');
    await expect
      .poll(async () => (await page.locator('.global-search').boundingBox())!.width)
      .toBeCloseTo(33, 0);
  }
  await trigger(page).click();
  await search(page).fill('Decisión: guardado local');
  const field = (await search(page).elementHandle())!;
  await page.getByLabel('Nombre del mundo', { exact: true }).fill('Resource Scout audit');
  await page.getByLabel('Nombre del mundo', { exact: true }).press('Tab');
  expect(await field.evaluate((element) => element.isConnected)).toBe(true);
  await expect(search(page)).toHaveValue('Decisión: guardado local');
  await capture(page, info, 'busqueda-con-campo-conservado');
  const text = page.locator('#global-results button strong');
  const box = (await text.boundingBox())!;
  const clip = {
    x: Math.ceil(box.x),
    y: Math.ceil(box.y),
    width: Math.floor(box.width) - 1,
    height: Math.floor(box.height) - 1,
  };
  const before = await page.screenshot({ clip });
  await text.evaluate((element) => {
    element.style.opacity = '0';
  });
  const hidden = await page.screenshot({ clip });
  const a = png.sync.read(before).data,
    b = png.sync.read(hidden).data;
  let changed = 0;
  for (let i = 0; i < a.length; i += 4)
    if (
      Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) >
      45
    )
      changed++;
  expect(changed, 'Debe haber tinta realmente pintada del resultado').toBeGreaterThan(50);
  await text.evaluate((element) => {
    element.style.opacity = '';
  });
  expect(png.sync.read(await page.screenshot({ clip })).data).toEqual(a);
  await info.attach('resultado-con-tinta', { body: before, contentType: 'image/png' });
  await info.attach('contraejemplo-sin-tinta', { body: hidden, contentType: 'image/png' });
  await info.attach('fotogramas-de-busqueda', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
  // Escape retira el campo enfocado; su change puede pedir otro render síncrono.
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.getByLabel('Nombre de perfil', { exact: true }).fill('Perfil de prueba');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Perfil de Perfil de prueba', exact: true }),
  ).toBeFocused();
  expect(await field.evaluate((element) => element.isConnected)).toBe(true);
  expect((await snapshot(page)).state.profile.name).toBe('Perfil de prueba');
});
