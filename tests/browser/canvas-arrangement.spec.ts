import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';

async function prepare(page: Page, grouped = false): Promise<void> {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((item) => item.id === 'scout')!;
  w.nodes = [
    { id: 'arr-a', x: -400, y: -210, width: 110, height: 80 },
    { id: 'arr-b', x: -230, y: -90, width: 80, height: 110 },
    { id: 'arr-c', x: 40, y: 60, width: 160, height: 70 },
    { id: 'arr-d', x: 390, y: 200, width: 90, height: 80 },
  ].map((rect) => ({
    ...rect,
    owner: null,
    data: {
      kind: 'note' as const,
      title: rect.id,
      text: 'Organizar referencias de tamaños distintos',
      color: '#e8efdf',
    },
  }));
  w.canvasGroups = grouped
    ? [{ id: 'arr-group', name: 'Pantalla', nodes: ['arr-b', 'arr-c'] }]
    : [];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await page.locator('[data-node=arr-a]').click();
  await page.keyboard.down('Shift');
  for (const id of ['arr-b', 'arr-c', 'arr-d']) await page.locator(`[data-node=${id}]`).click();
  await page.keyboard.up('Shift');
  expect((await snapshot(page)).ui.canvas.selections).toHaveLength(4);
}
async function open(page: Page, kind: 'view' | 'arrange' = 'view'): Promise<void> {
  const name = kind === 'view' ? 'Vista y ajustes de Canvas' : 'Organizar selección';
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('menu', { name, exact: true })).toBeVisible();
  await expect(page.locator('.canvas-actions-pop')).toHaveCSS('transform', 'none');
}
async function command(page: Page, name: string, contextual = false): Promise<void> {
  if (contextual) {
    await page.locator('[data-node=arr-d]').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Alinear y distribuir', exact: false }).click();
  } else {
    await open(page, 'arrange');
  }
  await page.getByRole('menuitem', { name, exact: true }).click();
}

test('C08-B116: alinear desde cabecera y contexto mueve los bordes y centros reales, con Undo y persistencia', async ({
  page,
}, info) => {
  await prepare(page);
  const actions = [
    ['Alinear a la izquierda', 'x', 'width', 0],
    ['Centrar horizontalmente', 'x', 'width', 0.5],
    ['Alinear a la derecha', 'x', 'width', 1],
    ['Alinear arriba', 'y', 'height', 0],
    ['Centrar verticalmente', 'y', 'height', 0.5],
    ['Alinear abajo', 'y', 'height', 1],
  ] as const;
  let previous = (await world(page)).nodes;
  for (const [i, [name, axis, size, fraction]] of actions.entries()) {
    await command(page, name, i % 2 === 0);
    const nodes = (await world(page)).nodes;
    const values = nodes.map((n) => n[axis] + n[size] * fraction);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThan(0.001);
    for (const n of nodes) {
      const before = previous.find((item) => item.id === n.id)!;
      expect([n.width, n.height, n[axis === 'x' ? 'y' : 'x']]).toEqual([
        before.width,
        before.height,
        before[axis === 'x' ? 'y' : 'x'],
      ]);
    }
    const rectangles = await page.locator('.material').evaluateAll((elements) =>
      elements.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
    const visible = rectangles.map((r) => r[axis] + r[size] * fraction);
    expect(Math.max(...visible) - Math.min(...visible)).toBeLessThan(2);
    if (i === actions.length - 1) {
      await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
      expect((await world(page)).nodes).toEqual(previous);
      await page.getByRole('button', { name: 'Rehacer · Ctrl+Shift+Z', exact: true }).click();
      expect((await world(page)).nodes).toEqual(nodes);
    }
    previous = nodes;
  }
  await page.reload();
  expect((await world(page)).nodes).toEqual(previous);
  await capture(page, info, 'alineacion-geometria-conservada');
});

test('C08-B117: distribución iguala espacios entre tamaños distintos, mantiene conjuntos y no mueve sus extremos', async ({
  page,
}, info) => {
  await prepare(page, true);
  const before = await world(page),
    group = before.nodes.filter((n) => ['arr-b', 'arr-c'].includes(n.id));
  await command(page, 'Espaciar horizontalmente');
  await open(page, 'arrange');
  await expect(
    page.getByRole('menuitem', { name: 'Espaciar horizontalmente', exact: true }),
  ).toBeEnabled();
  await capture(page, info, 'acciones-de-alineacion-y-espacios');
  await page.keyboard.press('Escape');
  const after = await world(page),
    a = after.nodes[0]!,
    b = after.nodes[1]!,
    c = after.nodes[2]!,
    d = after.nodes[3]!;
  expect(a).toEqual(before.nodes[0]);
  expect(d).toEqual(before.nodes[3]);
  expect(c.x - b.x).toBe(group[1]!.x - group[0]!.x);
  expect(c.y - b.y).toBe(group[1]!.y - group[0]!.y);
  const firstGap = b.x - a.x - a.width,
    secondGap = d.x - c.x - c.width;
  expect(firstGap).toBeCloseTo(secondGap, 5);
  expect(after.canvasGroups).toEqual(before.canvasGroups);
  await command(page, 'Espaciar verticalmente');
  const vertical = await world(page),
    vb = vertical.nodes[1]!,
    vc = vertical.nodes[2]!;
  expect(vertical.nodes[0]).toEqual(before.nodes[0]);
  expect(vertical.nodes[3]).toEqual(before.nodes[3]);
  expect(vc.y - vb.y).toBe(group[1]!.y - group[0]!.y);
  expect(vb.y - a.y - a.height).toBeCloseTo(d.y - vc.y - vc.height, 5);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes).toEqual(after.nodes);
  await page.getByRole('button', { name: 'Rehacer · Ctrl+Shift+Z', exact: true }).click();
  expect((await world(page)).nodes).toEqual(vertical.nodes);
  await page.reload();
  expect((await world(page)).nodes).toEqual(vertical.nodes);
  await capture(page, info, 'distribucion-conjunto-como-pieza');
});

test('C08-B118: menú de Canvas se adapta a selección, teclado, 320 px y texto ampliado sin perder acciones', async ({
  page,
}, info) => {
  await start(page);
  const trigger = page.getByRole('button', { name: 'Vista y ajustes de Canvas', exact: true });
  await page.getByRole('button', { name: 'Organizar selección', exact: true }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Alinear a la izquierda', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('menuitem', { name: 'Ajustar a la selección', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('menuitem', { name: 'Ajustar al contenido', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Atajos de Canvas', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByLabel('Modificador de navegación espacial', { exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  for (const width of [1440, 640, 480, 320]) {
    await page.setViewportSize({ width, height: 850 });
    await open(page);
    const geometry = await page.locator('.canvas-actions-pop').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        right: r.right,
        bottom: r.bottom,
        anchor: document.querySelector('[data-action=canvas-view]')!.getBoundingClientRect().bottom,
      };
    });
    expect(geometry.x).toBeGreaterThanOrEqual(7);
    expect(geometry.right).toBeLessThanOrEqual(width - 7);
    expect(geometry.bottom).toBeLessThanOrEqual(843);
    const top = (await page.locator('.canvas-actions-pop').boundingBox())!.y;
    expect(top - geometry.anchor).toBeCloseTo(8, 0);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  await open(page);
  await page
    .getByRole('menuitem', { name: 'Atajos de Canvas', exact: true })
    .scrollIntoViewIfNeeded();
  await capture(page, info, 'menu-canvas-320-texto-200');
  await page.keyboard.press('Escape');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(page.locator('.canvas-actions-pop')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Buscar en Everett', exact: true })).toBeFocused();
  await open(page);
  await page.keyboard.press('Control+k');
  await expect(page.locator('.canvas-actions-pop')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Buscar en Everett', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(page.locator('.canvas-actions-pop')).toHaveCSS('animation-name', 'none');
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page);
  await page.getByRole('menuitem', { name: 'Preferencias de Canvas', exact: true }).click();
  await page.getByRole('switch', { name: 'Reducir animaciones de Canvas', exact: true }).click();
  await page.getByRole('button', { name: 'Volver a Configuración', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preferencias', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Atajos', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await open(page);
  await expect(page.locator('.canvas-actions-pop')).toHaveCSS('animation-name', 'none');
});

test('C08-B119: guías activas por defecto, ajuste desactivable y preferencia única entre cabecera y Configuración', async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await prepare(page);
  const legacy = await snapshot(page);
  delete (legacy.ui.shell as Partial<typeof legacy.ui.shell>).canvasAlignmentGuides;
  await storedFixture(page, legacy.state, legacy.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await open(page);
  const setting = page.getByRole('menuitemcheckbox', {
    name: 'Guías y ajuste automático',
    exact: true,
  });
  await expect(setting).toHaveAttribute('aria-checked', 'true');
  await setting.click();
  await expect(setting).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.canvas-actions-pop')).toHaveCSS('animation-name', 'none');
  await page.getByRole('menuitem', { name: 'Preferencias de Canvas', exact: true }).click();
  const preference = page.getByRole('switch', { name: 'Guías y ajuste automático', exact: true });
  await expect(preference).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await page.reload();
  await open(page);
  await expect(setting).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  async function dragNearGuide(enabled: boolean): Promise<void> {
    await page.locator('[data-node=arr-d]').click();
    const current = await world(page),
      origin = current.nodes[3]!,
      anchor = current.nodes[0]!;
    const box = (await page.locator('[data-node=arr-d]').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + anchor.x + 3 - origin.x, box.y + box.height / 2, {
      steps: 10,
    });
    await expect(page.locator('.alignment-guides')).toHaveCount(enabled ? 1 : 0);
    await page.mouse.up();
    expect((await world(page)).nodes[3]!.x).toBeCloseTo(anchor.x + (enabled ? 0 : 3), 3);
  }
  await dragNearGuide(false);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await open(page);
  await setting.click();
  await expect(setting).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('menuitemcheckbox', { name: 'Fondo cuadriculado', exact: true }).click();
  await expect(
    page.getByRole('menuitemcheckbox', { name: 'Fondo cuadriculado', exact: true }),
  ).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('menuitemcheckbox', { name: 'Dock vertical', exact: true }).click();
  await expect(
    page.getByRole('menuitemcheckbox', { name: 'Dock vertical', exact: true }),
  ).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await dragNearGuide(true);
  await capture(page, info, 'ajustes-canvas-compartidos');
});

test('C08-B131: creación, organización y vista abren directamente y conservan ámbito, selección y acceso en cabecera', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await prepare(page);
  const original = await world(page);
  const selection = (await snapshot(page)).ui.canvas.selections;
  const names = ['Bosquejos', 'Organizar selección', 'Vista y ajustes de Canvas'];
  const sketchTrigger = page.getByRole('button', { name: 'Bosquejos', exact: true });
  await sketchTrigger.hover();
  await expect(page.locator('#tooltip')).toHaveClass(/visible/);
  await sketchTrigger.click();
  const tooltipFrames = await page.evaluate(async () => {
    const visible: boolean[] = [];
    for (let i = 0; i < 25; i++) {
      await new Promise(requestAnimationFrame);
      visible.push(document.querySelector('#tooltip')!.classList.contains('visible'));
    }
    return visible;
  });
  expect(tooltipFrames.every((visible) => !visible)).toBe(true);
  await page.keyboard.press('Escape');
  for (const width of [1440, 1100, 800, 480, 320, 300]) {
    await page.setViewportSize({ width, height: 850 });
    for (const name of names) {
      const trigger = page.getByRole('button', { name, exact: true });
      await expect(trigger).toBeInViewport({ ratio: 1 });
      await trigger.click();
      const menu = page.getByRole('menu', { name, exact: true });
      await expect(menu).toBeVisible();
      await expect(page.locator('.canvas-actions-pop')).toHaveCount(1);
      const geometry = await menu.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, bottom: rect.bottom };
      });
      expect(geometry.left).toBeGreaterThanOrEqual(7);
      expect(geometry.right).toBeLessThanOrEqual(width - 7);
      expect(geometry.bottom).toBeLessThanOrEqual(843);
      if (name === 'Bosquejos') {
        await expect(
          menu.getByRole('menuitem', { name: 'Agregar pantalla', exact: true }),
        ).toBeVisible();
        await expect(
          menu.getByRole('menuitem', { name: /Alinear|Ajustar|Preferencias/ }),
        ).toHaveCount(0);
      } else if (name === 'Organizar selección') {
        await expect(
          menu.getByRole('menuitem', { name: 'Alinear a la izquierda', exact: true }),
        ).toBeVisible();
        await expect(
          menu.getByRole('menuitem', { name: /Agregar|Ajustar|Preferencias/ }),
        ).toHaveCount(0);
      } else {
        await expect(
          menu.getByRole('menuitem', { name: 'Ajustar al contenido', exact: true }),
        ).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: /Agregar|Alinear/ })).toHaveCount(0);
      }
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    }
  }
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  await page.getByRole('button', { name: 'Bosquejos', exact: true }).click();
  await page.getByRole('button', { name: 'Organizar selección', exact: true }).click();
  await expect(page.getByRole('menu', { name: 'Bosquejos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('menu', { name: 'Organizar selección', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  const first = page.getByRole('button', { name: 'Bosquejos', exact: true });
  await first.click();
  await expect(page.getByRole('menuitem', { name: /Biblioteca de componentes/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Agregar pantalla', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitem', { name: 'Agregar bloque', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Agregar campo', exact: true })).toBeFocused();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('button', { name: 'Organizar selección', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menu', { name: 'Organizar selección', exact: true })).toBeVisible();
  await expect(page.getByRole('menu', { name: 'Bosquejos', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  expect(await world(page)).toEqual(original);
  expect((await snapshot(page)).ui.canvas.selections).toEqual(selection);
  await capture(page, info, 'menus-por-funcion-300-texto200');
});
