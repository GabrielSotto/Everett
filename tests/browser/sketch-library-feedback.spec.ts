import { test, expect } from './fixtures';
import { start, world, snapshot, capture, moveMaterial } from './canvas-utility-helpers';
import { addLibrary, libraryTile, openLibrary } from './sketch-library-helpers';
import { sketchSymbols } from '../../src/domain/sketch-symbols';

test('C08-B162: filtros fijos por tipo conservan geometría, elecciones y recorridos de dispositivo', async ({
  page,
}, info) => {
  await start(page);
  const panel = await openLibrary(page);
  for (const width of [1440, 550, 320]) {
    await page.setViewportSize({ width, height: 720 });
    let position: { x: number; y: number } | undefined;
    for (const [tab, filter, option, ids] of [
      ['Piezas', 'Filtrar piezas', 'Texto', ['label', 'heading', 'paragraph', 'text-bars']],
      ['Componentes', 'Filtrar componentes', 'Controles', ['button', 'combobox', 'textarea']],
      ['Interfaces', 'Filtrar interfaces', 'Tablet', ['tablet-workspace', 'tablet-planner']],
    ] as const) {
      await panel.getByRole('tab', { name: tab, exact: true }).click();
      const trigger = panel.getByRole('button', { name: filter, exact: true });
      const box = (await trigger.boundingBox())!;
      if (position) {
        expect(Math.abs(box.x - position.x)).toBeLessThan(1);
        expect(Math.abs(box.y - position.y)).toBeLessThan(1);
      }
      position = box;
      const area = await panel.locator('.library-items').boundingBox();
      await trigger.click();
      await panel.getByRole('menuitemradio', { name: option, exact: true }).click();
      const after = (await panel.locator('.library-items').boundingBox())!;
      expect([after.x, after.y, after.width]).toEqual([area!.x, area!.y, area!.width]);
      const shown = await panel
        .locator('[data-library-add]')
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.libraryAdd));
      for (const id of ids) expect(shown).toContain(id);
      if (tab !== 'Componentes') expect(shown).toHaveLength(ids.length);
      await expect(trigger).toHaveAttribute('title', 'Filtrar: ' + option);
    }
    await capture(page, info, 'filtro-dispositivos-' + width);
  }
  await panel.getByRole('button', { name: 'Filtrar interfaces' }).click();
  await panel.getByRole('menuitemradio', { name: 'Móvil', exact: true }).click();
  await expect(panel.locator('[data-library-add]')).toHaveCount(3);
  for (const id of ['mobile-inbox', 'mobile-catalog', 'tablet-workspace', 'tablet-planner']) {
    const nodes = await addLibrary(page, id);
    expect(nodes.length).toBeGreaterThan(12);
    expect((await world(page)).canvasGroups!.at(-1)!.component).toBe(true);
  }
});

test('C08-B163: símbolos reales buscables se insertan individualmente y conservan recursos sin red', async ({
  page,
  context,
}, info) => {
  await start(page);
  await context.setOffline(true);
  try {
    await libraryTile(page, 'symbol');
    await page.locator('[data-library-entry=symbol]').click();
    const options = page.getByRole('dialog', { name: 'Opciones de Icono y símbolo' });
    const buttons = options.locator('[data-symbol]');
    expect(await buttons.count()).toBe(Object.keys(sketchSymbols).length);
    expect(Object.keys(sketchSymbols).length).toBeGreaterThan(80);
    expect(
      await options.locator('img').evaluateAll(async (imgs) => {
        await Promise.all(imgs.map((img) => (img as HTMLImageElement).decode()));
        return imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0);
      }),
    ).toBe(true);
    await capture(page, info, 'catalogo-simbolos');
    const search = options.getByRole('searchbox', { name: 'Buscar símbolo' });
    await search.fill('notificacion');
    await expect(options.locator('[data-symbol]:visible')).toHaveCount(1);
    await expect(options.getByRole('button', { name: 'Notificación', exact: true })).toBeVisible();
    await search.fill('no-existe-este-icono');
    await expect(options.getByText('Sin coincidencias')).toBeVisible();
    await search.fill('carrito');
    await expect(options.locator('[data-symbol]:visible')).toHaveCount(1);
    await search.press('Tab');
    await expect(options.getByRole('button', { name: 'Carrito', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(options.getByRole('button', { name: 'Carrito', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await capture(page, info, 'selector-simbolos');
    await page.keyboard.press('Escape');
    const nodes = await addLibrary(page, 'symbol');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.data.kind === 'wireframe' && nodes[0]!.data.content.piece?.symbol).toBe(
      'shopping-cart',
    );
    expect(nodes[0]!.data.kind === 'wireframe' && nodes[0]!.data.title).toBe('Símbolo · Carrito');
    expect(nodes[0]!.width).toBe(32);
    await expect(page.locator(`[data-node="${nodes[0]!.id}"] .library-piece`)).toHaveCSS(
      'color',
      'rgb(224, 231, 237)',
    );
    await capture(page, info, 'simbolo-individual');
  } finally {
    await context.setOffline(false);
  }
  const before = (await world(page)).nodes;
  await page.reload();
  expect((await world(page)).nodes).toEqual(before);
});

test('C08-B164: una receta de Piezas también permanece unida hasta Separar', async ({
  page,
}, info) => {
  await start(page);
  const nodes = await addLibrary(page, 'check-mark');
  expect(nodes.length).toBeGreaterThan(1);
  expect((await world(page)).canvasGroups![0]!.component).toBe(true);
  const part = page.locator(`[data-node="${nodes[0]!.id}"]`);
  await part.click();
  expect((await snapshot(page)).ui.canvas.selections.sort()).toEqual(nodes.map((n) => n.id).sort());
  const box = (await part.boundingBox())!;
  await moveMaterial(page, nodes[0]!.id, box.x + box.width / 2 + 100, box.y + box.height / 2 + 60);
  const moved = await world(page);
  for (const node of nodes) {
    const result = moved.nodes.find((n) => n.id === node.id)!;
    expect(result.x - node.x).toBeCloseTo(100, 1);
    expect(result.y - node.y).toBeCloseTo(60, 1);
  }
  await page.getByRole('button', { name: 'Separar conjunto', exact: true }).click();
  await expect.poll(async () => (await world(page)).canvasGroups?.length ?? 0).toBe(0);
  await page.mouse.click(1100, 300);
  const current = (await part.boundingBox())!;
  await moveMaterial(
    page,
    nodes[0]!.id,
    current.x + current.width / 2 + 140,
    current.y + current.height / 2 + 80,
  );
  const separated = await world(page);
  expect(separated.nodes.find((n) => n.id === nodes[1]!.id)).toEqual(
    moved.nodes.find((n) => n.id === nodes[1]!.id),
  );
  await capture(page, info, 'separacion-intencional');
});

test('C08-B165: campos conservan aire real al compilar y las acciones del curso preceden su contenido', async ({
  page,
}, info) => {
  await start(page);
  for (const [id, text] of [
    ['combobox', 'Asignar a'],
    ['textarea', 'Descripción'],
  ]) {
    const nodes = await addLibrary(page, id!);
    const label = nodes.find(
      (node) =>
        node.data.kind === 'wireframe' &&
        node.data.content.type === 'text' &&
        node.data.content.text === text,
    )!;
    const background = nodes.find(
      (node) => node.data.kind === 'wireframe' && node.data.title.startsWith('Fondo ·'),
    )!;
    expect(label.x - background.x).toBeGreaterThanOrEqual(12);
    expect(label.y - background.y).toBeGreaterThanOrEqual(12);
    expect(background.x + background.width - label.x - label.width).toBeGreaterThanOrEqual(12);
    await capture(page, info, 'margen-' + id);
  }
  // Mantener Canvas abierto conserva la traza real de inserción para el verificador.
  const catalogue = await page.context().newPage();
  const errors: string[] = [];
  catalogue.on('pageerror', (error) => errors.push(error.message));
  try {
    await catalogue.goto('/design/wireframe-library/?family=screens&text=labels');
    const course = catalogue.locator('[data-id=video-course]');
    for (const width of [720, 420, 280]) {
      const summary = course.locator('summary');
      if (!(await course.locator('[data-width]').isVisible())) await summary.click();
      await course.locator('[data-width]').fill(String(width));
      const previous = (await course
        .locator('.app-course-navigation .wf-btn')
        .first()
        .boundingBox())!;
      const next = (await course.locator('.app-course-navigation .wf-btn').last().boundingBox())!;
      const content = (await course.locator('.app-course').boundingBox())!;
      if (width === 720) {
        expect(Math.abs(previous.y - next.y)).toBeLessThan(1);
        expect(previous.x + previous.width).toBeLessThan(next.x);
      } else
        expect(previous.y + previous.height <= next.y || previous.x + previous.width < next.x).toBe(
          true,
        );
      expect(Math.max(previous.y + previous.height, next.y + next.height)).toBeLessThan(content.y);
    }
    expect(errors).toEqual([]);
  } finally {
    await catalogue.close();
  }
});
