import type { Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { dockChat, undockChat } from './interaction-helpers';

const ready = async (page: Page) =>
  expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
async function zoom(page: Page, percent: number): Promise<void> {
  await page.getByRole('button', { name: /^Zoom de Canvas:/ }).click();
  const input = page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true });
  await input.fill(String(percent));
  await input.press('Enter');
  await expect.poll(async () => (await snapshot(page)).camera.z).toBeCloseTo(percent / 100, 4);
}

test('C08-B67: marco parcial en cuatro sentidos selecciona materiales, crea conjunto y conserva cámara y cancelación', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.canvasGroups = [];
  w.nodes = [0, 1, 2].map((i) => ({
    id: 'partial-' + i,
    x: -340 + i * 240,
    y: -90,
    width: 180,
    height: 180,
    owner: null,
    data: {
      kind: 'note' as const,
      title: 'Material ' + i,
      text: 'Contenido conservado ' + i,
      color: '#e4efdf',
    },
  }));
  w.nodes[1]!.data = {
    kind: 'shape',
    title: 'Forma parcial',
    shape: 'rectangle',
    color: '#e4efdf',
    thickness: 2,
    fill: true,
  };
  w.nodes[2]!.data = {
    kind: 'drawing',
    title: 'Dibujo parcial',
    color: '#ffffff',
    thickness: 2,
    points: [
      { x: 0, y: 0 },
      { x: 180, y: 180 },
    ],
  };
  w.zones = [
    {
      id: 'fixed-zone',
      agent: w.agents[0]!.id,
      name: 'Destino fijo',
      x: -120,
      y: -110,
      width: 200,
      height: 220,
    },
  ];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  const ids = w.nodes.map((n) => n.id),
    samples = [];
  for (const percent of [10, 40, 100, 200]) {
    await zoom(page, percent);
    const camera = (await snapshot(page)).camera;
    const boxes = await page.locator('.material[data-node]').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
    for (const ratio of [0.05, 0.5, 0.95])
      for (const reverseX of [false, true])
        for (const lower of [false, true]) {
          const left = boxes[0]!.x - 12,
            right = boxes[2]!.x + boxes[2]!.width + 12;
          const top = boxes[0]!.y,
            height = boxes[0]!.height;
          // Se comienza fuera de los materiales; la zona fija queda debajo del marco.
          // Las identificaciones son controles externos: empezar por encima de ellas,
          // no sobre el nombre/tipo que permite seleccionar y mover el material.
          const a = { x: reverseX ? right : left, y: lower ? top + height + 12 : top - 40 };
          const b = {
            x: reverseX ? left : right,
            y: lower ? top + height * (1 - ratio) : top + height * ratio,
          };
          await page.mouse.move(a.x, a.y);
          const hit = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return {
              tag: el?.tagName,
              cls: el?.getAttribute('class'),
              node: el?.closest<HTMLElement>('[data-node]')?.dataset.node,
              resize: el?.getAttribute('data-resize'),
              html: el?.outerHTML.slice(0, 220),
            };
          }, a);
          expect(
            hit.node,
            'El gesto debe comenzar en el fondo, fuera de las identificaciones',
          ).toBeUndefined();
          await page.mouse.down();
          await page.mouse.move(b.x, b.y, { steps: 5 });
          await page.mouse.up();
          const selected = (await snapshot(page)).ui.canvas.selections;
          expect(
            selected.sort(),
            JSON.stringify({ percent, ratio, reverseX, lower, a, b, hit }),
          ).toEqual([...ids].sort());
          expect((await snapshot(page)).camera).toEqual(camera);
          expect((await world(page)).nodes).toEqual(w.nodes);
          expect((await snapshot(page)).ui.canvas.zoneSelection).toBeNull();
          samples.push({ percent, ratio, reverseX, lower, selected });
        }
  }
  await zoom(page, 100);
  await page.locator('[data-node=partial-0]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Crear conjunto', exact: true }).click();
  expect((await world(page)).canvasGroups![0]!.nodes.sort()).toEqual([...ids].sort());
  const first = (await page.locator('[data-node=partial-0]').boundingBox())!,
    second = (await page.locator('[data-node=partial-1]').boundingBox())!;
  for (const [i, box] of [first, second].entries()) {
    if (i) await page.keyboard.down('Shift');
    await page.mouse.move(box.x - 30, box.y + box.height + 35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    if (i) await page.keyboard.up('Shift');
    expect((await snapshot(page)).ui.canvas.selections.sort()).toEqual(ids.slice(0, i + 1).sort());
  }
  const before = (await snapshot(page)).ui.canvas.selections;
  await page.mouse.move(200, 160);
  await page.mouse.down();
  await page.mouse.move(500, 250, { steps: 5 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await snapshot(page)).ui.canvas.selections).toEqual(before);
  expect((await world(page)).nodes).toEqual(w.nodes);
  await info.attach('marcos-parciales', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
  await capture(page, info, 'conjunto-desde-interseccion');
});

const png = createRequire(import.meta.url)(
  resolve('node_modules/playwright-core/lib/utilsBundle.js'),
).PNG as {
  sync: { read(buffer: Buffer): { data: Buffer; width: number; height: number } };
};
test('C08-B68: bordes de formas continuos al alejar, sin cambiar el grosor guardado', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.canvasGroups = [];
  const results = [];
  for (const shape of ['rectangle', 'ellipse', 'triangle', 'star'] as const) {
    w.nodes = [
      {
        id: 'outline',
        x: -80.3,
        y: -50.7,
        width: 160,
        height: 100,
        owner: null,
        data: {
          kind: 'shape',
          title: shape,
          shape,
          color: '#00ff0080',
          stroke: '#ffffff',
          thickness: 1,
          fill: shape === 'ellipse' || shape === 'star',
        },
      },
    ];
    input.state.camera = { x: 0, y: 0, z: 1 };
    await storedFixture(page, input.state, input.ui);
    await page.reload();
    await ready(page);
    const art = page.locator('[data-node=outline] .shape-art');
    for (const percent of [1, 5, 10, 40, 100, 200, 600]) {
      await zoom(page, percent);
      const points = await art.locator(':scope > *').evaluate((el) => {
        const geometry = el as SVGGeometryElement,
          matrix = geometry.getScreenCTM()!;
        return Array.from({ length: 48 }, (_, i) => {
          const p = geometry
            .getPointAtLength((geometry.getTotalLength() * (i + 0.5)) / 48)
            .matrixTransform(matrix);
          return { x: p.x, y: p.y };
        });
      });
      const painted = png.sync.read(await page.screenshot());
      await art
        .locator(':scope > *')
        .evaluate((el) => ((el as SVGElement).style.stroke = 'transparent'));
      const empty = png.sync.read(await page.screenshot());
      await art
        .locator(':scope > *')
        .evaluate((el) => (el as SVGElement).style.removeProperty('stroke'));
      const covered = points.map((p) => {
        let maximum = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const x = Math.floor(p.x) + dx,
              y = Math.floor(p.y) + dy;
            if (x < 0 || y < 0 || x >= painted.width || y >= painted.height) continue;
            const at = (y * painted.width + x) * 4;
            maximum = Math.max(
              maximum,
              ...[0, 1, 2].map((c) => Math.abs(painted.data[at + c]! - empty.data[at + c]!)),
            );
          }
        return maximum >= 60;
      });
      const coverage = covered.filter(Boolean).length / covered.length;
      results.push({ shape, percent, coverage });
      expect(coverage, JSON.stringify(results.at(-1))).toBeGreaterThanOrEqual(0.9);
      expect((await world(page)).nodes[0]!.data).toEqual(w.nodes[0]!.data);
      if (percent === 10) {
        // Un trazo subpíxel deliberado debe ser distinguible del borde restaurado.
        await art
          .locator(':scope > *')
          .evaluate((el) => ((el as SVGElement).style.strokeWidth = '0.05px'));
        const thin = png.sync.read(await page.screenshot());
        const strong = new Set<number>();
        for (const p of points)
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const at = ((Math.floor(p.y) + dy) * thin.width + Math.floor(p.x) + dx) * 4;
              if ([0, 1, 2].some((c) => Math.abs(thin.data[at + c]! - empty.data[at + c]!) >= 60))
                strong.add(at);
            }
        await art
          .locator(':scope > *')
          .evaluate((el) => (el as SVGElement).style.removeProperty('stroke-width'));
        expect(strong.size, 'El contraejemplo debe perder la tinta visible del borde').toBeLessThan(
          4,
        );
        await capture(page, info, 'borde-' + shape + '-10');
      }
    }
  }
  await info.attach('bordes-pintados', {
    body: JSON.stringify(results),
    contentType: 'application/json',
  });
});

test('C08-B69: desacoplar recupera Quick Chat compacto, hilo y borrador por arrastre y teclado', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  const chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
  const composer = page.getByRole('textbox', { name: 'Escribí un mensaje…', exact: true });
  await composer.fill('Borrador compartido entre presentaciones');
  const initial = (await chat.boundingBox())!;
  const thread = (await snapshot(page)).ui.conversations;
  const samples = [];
  for (const width of [1440, 801, 390, 300]) {
    await page.setViewportSize({ width, height: 900 });
    await dockChat(page);
    expect((await chat.boundingBox())!.height).toBeGreaterThan(700);
    const grip = (await chat.locator('.chat-grip').boundingBox())!;
    await page.mouse.move(grip.x + 7, grip.y + 10);
    await page.mouse.down();
    expect((await snapshot(page)).ui.chat.chatMode).toBe('docked');
    expect((await chat.boundingBox())!.height).toBeGreaterThan(700);
    await page.mouse.up();
    if (width > 640) await undockChat(page);
    else {
      const origin = (await chat.locator('.chat-grip').boundingBox())!;
      await page.mouse.move(origin.x + 7, origin.y + 10);
      await page.mouse.down();
      await page.mouse.move(width - 25, origin.y + 85, { steps: 12 });
      await page.mouse.up();
      await expect(chat).toHaveClass(/quick/);
    }
    const quick = (await chat.boundingBox())!;
    expect(quick.height).toBeCloseTo(initial.height, 0);
    expect(quick.width).toBeLessThanOrEqual(310);
    await expect(composer).toHaveValue('Borrador compartido entre presentaciones');
    expect((await snapshot(page)).ui.conversations).toEqual(thread);
    await chat.getByRole('button', { name: 'Cerrar chat', exact: true }).click();
    await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
    expect((await chat.boundingBox())!.height).toBeCloseTo(initial.height, 0);
    await dockChat(page);
    await chat.locator('.chat-grip').press('ArrowRight');
    await expect(chat).toHaveClass(/quick/);
    expect((await chat.boundingBox())!.height).toBeCloseTo(initial.height, 0);
    samples.push({ width, quick });
  }
  await page.reload();
  await ready(page);
  await expect(chat).toHaveClass(/quick/);
  expect((await chat.boundingBox())!.height).toBeCloseTo(initial.height, 0);
  await expect(composer).toHaveValue('Borrador compartido entre presentaciones');
  // Recuperar el contexto defectuoso guardado por 0.8.10 no debe perpetuar el panel grande.
  const legacy = await snapshot(page);
  legacy.ui.chat.chatSize = { width: 310, height: 841 };
  legacy.ui.chat.chatMode = 'quick';
  delete legacy.ui.chatContexts.scout;
  await storedFixture(page, legacy.state, legacy.ui);
  await page.reload();
  await ready(page);
  expect((await chat.boundingBox())!.height).toBeCloseTo(initial.height, 0);
  await info.attach('ciclo-presentaciones-chat', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
  await capture(page, info, 'quick-chat-recuperado');
});

test('C08-B70: Configuración conserva posición, ancho y pestañas entre sus secciones', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  const samples = [];
  for (const width of [1440, 801, 390, 300]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
    await page.getByRole('button', { name: 'Configuración', exact: true }).click();
    const panel = page.locator('.profile-pop');
    await expect
      .poll(() =>
        panel.evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length),
      )
      .toBe(0);
    const measure = () =>
      panel.evaluate((el) => {
        const p = el.getBoundingClientRect(),
          t = el.querySelector('[data-tab=settings]')!.getBoundingClientRect();
        return { x: p.x, width: p.width, tab: t.x };
      });
    const origin = await measure();
    for (const section of ['Preferencias', 'Herramientas', 'Atajos']) {
      await panel.getByRole('button', { name: section, exact: true }).click();
      const frames = await panel.evaluate(
        (el) =>
          new Promise<{ x: number; width: number; tab: number }[]>((resolve) => {
            const frames: { x: number; width: number; tab: number }[] = [];
            const tick = () => {
              const p = el.getBoundingClientRect(),
                t = el.querySelector('[data-tab=settings]')!.getBoundingClientRect();
              frames.push({ x: p.x, width: p.width, tab: t.x });
              if (frames.length < 8) requestAnimationFrame(tick);
              else resolve(frames);
            };
            tick();
          }),
      );
      for (const frame of frames) {
        expect(frame.x).toBeCloseTo(origin.x, 1);
        expect(frame.width).toBeCloseTo(origin.width, 1);
        expect(frame.tab).toBeCloseTo(origin.tab, 1);
      }
      const current = await measure();
      expect(current.x).toBeCloseTo(origin.x, 1);
      expect(current.width).toBeCloseTo(origin.width, 1);
      expect(current.tab, JSON.stringify({ width, section, origin, current })).toBeCloseTo(
        origin.tab,
        1,
      );
      samples.push({ width, section, origin, current, frames });
      await panel.getByRole('button', { name: 'Volver a Configuración', exact: true }).click();
    }
    await panel.locator('.profile-tabs').evaluate((el) => ((el as HTMLElement).style.gap = '30px'));
    expect(Math.abs((await measure()).tab - origin.tab)).toBeGreaterThan(1);
    await panel
      .locator('.profile-tabs')
      .evaluate((el) => (el as HTMLElement).style.removeProperty('gap'));
    expect((await measure()).tab).toBeCloseTo(origin.tab, 1);
    await capture(page, info, 'configuracion-estable-' + width);
    await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
    await expect(page.locator('.profile-pop:not(.panel-exit)')).toHaveCount(0);
  }
  await info.attach('posicion-configuracion', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
});
