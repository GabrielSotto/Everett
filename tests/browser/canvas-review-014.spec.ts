import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { dockChat } from './interaction-helpers';

const ready = async (page: Page) =>
  expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
const camera = async (page: Page) => (await snapshot(page)).camera!;
async function settle(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const a = window.EverettDebug!.snapshot().camera!;
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const b = window.EverettDebug!.snapshot().camera!;
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      }),
    )
    .toBeLessThan(0.00001);
}
async function zoom(page: Page, value: number): Promise<void> {
  await page.getByRole('button', { name: /^Zoom de Canvas:/ }).click();
  const input = page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true });
  await input.fill(String(value));
  await input.press('Enter');
  await expect
    .poll(async () => Math.abs((await camera(page)).z - value / 100))
    .toBeLessThan(0.00001);
  await settle(page);
}
async function settings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
}

test('C08-B81: Preferencias reúne los cuatro switches y el idioma, conserva sus valores y permite regresar', async ({
  page,
}, info) => {
  await start(page);
  const before = (await world(page)).nodes;
  await settings(page);
  await expect(page.locator('.profile-pop').getByRole('switch')).toHaveCount(0);
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  await expect(page.locator('.profile-pop').getByRole('switch')).toHaveCount(4);
  const names = [
    'Mostrar botón de Superficies',
    'Dock vertical',
    'Fondo cuadriculado',
    'Reducir animaciones de Canvas',
  ];
  for (const name of names) {
    const control = page.getByRole('switch', { name, exact: true });
    await expect(control).toHaveAttribute('aria-checked', 'false');
    await control.press('Space');
    await expect(control).toHaveAttribute('aria-checked', 'true');
  }
  await page
    .getByRole('combobox', { name: 'Idioma de dictado', exact: true })
    .selectOption('es-ES');
  await capture(page, info, 'preferencias-agrupadas');
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.reload();
  await ready(page);
  await settings(page);
  await expect(page.locator('.profile-pop').getByRole('switch')).toHaveCount(0);
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  for (const name of names)
    await expect(page.getByRole('switch', { name, exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  await expect(page.getByRole('combobox', { name: 'Idioma de dictado', exact: true })).toHaveValue(
    'es-ES',
  );
  await page.setViewportSize({ width: 300, height: 650 });
  expect(await page.locator('.profile-pop').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
    0,
  );
  await capture(page, info, 'preferencias-300');
  await page.getByRole('button', { name: 'Volver a Configuración', exact: true }).click();
  await page.getByRole('button', { name: 'Herramientas', exact: true }).click();
  for (const name of ['Archivar mundo', 'Ayuda de Canvas', 'Exportar diagnóstico'])
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  expect((await world(page)).nodes).toEqual(before);
});

test('C08-B82: el desborde del dock aprovecha cada espacio y no repite herramientas visibles', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await dockChat(page);
  const samples = [];
  for (const width of [
    1000, 900, 862, 840, 800, 799, 760, 700, 690, 688, 680, 650, 600, 390, 300, 862, 1000,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await settle(page);
    const metrics = await page.locator('.canvas-tools').evaluate((el) => {
      const dock = el.getBoundingClientRect(),
        chat = document.querySelector('.canvas-chat.docked')!.getBoundingClientRect();
      const slots = Array.from(el.children) as HTMLElement[];
      const visible = slots.slice(1, -1).filter((e) => !e.hidden),
        hidden = slots.slice(1, -1).filter((e) => e.hidden);
      const next = hidden[0],
        nextButton = next?.matches('button') ? next : next?.querySelector('button');
      return {
        width: dock.width,
        x: dock.x,
        right: dock.right,
        available: innerWidth - chat.width,
        shown: visible.length,
        hidden: hidden.length,
        nextWidth: nextButton ? parseFloat(getComputedStyle(nextButton).width) : 0,
        gap: parseFloat(getComputedStyle(el).columnGap) || 0,
        more: !!slots.at(-1)!.offsetWidth,
        keys: visible
          .flatMap((s) => [s, ...s.querySelectorAll<HTMLElement>('[data-action]')])
          .map((s) => s.dataset.action + ':' + (s.dataset.tool ?? '')),
      };
    });
    expect(metrics.right).toBeLessThanOrEqual(width);
    expect(metrics.width).toBeLessThanOrEqual(metrics.available);
    if (metrics.hidden && metrics.shown)
      expect(metrics.available - 24 - metrics.width).toBeLessThan(
        metrics.nextWidth + metrics.gap + 2,
      );
    if (width === 862) expect(metrics.shown).toBeGreaterThanOrEqual(6);
    if (metrics.more) {
      await page.getByRole('button', { name: 'Más herramientas', exact: true }).click();
      const keys = await page
        .getByRole('menu', { name: 'Más herramientas de Canvas', exact: true })
        .locator('button')
        .evaluateAll((items) =>
          items.map(
            (el) =>
              (el as HTMLElement).dataset.action + ':' + ((el as HTMLElement).dataset.tool ?? ''),
          ),
        );
      expect(keys.every((key) => !metrics.keys.includes(key))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('region', { name: 'Chat del Canvas', exact: true }),
      ).toBeVisible();
    }
    samples.push({ viewport: width, ...metrics });
    if ([862, 760, 688, 300].includes(width)) await capture(page, info, 'dock-progresivo-' + width);
  }
  await info.attach('capacidad-y-desborde', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
});

test('C08-B83: rueda sobre zona vacía acerca y aleja; contenido desplazable y Alt conservan acciones exclusivas', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.zones = [
    {
      id: 'wheel-zone',
      name: 'Zona rueda',
      agent: w.agents[0]!.id,
      x: -200,
      y: -160,
      width: 400,
      height: 320,
    },
  ];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  const node = page.locator('[data-zone=wheel-zone]'),
    b = (await node.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  const before = await camera(page);
  await page.mouse.wheel(0, -160);
  await expect.poll(async () => (await camera(page)).z).toBeGreaterThan(before.z);
  await settle(page);
  await page.mouse.wheel(0, 160);
  await settle(page);
  await expect.poll(async () => Math.abs((await camera(page)).z - before.z)).toBeLessThan(0.00001);
  const data = await snapshot(page),
    target = data.state.worlds.find((w) => w.id === 'scout')!;
  target.nodes = Array.from({ length: 6 }, (_, i) => ({
    id: 'owned-' + i,
    x: i * 100,
    y: 0,
    width: 100,
    height: 100,
    owner: target.agents[0]!.id,
    data: {
      kind: 'note' as const,
      title: 'Contexto ' + i,
      text: 'Texto de contexto\n'.repeat(20),
      color: '#eeeecc',
    },
  }));
  target.zones[0]!.height = 150;
  target.assignments = target.nodes.map((node) => ({
    id: 'job-' + node.id,
    agent: node.owner!,
    node: node.id,
    links: [],
    phase: 'ready',
    revision: 1,
    text: 'Propuesta pendiente',
    instruction: 'Revisar contexto',
    returnTo: { x: node.x, y: node.y },
    position: { x: 1500, y: 1500 },
  }));
  await storedFixture(page, data.state, data.ui);
  await page.reload();
  await ready(page);
  const local = page.locator('.zone-materials');
  expect(await local.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
  const scroll = (await local.boundingBox())!;
  await page.mouse.move(scroll.x + scroll.width / 2, scroll.y + scroll.height / 2);
  const localCamera = await camera(page);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => local.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await camera(page)).toEqual(localCamera);
  const top = await local.evaluate((el) => el.scrollTop);
  await page.evaluate(() => {
    const records: { prevented: boolean; alt: boolean; trusted: boolean }[] = [];
    Reflect.set(window, 'altWheelRecords', records);
    document.getElementById('viewport')!.addEventListener(
      'wheel',
      // El router escucha en captura y detiene la propagación. Observar después
      // en esa misma fase mide preventDefault sin depender del bubbling.
      (event) =>
        records.push({
          prevented: event.defaultPrevented,
          alt: event.altKey,
          trusted: event.isTrusted,
        }),
      { once: true, capture: true },
    );
  });
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, 240);
  await page.keyboard.up('Alt');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'world/scout');
  expect(await page.evaluate(() => Reflect.get(window, 'altWheelRecords'))).toEqual([
    { prevented: true, alt: true, trusted: true },
  ]);
  expect(top).toBeGreaterThan(0);
  await capture(page, info, 'salida-espacial-desde-zona');
});

test('C08-B84: etiquetas centradas y marcos de conjuntos conservan anclajes en todo el recorrido del zoom', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [
    {
      id: 'star',
      x: -100,
      y: -60,
      width: 200,
      height: 180,
      owner: null,
      data: {
        kind: 'shape',
        shape: 'star',
        color: '#ffffff',
        stroke: '#ad9bc9',
        thickness: 4,
        fill: true,
      },
    },
    ...['a', 'b', 'c', 'd'].map((id, i) => ({
      id,
      x: 400 + (i % 2) * 180,
      y: -100 + Math.floor(i / 2) * 160,
      width: 140,
      height: 120,
      owner: null,
      data: { kind: 'note' as const, title: 'Nota ' + id, text: id, color: '#eeeedd' },
    })),
  ];
  w.canvasGroups = [
    { id: 'one', name: 'Primer conjunto de referencias', nodes: ['a', 'b'] },
    { id: 'two', name: 'Segundo conjunto de referencias', nodes: ['c', 'd'] },
  ];
  input.ui.canvas.selection = 'star';
  input.ui.canvas.selections = ['star', 'a'];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  const original = (await world(page)).nodes;
  const measure = () =>
    page.evaluate(() => {
      const node = document.querySelector<HTMLElement>('[data-node=star]')!,
        r = node.getBoundingClientRect(),
        label = node.querySelector('.material-identification')!.getBoundingClientRect();
      const z = window.EverettDebug!.snapshot().camera!.z;
      const obstacles = Array.from(
        document.querySelectorAll<HTMLElement>('.material[data-node]'),
        (node) => node.getBoundingClientRect(),
      );
      const intersects = (a: DOMRect, b: DOMRect) =>
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
          Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) >
        1;
      const groups = Array.from(document.querySelectorAll<HTMLElement>('.canvas-manual-group')).map(
        (el) => {
          const b = el.getBoundingClientRect(),
            h = el.querySelector('.group-heading')!.getBoundingClientRect();
          return {
            width: b.width,
            height: b.height,
            x: parseFloat(el.style.left),
            y: parseFloat(el.style.top),
            worldWidth: parseFloat(el.style.width),
            density: el.dataset.density,
            side: el.dataset.headingSide,
            occluded: el.dataset.headingOccluded === 'true' || el.dataset.headingSide === 'blocked',
            visible: getComputedStyle(el.querySelector('.group-heading')!).opacity !== '0',
            collisions: obstacles.filter((other) => intersects(h, other)).length,
            gap: el.dataset.headingSide === 'bottom' ? h.top - b.bottom : b.top - h.bottom,
            labelWidth: h.width,
            frameWidth: b.width,
          };
        },
      );
      const visibleNames = Array.from(
        document.querySelectorAll<HTMLElement>('.material-identification'),
      )
        .filter((el) => getComputedStyle(el).visibility === 'visible')
        .map((el) => el.closest<HTMLElement>('[data-node]')!.dataset.node);
      return {
        z,
        visibleNames,
        dx: Math.abs(label.x + label.width / 2 - r.x - r.width / 2),
        gap: r.y - label.bottom,
        labelWidth: label.width,
        groups,
      };
    });
  const check = (m: Awaited<ReturnType<typeof measure>>) => {
    if (m.z < 0.25) expect(m.visibleNames).toEqual(['star']);
    expect(m.dx).toBeLessThan(1);
    expect(m.gap).toBeGreaterThanOrEqual(0);
    expect(m.gap).toBeLessThan(16);
    expect(m.labelWidth).toBeLessThanOrEqual(241);
    expect(m.groups.map((g) => g.side)).toEqual(['top', 'bottom']);
    for (const g of m.groups) {
      expect(g.x).toBe(384);
      expect(g.worldWidth).toBe(352);
      expect(g.width).toBeCloseTo(352 * m.z, 1);
      if (g.visible) {
        expect(g.labelWidth).toBeLessThanOrEqual(g.frameWidth + 1);
        expect(g.collisions).toBe(0);
        // El borde CSS tiene un mínimo físico antes de escalar el plano; al
        // 600 % ocupa hasta 6 px. Exigir cercanía al marco exterior incluye ese borde.
        expect(g.gap).toBeGreaterThanOrEqual(12);
        expect(g.gap).toBeLessThanOrEqual(22);
      } else expect(g.frameWidth < 100 || g.occluded).toBe(true);
    }
    if (Math.abs(m.z - 0.6) < 0.00001 || Math.abs(m.z - 1) < 0.00001)
      expect(m.groups.every((g) => g.visible)).toBe(true);
  };
  const samples = [];
  for (const value of [1, 3, 6, 17, 38, 60, 100, 200, 431, 600, 60, 3, 100]) {
    await zoom(page, value);
    const m = await measure();
    check(m);
    samples.push(m);
    if ([1, 3, 60, 431].includes(value)) await capture(page, info, 'etiquetas-' + value);
  }
  const continuous = page.evaluate(async () => {
    const frames = [];
    for (let i = 0; i < 100; i++) {
      await new Promise(requestAnimationFrame);
      const node = document.querySelector('[data-node=star]')!,
        a = node.getBoundingClientRect(),
        b = node.querySelector('.material-identification')!.getBoundingClientRect();
      const obstacles = Array.from(document.querySelectorAll('.material[data-node]'), (node) =>
        node.getBoundingClientRect(),
      );
      const collisions = Array.from(document.querySelectorAll('.group-heading'))
        .filter((h) => getComputedStyle(h).opacity !== '0')
        .reduce((total, h) => {
          const r = h.getBoundingClientRect();
          return (
            total +
            obstacles.filter(
              (o) =>
                Math.max(0, Math.min(r.right, o.right) - Math.max(r.left, o.left)) *
                  Math.max(0, Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top)) >
                1,
            ).length
          );
        }, 0);
      frames.push({
        collisions,
        z: window.EverettDebug!.snapshot().camera!.z,
        dx: Math.abs(a.x + a.width / 2 - b.x - b.width / 2),
        gap: a.y - b.bottom,
      });
    }
    return frames;
  });
  await page.mouse.move(1000, 400);
  for (const d of [1100, 900, -700, -1100, 800, -1000]) await page.mouse.wheel(0, d);
  const frames = await continuous;
  expect(frames.every((f) => f.dx < 1 && f.gap >= 0 && f.gap < 16 && f.collisions === 0)).toBe(
    true,
  );
  expect((await world(page)).nodes).toEqual(original);
  await info.attach('anclajes-por-escala', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
  await info.attach('anclajes-continuos', {
    body: JSON.stringify(frames),
    contentType: 'application/json',
  });
  // Contraejemplo: desplazar la identificación debe fallar el mismo criterio.
  await page
    .locator('.material-identification')
    .first()
    .evaluate((el) => ((el as HTMLElement).style.left = '0'));
  expect((await measure()).dx).toBeGreaterThan(1);
  await page
    .locator('.material-identification')
    .first()
    .evaluate((el) => (el as HTMLElement).style.removeProperty('left'));
  check(await measure());
  const headingStyle = await page
    .locator('.group-heading')
    .last()
    .evaluate((el) => {
      const h = el as HTMLElement,
        old = h.style.cssText;
      h.style.cssText = 'left:16px;top:16px;bottom:auto;margin:0';
      return old;
    });
  expect((await measure()).groups.at(-1)!.collisions).toBeGreaterThan(0);
  await page
    .locator('.group-heading')
    .last()
    .evaluate((el, style) => ((el as HTMLElement).style.cssText = style), headingStyle);
  check(await measure());
  expect((await world(page)).canvasGroups).toEqual(w.canvasGroups);
  await zoom(page, 3);
  await page.reload();
  await ready(page);
  check(await measure());
  const name = page.locator('.group-name').first();
  await name.focus();
  await expect(name).toBeFocused();
  await expect(page.locator('.group-heading').first()).toHaveCSS('opacity', '1');
  await name.press('Enter');
  await expect(page.getByLabel('Nombre del conjunto', { exact: true })).toHaveValue(
    'Primer conjunto de referencias',
  );
  await page.keyboard.press('Escape');
});

test('C08-B85: cámara reversible alrededor del cursor, límites finitos y deltaMode normalizado', async ({
  page,
}, info) => {
  await start(page);
  const stage = (await page.locator('.canvas-stage').boundingBox())!;
  // El mouse nativo entrega clientX/Y enteros. Medir ese mismo píxel evita
  // confundir cuantización del input con deriva de la cámara.
  const point = {
    x: Math.round(stage.x + stage.width * 0.67),
    y: Math.round(stage.y + stage.height * 0.4),
  };
  const anchor = {
    x: point.x - stage.x - stage.width / 2,
    y: point.y - stage.y - stage.height / 2,
  };
  const toWorld = (c: Awaited<ReturnType<typeof camera>>) => ({
    x: (anchor.x - c.x) / c.z,
    y: (anchor.y - c.y) / c.z,
  });
  await page.mouse.move(point.x, point.y);
  const before = await camera(page),
    origin = toWorld(before),
    samples = [];
  for (const delta of [-120, -120, 120, 120]) {
    await page.mouse.wheel(0, delta);
    await settle(page);
    const c = await camera(page),
      p = toWorld(c);
    expect(Math.hypot(p.x - origin.x, p.y - origin.y)).toBeLessThan(0.01);
    samples.push(c);
  }
  const returned = await camera(page);
  expect(
    Math.hypot(returned.x - before.x, returned.y - before.y, returned.z - before.z),
  ).toBeLessThan(0.001);
  const dispatch = async (mode: number, deltaY: number) => {
    await page
      .locator('.canvas-stage')
      .dispatchEvent('wheel', { deltaY, deltaMode: mode, clientX: point.x, clientY: point.y });
    await settle(page);
    return camera(page);
  };
  const pixels = await dispatch(0, -160);
  await dispatch(0, 160);
  const lines = await dispatch(1, -10);
  await dispatch(1, 10);
  expect(lines.z).toBeCloseTo(pixels.z, 6);
  const pages = await dispatch(2, -160 / page.viewportSize()!.height);
  await dispatch(2, 160 / page.viewportSize()!.height);
  expect(pages.z).toBeCloseTo(pixels.z, 6);
  for (const [delta, limit] of [
    [10000, 0.01],
    [-10000, 6],
  ] as const) {
    await dispatch(0, delta);
    expect((await camera(page)).z).toBeCloseTo(limit, 6);
    const a = await camera(page);
    await dispatch(0, delta);
    expect(await camera(page)).toEqual(a);
  }
  await info.attach('camara-cursor-y-reversibilidad', {
    body: JSON.stringify({ before, samples, returned, pixels, lines, pages }),
    contentType: 'application/json',
  });
});

test('C08-B86: un conjunto con ambos bordes ocupados conserva nombre alcanzable por puntero y selección desde su fondo', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [
    { id: 'a', x: -150, y: 0, width: 140, height: 100 },
    { id: 'b', x: 30, y: 0, width: 140, height: 100 },
    { id: 'above', x: -166, y: -60, width: 352, height: 30 },
    { id: 'below', x: -166, y: 130, width: 352, height: 30 },
  ].map((n) => ({
    ...n,
    owner: null,
    data: { kind: 'note' as const, title: n.id, text: n.id, color: '#eeeedd' },
  }));
  w.canvasGroups = [{ id: 'crowded', name: 'Conjunto entre materiales', nodes: ['a', 'b'] }];
  input.state.camera = { x: 0, y: 0, z: 1 };
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  await page.mouse.move(20, 100);
  const frame = page.locator('.canvas-manual-group'),
    heading = frame.locator('.group-heading');
  await expect(frame).toHaveAttribute('data-heading-side', 'blocked');
  await expect(heading).toHaveCSS('opacity', '0');
  await capture(page, info, 'conjunto-bloqueado-en-reposo');
  const r = (await frame.boundingBox())!;
  await page.mouse.move(r.x + 3, r.y + r.height / 2);
  await expect(heading).toHaveCSS('opacity', '1');
  const name = frame.locator('.group-name'),
    b = (await name.boundingBox())!;
  // Atravesar realmente el espacio de separación; un click directo saltaría
  // el tramo que antes volvía inalcanzable la identificación.
  await page.mouse.move(b.x + b.width / 2, r.y - 10, { steps: 10 });
  await expect(heading).toHaveCSS('opacity', '1');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await expect(heading).toHaveCSS('opacity', '1');
  await capture(page, info, 'conjunto-bloqueado-hover');
  await name.click();
  const field = page.getByLabel('Nombre del conjunto', { exact: true });
  await field.fill('Nombre accesible');
  await field.press('Enter');
  expect((await world(page)).canvasGroups![0]!.name).toBe('Nombre accesible');
  const original = (await world(page)).nodes,
    cameraBefore = await camera(page);
  for (const y of [r.y + 2, r.y - 10]) {
    await page.mouse.move(r.x + 2, y);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width - 2, r.y + r.height - 2, { steps: 15 });
    await page.mouse.up();
    expect((await snapshot(page)).ui.canvas.selections.slice().sort()).toEqual(['a', 'b']);
    expect((await world(page)).nodes).toEqual(original);
    expect(await camera(page)).toEqual(cameraBefore);
  }
});
