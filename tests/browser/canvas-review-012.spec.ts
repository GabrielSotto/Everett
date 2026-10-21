import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, snapshot, world, capture, reference, moveMaterial } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';

async function ready(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
}

test('C08-B71: clic selecciona cable, doble clic edita sin menú ni botones y el teclado conserva identidad', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [-280, 160].map((x, i) => ({
    id: 'end-' + i,
    x,
    y: -80,
    width: 180,
    height: 140,
    owner: null,
    data: { kind: 'note' as const, title: 'Extremo ' + i, text: '', color: '#f3eccf' },
  }));
  w.links = [{ id: 'cable', from: 'end-0', to: 'end-1', fromAnchor: 'east', toAnchor: 'west' }];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  const hit = page.locator('[data-link=cable] .link-hit');
  const point = await hit.evaluate((el) => {
    const p = el as SVGPathElement;
    const q = p.getPointAtLength(p.getTotalLength() / 2).matrixTransform(p.getScreenCTM()!);
    return { x: q.x, y: q.y };
  });
  await page.mouse.click(point.x, point.y);
  await expect(
    page.getByRole('textbox', { name: 'Etiqueta de conexión', exact: true }),
  ).toHaveCount(0);
  expect((await snapshot(page)).ui.canvas.linkSelection).toBe('cable');
  await expect(hit).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await expect(page.getByRole('menu', { name: 'Acciones de la conexión' })).toHaveCount(0);
  await page.mouse.dblclick(point.x, point.y);
  const editor = page.getByRole('textbox', { name: 'Etiqueta de conexión', exact: true });
  await expect(editor).toBeFocused();
  await expect(page.locator('.cable-inline-edit button')).toHaveCount(0);
  await editor.fill('Relaciona');
  await editor.press('Enter');
  await expect(hit).toBeFocused();
  expect((await world(page)).links[0]).toMatchObject({ id: 'cable', label: 'Relaciona' });
  await page.locator('[data-link=cable] .cable-label').dblclick();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue('Relaciona');
  await editor.fill('Cancelada');
  await editor.press('Escape');
  await expect(hit).toBeFocused();
  expect((await world(page)).links[0]!.label).toBe('Relaciona');
  await hit.press('Enter');
  await editor.fill('');
  await editor.press('Backspace');
  expect((await world(page)).links).toHaveLength(1);
  await editor.press('Enter');
  expect((await world(page)).links[0]!.label ?? '').toBe('');
  await hit.focus();
  await hit.press('Backspace');
  expect((await world(page)).links).toHaveLength(0);
  await page.keyboard.press('Control+z');
  expect((await world(page)).links[0]!.id).toBe('cable');
  await hit.focus();
  await hit.press('Delete');
  expect((await world(page)).links).toHaveLength(0);
  await page.keyboard.press('Control+z');
  await capture(page, info, 'cable-seleccionado-sin-editor');
});

test('C08-B72: selección de formas conserva marco y tiradores fuera de todo el trazo al alejar', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await start(page);
  const base = await snapshot(page),
    w = base.state.worlds.find((w) => w.id === 'scout')!,
    samples = [];
  const png = createRequire(import.meta.url)(
    resolve('node_modules/playwright-core/lib/utilsBundle.js'),
  ).PNG as { sync: { read(bytes: Buffer): { width: number; height: number; data: Buffer } } };
  for (const shape of ['rectangle', 'ellipse', 'triangle', 'star'] as const)
    for (const thickness of [1, 8]) {
      w.nodes = [
        {
          id: 'shape',
          x: -75,
          y: -50,
          width: 150,
          height: 100,
          owner: null,
          data: {
            kind: 'shape',
            title: 'Forma',
            shape,
            color: '#ffffff80',
            stroke: '#00ff00',
            thickness,
            fill: thickness === 8,
          },
        },
      ];
      base.state.camera = { x: 0, y: 0, z: 1 };
      base.ui.canvas.selection = 'shape';
      base.ui.canvas.selections = ['shape'];
      await storedFixture(page, base.state, base.ui);
      await page.reload();
      await ready(page);
      for (const percent of [1, 10, 32, 40, 100, 200, 600]) {
        await page.getByRole('button', { name: /^Zoom de Canvas:/ }).click();
        const zoom = page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true });
        await zoom.fill(String(percent));
        await zoom.press('Enter');
        await expect
          .poll(() =>
            page
              .locator('#canvas-plane')
              .evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--canvas-zoom'))),
          )
          .toBeCloseTo(percent / 100, 5);
        const metrics = await page.locator('[data-node=shape]').evaluate((el) => {
          const frame = el.querySelector('.material-selection-frame')!,
            r = frame.getBoundingClientRect(),
            geometry = el.querySelector('.shape-art > *') as SVGGeometryElement,
            matrix = geometry.getScreenCTM()!,
            z = Number(getComputedStyle(el).getPropertyValue('--canvas-zoom')),
            stroke = parseFloat(getComputedStyle(geometry).strokeWidth) * z;
          const points = Array.from({ length: 100 }, (_, i) =>
            geometry
              .getPointAtLength((geometry.getTotalLength() * i) / 100)
              .matrixTransform(matrix),
          );
          return {
            frame: {
              left: r.left,
              top: r.top,
              right: r.right,
              bottom: r.bottom,
              width: r.width,
              height: r.height,
            },
            outline: parseFloat(getComputedStyle(frame.querySelector('rect')!).strokeWidth) * z,
            parentOutline: getComputedStyle(el).outlineStyle,
            stroke,
            points: points.map((p) => ({ x: p.x, y: p.y })),
            handles: Array.from(el.querySelectorAll('.resize-handle'), (h) => {
              const b = h.getBoundingClientRect();
              return {
                x: b.x + b.width / 2,
                y: b.y + b.height / 2,
                width: b.width,
                height: b.height,
              };
            }),
          };
        });
        expect(metrics.parentOutline).toBe('none');
        expect(metrics.outline).toBeCloseTo(1, 5);
        for (const p of metrics.points) {
          expect(p.x - metrics.stroke / 2).toBeGreaterThanOrEqual(metrics.frame.left - 0.1);
          expect(p.x + metrics.stroke / 2).toBeLessThanOrEqual(metrics.frame.right + 0.1);
          expect(p.y - metrics.stroke / 2).toBeGreaterThanOrEqual(metrics.frame.top - 0.1);
          expect(p.y + metrics.stroke / 2).toBeLessThanOrEqual(metrics.frame.bottom + 0.1);
        }
        expect(metrics.handles).toHaveLength(4);
        for (const h of metrics.handles) {
          expect(h.width).toBeCloseTo(7, 0);
          expect(h.height).toBeCloseTo(7, 0);
          expect(
            Math.min(Math.abs(h.x - metrics.frame.left), Math.abs(h.x - metrics.frame.right)),
          ).toBeLessThan(0.2);
          expect(
            Math.min(Math.abs(h.y - metrics.frame.top), Math.abs(h.y - metrics.frame.bottom)),
          ).toBeLessThan(0.2);
        }
        let paintedEdges: number | null = null;
        if (percent >= 10) {
          const frame = page.locator('[data-node=shape] .material-selection-frame rect'),
            paintedBytes = await page.screenshot(),
            painted = png.sync.read(paintedBytes);
          await frame.evaluate((el) => ((el as SVGElement).style.stroke = 'transparent'));
          const emptyBytes = await page.screenshot(),
            empty = png.sync.read(emptyBytes);
          await frame.evaluate((el) => (el as SVGElement).style.removeProperty('stroke'));
          const f = metrics.frame,
            fractions = [0.25, 0.5, 0.75],
            // El dock puede cubrir el centro de un lado al 600 %. Exigir tinta
            // en cada lado, con alternativas visibles y el redondeo del raster.
            edges = [
              fractions.map((t) => ({ x: f.left, y: f.top + f.height * t })),
              fractions.map((t) => ({ x: f.right, y: f.top + f.height * t })),
              fractions.map((t) => ({ x: f.left + f.width * t, y: f.top })),
              fractions.map((t) => ({ x: f.left + f.width * t, y: f.bottom })),
            ],
            radius = Math.max(1, Math.ceil(percent / 200));
          paintedEdges = edges.filter((points) =>
            points.some((p) => {
              let delta = 0;
              for (let dy = -radius; dy <= radius; dy++)
                for (let dx = -radius; dx <= radius; dx++) {
                  const x = Math.floor(p.x) + dx,
                    y = Math.floor(p.y) + dy;
                  if (x < 0 || y < 0 || x >= painted.width || y >= painted.height) continue;
                  const i = (y * painted.width + x) * 4;
                  for (let c = 0; c < 3; c++)
                    delta = Math.max(delta, Math.abs(painted.data[i + c]! - empty.data[i + c]!));
                }
              return delta >= 40;
            }),
          ).length;
          if (paintedEdges !== 4) {
            await info.attach('frame-painted', { body: paintedBytes, contentType: 'image/png' });
            await info.attach('frame-empty', { body: emptyBytes, contentType: 'image/png' });
          }
          expect(paintedEdges, JSON.stringify({ shape, thickness, percent, metrics })).toBe(4);
        }
        expect((await world(page)).nodes[0]!.data).toEqual(w.nodes[0]!.data);
        samples.push({
          shape,
          thickness,
          percent,
          frame: metrics.frame,
          handles: metrics.handles,
          paintedEdges,
        });
        if (shape === 'star' && thickness === 8 && percent === 32) {
          const handle = page.locator('[data-node=shape] .resize-handle.se'),
            corner = (await handle.boundingBox())!;
          await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2);
          await page.mouse.down();
          const pressed = (await handle.boundingBox())!;
          expect(pressed.width).toBeCloseTo(7, 0);
          expect(pressed.height).toBeCloseTo(7, 0);
          await page.mouse.up();
          await capture(page, info, 'estrella-seleccionada-32');
        }
      }
    }
  await info.attach('marcos-y-tiradores', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
});

test('C08-B73: Quick Chat no compacta ni gira el dock sin colisión y Más herramientas conserva chat y borrador', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await start(page);
  const dock = page.getByRole('toolbar', { name: 'Herramientas de Canvas' }),
    before = (await dock.boundingBox())!;
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  const chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
  const composer = page.getByRole('textbox', { name: 'Escribí un mensaje…', exact: true });
  await composer.fill('Borrador mientras uso herramientas');
  await expect(dock).not.toHaveClass(/vertical-tools/);
  expect((await dock.boundingBox())!.width).toBeCloseTo(before.width, 0);
  const collisions = [];
  for (let i = 0; i < 4; i++) {
    const grip = (await chat.locator('.chat-grip').boundingBox())!,
      target = (await dock.boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
    await page.mouse.up();
    const d = (await dock.boundingBox())!,
      c = (await chat.boundingBox())!;
    expect(d.width).toBeCloseTo(before.width, 0);
    await expect(dock).not.toHaveClass(/vertical-tools/);
    expect(
      d.x >= c.x + c.width ||
        d.x + d.width <= c.x ||
        d.y >= c.y + c.height ||
        d.y + d.height <= c.y,
    ).toBe(true);
    await expect(composer).toHaveValue('Borrador mientras uso herramientas');
    collisions.push({ dock: d, chat: c });
  }
  await info.attach('colisiones-repetidas', {
    body: JSON.stringify(collisions),
    contentType: 'application/json',
  });
  await page.setViewportSize({ width: 300, height: 900 });
  await page.getByRole('button', { name: 'Más herramientas', exact: true }).click();
  await expect(chat).toBeVisible();
  await expect(composer).toHaveValue('Borrador mientras uso herramientas');
  await expect(
    page.getByRole('menu', { name: 'Más herramientas de Canvas', exact: true }),
  ).toBeVisible();
  await capture(page, info, 'mas-herramientas-con-chat');
});

test('C08-B74: ordenar PDF y código superpuestos cambia la capa visible, conserva contenido, Undo/Redo y recarga', async ({
  page,
}, info) => {
  await start(page);
  const source = (await world(page)).files[0]!;
  const code = await reference(page, 'file', source.id, 600, 350);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.getByRole('button', { name: 'Cargar ejemplos multimedia', exact: true }).click();
  const pdf = page.locator('.material.pdf');
  await expect(pdf).toHaveCount(1);
  await expect
    .poll(() => pdf.locator('img').evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: /^Zoom de Canvas:/ }).click();
  await page.getByRole('button', { name: 'Ajustar al contenido', exact: true }).click();
  await expect
    .poll(() =>
      page.locator(`[data-node="${code}"]`).evaluate(
        (el) =>
          new Promise<number>((resolve) => {
            const a = el.getBoundingClientRect();
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const b = el.getBoundingClientRect();
                resolve(Math.hypot(a.x - b.x, a.y - b.y, a.width - b.width, a.height - b.height));
              }),
            );
          }),
      ),
    )
    .toBeLessThan(0.01);
  const id = (await pdf.getAttribute('data-node'))!,
    box = (await page.locator(`[data-node="${code}"]`).boundingBox())!;
  await moveMaterial(
    page,
    id,
    box.x + box.width / 2,
    box.y + box.height / 2 + (await pdf.boundingBox())!.height / 4,
  );
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const top = () =>
    page.evaluate(
      (p) => document.elementFromPoint(p.x, p.y)?.closest<HTMLElement>('[data-node]')?.dataset.node,
      point,
    );
  const original = (await world(page)).nodes,
    sorted = (nodes: typeof original) => [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  await expect.poll(top).toBe(id);
  const order = async (name: string) => {
    const b = (await pdf.boundingBox())!;
    await page.mouse.click(b.x + 20, b.y + b.height - 20, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Acciones del material', exact: true })).toHaveCSS(
      'opacity',
      '1',
    );
    await page.getByRole('menuitem', { name, exact: true }).click();
  };
  await order('Enviar al fondo');
  await expect.poll(top).toBe(code);
  await order('Avanzar una capa');
  await expect.poll(top).toBe(id);
  await order('Retroceder una capa');
  await expect.poll(top).toBe(code);
  await order('Traer al frente');
  await expect.poll(top).toBe(id);
  await page.keyboard.press('Control+z');
  await expect.poll(top).toBe(code);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(top).toBe(id);
  expect(sorted((await world(page)).nodes)).toEqual(sorted(original));
  const ids = (await world(page)).nodes.map((n) => n.id);
  await page.reload();
  await ready(page);
  expect((await world(page)).nodes.map((n) => n.id)).toEqual(ids);
  await expect.poll(top).toBe(id);
  await capture(page, info, 'pdf-delante-del-codigo');
  const image = page.locator('.material.image'),
    imageId = (await image.getAttribute('data-node'))!,
    imageBox = (await image.boundingBox())!,
    pdfBox = (await pdf.boundingBox())!;
  await page.mouse.click(pdfBox.x + 20, pdfBox.y + pdfBox.height - 20);
  await page.keyboard.down('Shift');
  await page.mouse.click(imageBox.x + imageBox.width / 2, imageBox.y + imageBox.height / 2);
  await page.keyboard.up('Shift');
  expect((await snapshot(page)).ui.canvas.selections.sort()).toEqual([id, imageId].sort());
  const beforeMultiple = (await world(page)).nodes.map((n) => n.id),
    chosen = beforeMultiple.filter((n) => [id, imageId].includes(n)),
    rest = beforeMultiple.filter((n) => !chosen.includes(n));
  await order('Enviar al fondo');
  expect((await world(page)).nodes.map((n) => n.id)).toEqual([...chosen, ...rest]);
  await page.keyboard.press('Control+z');
  expect((await world(page)).nodes.map((n) => n.id)).toEqual(beforeMultiple);
  await page.keyboard.press('Control+Shift+z');
  expect((await world(page)).nodes.map((n) => n.id)).toEqual([...chosen, ...rest]);
  expect(sorted((await world(page)).nodes)).toEqual(sorted(original));
});

test('C08-B75: contador explícito, aviso de reingreso dentro del conjunto y zona grande legible', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [
    {
      id: 'a',
      x: -160,
      y: -50,
      width: 120,
      height: 100,
      owner: null,
      data: { kind: 'note', title: 'A', text: 'A', color: '#f3eccf' },
    },
    {
      id: 'b',
      x: 80,
      y: -50,
      width: 120,
      height: 100,
      owner: null,
      data: { kind: 'note', title: 'B', text: 'B', color: '#f3eccf' },
    },
    {
      id: 'free',
      x: -400,
      y: 200,
      width: 120,
      height: 100,
      owner: null,
      data: { kind: 'note', title: 'Libre', text: 'Libre', color: '#f3eccf' },
    },
  ];
  w.canvasGroups = [{ id: 'set', name: 'Referencias', nodes: ['a', 'b'] }];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  await expect(page.locator('.group-count')).toHaveText('2 materiales');
  const original = (await world(page)).nodes,
    free = (await page.locator('[data-node=free]').boundingBox())!,
    group = (await page.locator('.canvas-manual-group').boundingBox())!;
  await page.mouse.move(free.x + free.width / 2, free.y + free.height / 2);
  await page.mouse.down();
  await page.mouse.move(group.x + group.width / 2, group.y + group.height / 2, { steps: 12 });
  const message = page.getByRole('status').filter({ hasText: 'Soltar para agregar' });
  await expect(message).toBeVisible();
  const m = (await message.boundingBox())!;
  expect(Math.abs(m.x + m.width / 2 - group.x - group.width / 2)).toBeLessThan(2);
  expect(Math.abs(m.y + m.height / 2 - group.y - group.height / 2)).toBeLessThan(2);
  await capture(page, info, 'aviso-dentro-del-conjunto');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await world(page)).nodes).toEqual(original);
  const empty = await snapshot(page),
    ew = empty.state.worlds.find((w) => w.id === 'scout')!;
  ew.nodes = [];
  ew.canvasGroups = [];
  ew.zones = [
    {
      id: 'large',
      agent: ew.agents[0]!.id,
      name: 'Zona grande',
      x: -1200,
      y: -1000,
      width: 2400,
      height: 2000,
    },
  ];
  empty.state.camera = { x: 0, y: 0, z: 0.32 };
  await storedFixture(page, empty.state, empty.ui);
  await page.reload();
  await ready(page);
  const text = page.locator('.drop-label');
  await expect(text).toBeVisible();
  const metrics = await text.evaluate((el) => {
    const r = el.getBoundingClientRect(),
      z = el.closest('[data-zone]')!.getBoundingClientRect();
    return {
      font: parseFloat(getComputedStyle(el).fontSize) * 0.32,
      dx: Math.abs(r.x + r.width / 2 - z.x - z.width / 2),
      dy: Math.abs(r.y + r.height / 2 - z.y - z.height / 2),
    };
  });
  expect(metrics.font).toBeGreaterThanOrEqual(11.9);
  expect(metrics.dx).toBeLessThan(2);
  expect(metrics.dy).toBeLessThan(25);
  await capture(page, info, 'zona-grande-vacia');
});

test('C08-B76: orientación elegida persiste, conserva herramientas con chat y el regreso de Configuración se alinea al contenido', async ({
  page,
}, info) => {
  await start(page);
  const legacy = await snapshot(page);
  Reflect.deleteProperty(legacy.ui.shell, 'canvasDockOrientation');
  await storedFixture(page, legacy.state, legacy.ui);
  await page.reload();
  await ready(page);
  expect((await snapshot(page)).ui.shell.canvasDockOrientation).toBe('horizontal');
  const dock = page.getByRole('toolbar', { name: 'Herramientas de Canvas', exact: true });
  const settings = async () => {
    await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
    await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  };
  await settings();
  const orientation = page.getByRole('combobox', {
    name: 'Orientación del dock de Canvas',
    exact: true,
  });
  await expect(orientation).toHaveValue('horizontal');
  await orientation.selectOption('vertical');
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  const back = page.getByRole('button', { name: 'Volver a Configuración', exact: true }),
    panel = page.locator('.profile-pop'),
    b = (await back.boundingBox())!,
    p = (await panel.boundingBox())!,
    padding = await panel.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
  expect(Math.abs(b.x - p.x - padding)).toBeLessThan(2);
  await back.click();
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await expect(dock).toHaveClass(/vertical-tools/);
  await page.reload();
  await ready(page);
  await expect(dock).toHaveClass(/vertical-tools/);
  await page.setViewportSize({ width: 300, height: 500 });
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await expect(dock).toHaveClass(/vertical-tools/);
  const chat = (await page
      .getByRole('region', { name: 'Chat del Canvas', exact: true })
      .boundingBox())!,
    d = (await dock.boundingBox())!;
  expect(
    d.x >= chat.x + chat.width ||
      d.x + d.width <= chat.x ||
      d.y >= chat.y + chat.height ||
      d.y + d.height <= chat.y,
  ).toBe(true);
  await capture(page, info, 'dock-vertical-y-chat-300');
  await page.getByRole('button', { name: 'Cerrar chat', exact: true }).click();
  await settings();
  await orientation.selectOption('horizontal');
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await expect(dock).not.toHaveClass(/vertical-tools/);
  await page.reload();
  await ready(page);
  await expect(dock).not.toHaveClass(/vertical-tools/);
});
