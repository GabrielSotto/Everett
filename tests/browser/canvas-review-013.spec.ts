import type { Page, Locator } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { enterWorld, openSurface } from './interaction-helpers';

const ready = async (page: Page) =>
  expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
async function zoom(page: Page, percent: number): Promise<void> {
  await page.getByRole('button', { name: /^Zoom de Canvas:/ }).click();
  const field = page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true });
  await field.fill(String(percent));
  await field.press('Enter');
}
async function moveDock(page: Page, x: number, y: number): Promise<void> {
  const dock = page.locator('.canvas-tools'),
    b = (await dock.boundingBox())!,
    grip = (await dock.locator('.dock-grip').boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + x - b.x, grip.y + grip.height / 2 + y - b.y, {
    steps: 12,
  });
  await page.mouse.up();
}

test('C08-B77: capas contextuales recorren tres materiales superpuestos pese a vecinos lejanos', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = ['a', 'far-1', 'b', 'far-2', 'c', 'alone'].map((id, i) => ({
    id,
    x: id === 'alone' ? -450 : id.startsWith('far') ? 3000 : -100,
    y: id === 'alone' ? -220 : -80,
    width: 200,
    height: 160,
    owner: null,
    data: {
      kind: 'note' as const,
      title: id,
      text: id,
      color: ['#ffaaaa', '#eeeeee', '#aaffaa', '#eeeeee', '#aaaaff', '#ffffaa'][i]!,
    },
  }));
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  const original = (await world(page)).nodes;
  const open = async (id: string) => {
    await page.locator(`[data-node="${id}"]`).press('Shift+F10');
    await expect(
      page.getByRole('menu', { name: 'Acciones del material', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('menu', { name: 'Acciones del material', exact: true })).toHaveCSS(
      'opacity',
      '1',
    );
  };
  await open('alone');
  for (const name of [
    'Traer al frente',
    'Avanzar una capa',
    'Retroceder una capa',
    'Enviar al fondo',
  ])
    await expect(page.getByRole('menuitem', { name, exact: true })).toBeDisabled();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Duplicar', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('menuitem', { name: 'Asignar a una zona', exact: false }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  const visibleStack = () =>
    page.locator('[data-node=a]').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [
        ...new Set(
          document
            .elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)
            .map((e) => e.closest<HTMLElement>('.material')?.dataset.node)
            .filter(Boolean),
        ),
      ].reverse();
    });
  const checks = [];
  for (const [name, expected] of [
    ['Avanzar una capa', ['b', 'a', 'c']],
    ['Avanzar una capa', ['b', 'c', 'a']],
    ['Retroceder una capa', ['b', 'a', 'c']],
    ['Retroceder una capa', ['a', 'b', 'c']],
    ['Traer al frente', ['b', 'c', 'a']],
    ['Enviar al fondo', ['a', 'b', 'c']],
  ] as const) {
    await open('a');
    await page.getByRole('menuitem', { name, exact: true }).click();
    await expect.poll(visibleStack).toEqual(expected);
    checks.push({ name, stack: await visibleStack() });
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+Shift+z');
    await expect.poll(visibleStack).toEqual(expected);
  }
  await open('a');
  await expect(
    page.getByRole('menuitem', { name: 'Retroceder una capa', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  expect([...(await world(page)).nodes].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
    [...original].sort((a, b) => a.id.localeCompare(b.id)),
  );
  await page.reload();
  await ready(page);
  await expect.poll(visibleStack).toEqual(['a', 'b', 'c']);
  await info.attach('pasos-visibles', {
    body: JSON.stringify(checks),
    contentType: 'application/json',
  });
  await capture(page, info, 'capas-limites-y-superposiciones');
});

async function zoneMetrics(label: Locator) {
  return label.evaluate((el) => {
    const r = el.getBoundingClientRect(),
      id = (el as HTMLElement).dataset.zoneLabel,
      zone = (
        id ? document.querySelector(`[data-zone="${id}"]`) : el.closest('[data-zone]')
      )!.getBoundingClientRect();
    const rects = [],
      walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      rects.push(...range.getClientRects());
    }
    return {
      visible: !!r.width && !!r.height,
      width: r.width,
      height: r.height,
      zoneWidth: zone.width,
      zoneHeight: zone.height,
      dx: Math.abs(r.x + r.width / 2 - zone.x - zone.width / 2),
      dy: Math.abs(r.y + r.height / 2 - zone.y - zone.height / 2),
      lines: new Set(rects.filter((r) => r.width > 0).map((r) => Math.round(r.y))).size,
      filter: getComputedStyle(el).filter,
      transformedParent: !!el.parentElement?.closest('#canvas-plane'),
    };
  });
}

test('C08-B78: zonas pequeñas y grandes mantienen texto nítido y sin reflujo durante zoom continuo', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!,
    samples = [];
  for (const size of [320, 2400]) {
    w.zones = [
      {
        id: 'empty',
        name: 'Zona vacía',
        agent: w.agents[0]!.id,
        x: -size / 2,
        y: -size / 2,
        width: size,
        height: size,
      },
    ];
    await storedFixture(page, input.state, input.ui);
    await page.reload();
    await ready(page);
    const label = page.locator('.drop-label');
    for (const percent of [6, 12, 17, 32, 75, 100, 200, 600]) {
      await zoom(page, percent);
      const m = await zoneMetrics(label);
      if (m.visible) {
        expect(m.width).toBeLessThanOrEqual(m.zoneWidth);
        expect(m.height).toBeLessThanOrEqual(m.zoneHeight);
        expect(m.lines).toBeLessThanOrEqual(2);
        expect(m.dx).toBeLessThanOrEqual(1);
        expect(m.dy).toBeLessThanOrEqual(1);
        expect(m.transformedParent, 'El texto se pinta fuera de la capa rasterizada por zoom').toBe(
          false,
        );
      } else expect(Math.min(m.zoneWidth, m.zoneHeight)).toBeLessThan(24);
      samples.push({ size, percent, ...m });
      if ([12, 17, 32].includes(percent)) await capture(page, info, `zona-${size}-${percent}`);
    }
    await zoom(page, 100);
    await page.mouse.move(1100, 350);
    const continuous = page.evaluate(async () => {
      const samples = [];
      for (let i = 0; i < 90; i++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const e = document.querySelector<HTMLElement>('.drop-label')!,
          r = e.getBoundingClientRect();
        const rects = [],
          walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          rects.push(...range.getClientRects());
        }
        samples.push({
          visible: !!r.width,
          lines: new Set(rects.filter((r) => r.width > 0).map((r) => Math.round(r.y))).size,
          parent: !!e.parentElement?.closest('#canvas-plane'),
          filter: getComputedStyle(e).filter,
        });
      }
      return samples;
    });
    for (const delta of [850, 850, -650, 850, -900, -900]) await page.mouse.wheel(0, delta);
    const frames = await continuous;
    expect(
      frames.every((f) => !f.parent && f.filter === 'none' && (!f.visible || f.lines <= 2)),
    ).toBe(true);
    await info.attach('zoom-continuo-' + size, {
      body: JSON.stringify(frames),
      contentType: 'application/json',
    });
  }
  await info.attach('zonas-y-escalas', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
});

test('C08-B79: abrir Quick Chat separa lateralmente y reserva abajo cuando la ventana no permite ambos anchos', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 900, height: 900 });
  await start(page);
  const input = await snapshot(page);
  input.ui.chat.chatPosition = { x: 600, y: 350 };
  input.ui.chat.chatSize = null;
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  const dock = page.locator('.canvas-tools'),
    chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  const initialChat = (await chat.boundingBox())!,
    initialDock = (await dock.boundingBox())!;
  await page.getByRole('button', { name: 'Cerrar chat', exact: true }).click();
  await moveDock(
    page,
    initialChat.x - initialDock.width + 80,
    initialChat.y - initialDock.height + 12,
  );
  const original = (await dock.boundingBox())!;
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  const left = (await dock.boundingBox())!;
  expect(left.y).toBeCloseTo(original.y, 0);
  expect(left.x).toBeLessThan(original.x);
  expect(left.width).toBe(original.width);
  await capture(page, info, 'dock-al-costado');
  const samples = [];
  for (const width of [1000, 900, 800, 799, 760, 600, 390, 300]) {
    await page.getByRole('button', { name: 'Cerrar chat', exact: true }).click();
    await page.setViewportSize({ width, height: 900 });
    // El resize reemplaza el dock en el siguiente fotograma. No medir un
    // ElementHandle que pertenecía al layout anterior.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(dock).toBeVisible();
    const d = (await dock.boundingBox())!;
    await moveDock(page, (width - d.width) / 2, 900 - d.height - 12);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
      const c = (await chat.boundingBox())!,
        b = (await dock.boundingBox())!;
      expect(
        b.x >= c.x + c.width ||
          b.x + b.width <= c.x ||
          b.y >= c.y + c.height ||
          b.y + b.height <= c.y,
      ).toBe(true);
      expect(
        b.y,
        'El dock inferior no se coloca como sombrero al abrir el chat',
      ).toBeGreaterThanOrEqual(c.y);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
      await expect(dock).not.toHaveClass(/vertical-tools/);
      samples.push({ width, iteration: i, dock: b, chat: c });
      if (i === 2) await capture(page, info, 'chat-y-dock-' + width);
      if (i < 2) await page.getByRole('button', { name: 'Cerrar chat', exact: true }).click();
    }
    const beforeReload = (await chat.boundingBox())!;
    await page.reload();
    await ready(page);
    const recovered = (await chat.boundingBox())!,
      recoveredDock = (await dock.boundingBox())!;
    expect(
      recoveredDock.y,
      'Recargar con Quick Chat abierto no coloca el dock encima',
    ).toBeGreaterThanOrEqual(recovered.y);
    expect(
      recoveredDock.x >= recovered.x + recovered.width ||
        recoveredDock.x + recoveredDock.width <= recovered.x ||
        recoveredDock.y >= recovered.y + recovered.height ||
        recoveredDock.y + recoveredDock.height <= recovered.y,
    ).toBe(true);
    expect(recovered.y, 'La recuperación conserva la posición válida del chat').toBeCloseTo(
      beforeReload.y,
      0,
    );
    samples.push({ width, iteration: 3, dock: recoveredDock, chat: recovered });
  }
  await info.attach('posiciones-repetidas', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
});

test('C08-B80: configuración compacta usa switches, centra el regreso y guarda preferencias reales de Canvas', async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await start(page);
  await page.getByRole('button', { name: 'Crear nota · N', exact: true }).click();
  await page.mouse.click(700, 300);
  const open = async () => {
    await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
    await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  };
  await open();
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  const panel = page.locator('.profile-pop');
  expect((await panel.boundingBox())!.width).toBeLessThanOrEqual(320);
  const vertical = page.getByRole('switch', { name: 'Dock vertical', exact: true });
  await vertical.focus();
  await vertical.press(' ');
  await expect(vertical).toHaveAttribute('aria-checked', 'true');
  const selected = (await snapshot(page)).ui.canvas.selection;
  for (const key of ['n', 'Backspace', 'Delete', 'Control+z']) await vertical.press(key);
  expect((await snapshot(page)).ui.canvas.selection).toBe(selected);
  expect((await snapshot(page)).ui.canvas.tool).toBe('select');
  await page.getByRole('switch', { name: 'Fondo cuadriculado', exact: true }).click();
  await page.getByRole('switch', { name: 'Reducir animaciones de Canvas', exact: true }).click();
  await expect(page.locator('.canvas-stage')).toHaveAttribute('data-background', 'grid');
  await expect(page.locator('body')).toHaveAttribute('data-canvas-motion', 'reduced');
  const shared = (await world(page)).nodes;
  await page.getByRole('button', { name: 'Volver a Configuración', exact: true }).click();
  for (const width of [900, 390, 300]) {
    await page.setViewportSize({ width, height: 720 });
    for (const name of ['Preferencias', 'Herramientas', 'Atajos']) {
      await page.getByRole('button', { name, exact: true }).click();
      const back = page.getByRole('button', { name: 'Volver a Configuración', exact: true });
      const geometry = await back.evaluate((el) => {
        const b = el.getBoundingClientRect(),
          s = el.querySelector('svg')!.getBoundingClientRect(),
          p = el.closest('.profile-pop')!,
          r = p.getBoundingClientRect();
        return {
          center: Math.abs(s.x + s.width / 2 - b.x - b.width / 2),
          top: Math.abs(s.y + s.height / 2 - b.y - b.height / 2),
          left: s.left - r.left - parseFloat(getComputedStyle(p).paddingLeft),
          scroll: p.scrollWidth - p.clientWidth,
        };
      });
      expect(geometry.center).toBeLessThan(0.6);
      expect(geometry.top).toBeLessThan(0.6);
      expect(Math.abs(geometry.left)).toBeLessThan(2);
      expect(geometry.scroll).toBe(0);
      await back.click();
    }
    await capture(page, info, 'configuracion-' + width);
  }
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.reload();
  await ready(page);
  await open();
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  for (const name of ['Dock vertical', 'Fondo cuadriculado', 'Reducir animaciones de Canvas'])
    await expect(page.getByRole('switch', { name, exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  expect((await world(page)).nodes).toEqual(shared);
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.getByRole('button', { name: 'Everett', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-canvas-motion', 'system');
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  await expect(page.locator('body')).toHaveAttribute('data-canvas-motion', 'reduced');
  await open();
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  await page.getByRole('switch', { name: 'Dock vertical', exact: true }).click();
  await page.getByRole('switch', { name: 'Fondo cuadriculado', exact: true }).click();
  await page.getByRole('switch', { name: 'Reducir animaciones de Canvas', exact: true }).click();
  await expect(page.locator('.canvas-stage')).toHaveAttribute('data-background', 'dots');
  await expect(page.locator('body')).toHaveAttribute('data-canvas-motion', 'system');
});

test('UI-HARNESS-05: la comparación de texto de zona con pintura nativa detecta desenfoque y recupera su nitidez', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.zones = [
    {
      id: 'ink',
      agent: w.agents[0]!.id,
      name: 'Zona de nitidez',
      x: -1200,
      y: -1000,
      width: 2400,
      height: 2000,
    },
  ];
  input.state.camera = { x: 0, y: 0, z: 0.17 };
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  const label = page.locator('[data-zone-label=ink]');
  const PNG = createRequire(import.meta.url)(
    resolve('node_modules/playwright-core/lib/utilsBundle.js'),
  ).PNG as {
    sync: { read(bytes: Buffer): { width: number; height: number; data: Buffer } };
  };
  const compare = async () => {
    const r = (await label.boundingBox())!,
      clip = {
        x: Math.floor(r.x) - 3,
        y: Math.floor(r.y) - 3,
        width: Math.ceil(r.width) + 6,
        height: Math.ceil(r.height) + 6,
      };
    const actual = await page.screenshot({ clip });
    await label.evaluate((el) => {
      const clone = el.cloneNode(true) as HTMLElement,
        rect = el.getBoundingClientRect();
      const source = [el, ...el.querySelectorAll('*')],
        dest = [clone, ...clone.querySelectorAll('*')];
      source.forEach((item, i) => {
        const css = getComputedStyle(item),
          target = dest[i] as HTMLElement;
        for (const key of css) target.style.setProperty(key, css.getPropertyValue(key));
      });
      clone.id = 'native-zone-text';
      clone.removeAttribute('data-zone-label');
      Object.assign(clone.style, {
        position: 'fixed',
        left: rect.x + 'px',
        top: rect.y + 'px',
        margin: '0px',
        translate: 'none',
        transform: 'none',
        scale: 'none',
        rotate: 'none',
        filter: 'none',
        opacity: '1',
        zIndex: '9999',
      });
      document.body.append(clone);
      (el as HTMLElement).style.opacity = '0';
    });
    const native = await page.screenshot({ clip });
    await label.evaluate((el) => {
      (el as HTMLElement).style.removeProperty('opacity');
      document.getElementById('native-zone-text')?.remove();
    });
    const a = PNG.sync.read(actual),
      b = PNG.sync.read(native);
    let different = 0;
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    for (let p = 0; p < a.data.length; p += 4)
      if ([0, 1, 2].some((c) => Math.abs(a.data[p + c]! - b.data[p + c]!) > 8)) different++;
    return { ratio: different / (a.width * a.height), actual, native };
  };
  const clear = await compare();
  expect(clear.ratio).toBeLessThan(0.005);
  await label.evaluate((el) => ((el as HTMLElement).style.filter = 'blur(1px)'));
  const blurred = await compare();
  expect(blurred.ratio, 'El comparador debe rechazar texto desenfocado').toBeGreaterThan(0.02);
  await label.evaluate((el) => (el as HTMLElement).style.removeProperty('filter'));
  const restored = await compare();
  expect(restored.ratio).toBeLessThan(0.005);
  for (const [name, bytes] of [
    ['texto-nitido', clear.actual],
    ['referencia-nativa', clear.native],
    ['contraejemplo-borroso', blurred.actual],
  ] as const)
    await info.attach(name, { body: bytes, contentType: 'image/png' });
  await info.attach('diferencias-de-pintura', {
    body: JSON.stringify({ clear: clear.ratio, blurred: blurred.ratio, restored: restored.ratio }),
    contentType: 'application/json',
  });
});
