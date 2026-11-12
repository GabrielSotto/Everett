import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { start, capture, world, moveMaterial, snapshot } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { newCanvasText } from '../../src/domain/canvas-text';

async function palette(page: Page) {
  const tools = page.getByRole('toolbar', { name: 'Creación, organización y vista de Canvas' });
  const trigger = tools.getByRole('button', { name: 'Gráficos explicativos', exact: true });
  await expect(trigger).toBeInViewport({ ratio: 1 });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByRole('dialog', { name: 'Incorporar materiales', exact: true }),
  ).toHaveCount(0);
  return page.getByRole('dialog', { name: 'Gráficos explicativos', exact: true });
}
const pickerNames = ['sequence', 'cycle', 'comparison', 'anatomy'] as const;
test('C08-B214: crear y editar cuatro formatos, comparar lo mismo y deshacer la inserción sin tocar el trabajo anterior', async ({
  page,
}, info) => {
  await start(page);
  await page.setViewportSize({ width: 375, height: 600 });
  const narrow = await palette(page);
  const rect = (await narrow.boundingBox())!;
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(375);
  expect(rect.y + rect.height).toBeLessThanOrEqual(600);
  await narrow.locator('[data-graphic=anatomy]').hover();
  await capture(page, info, 'menu-estrecho');
  await narrow.getByRole('button', { name: /Imagen anotada/ }).click();
  await expect(narrow).toHaveCount(0);
  await expect(page.locator('.canvas-stage .canvas-leaders .link-line')).toHaveCount(3);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await expect(page.locator('.canvas-stage .material')).toHaveCount(0);
  await page.setViewportSize({ width: 800, height: 670 });
  for (const kind of pickerNames) {
    const panel = await palette(page);
    await expect(panel.locator('.graphic-thumb > svg')).toHaveCount(20);
    if (kind === 'sequence') await capture(page, info, 'menu-de-graficos');
    await panel.locator('[data-graphic=' + kind + ']').click();
    await expect(panel).toHaveCount(0);
    const stage = page.locator('.canvas-stage');
    const imgs = stage.locator('.material.image img');
    await expect(imgs).toHaveCount({ sequence: 3, cycle: 4, comparison: 2, anatomy: 1 }[kind]);
    await expect
      .poll(() =>
        imgs.evaluateAll((es) =>
          es.every((e) => e instanceof HTMLImageElement && e.complete && e.naturalWidth > 64),
        ),
      )
      .toBe(true);
    await page.mouse.move(5, 75);
    const runs = stage.locator('.canvas-text-run');
    const labels = await runs.evaluateAll((els) =>
      els.map((e) => {
        const r = document.createRange();
        r.selectNodeContents(e);
        const box = r.getBoundingClientRect();
        return { text: e.textContent, x: box.x, y: box.y, right: box.right, bottom: box.bottom };
      }),
    );
    for (const [i, a] of labels.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.right).toBeLessThanOrEqual(800);
      expect(a.y).toBeGreaterThan(52);
      expect(a.bottom).toBeLessThan(610);
      for (const b of labels.slice(i + 1))
        expect(
          a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y,
          a.text + ' / ' + b.text,
        ).toBe(true);
    }
    if (kind === 'comparison') {
      const y = (text: string) => labels.find((l) => l.text === text)!.y;
      expect(Math.abs(y('Puerta a puerta') - y('Entre estaciones'))).toBeLessThan(2);
      expect(Math.abs(y('Elegís la salida') - y('Según el servicio'))).toBeLessThan(2);
    }
    await capture(page, info, 'grafico-' + kind);
    if (kind === 'anatomy') {
      await expect(stage.locator('.canvas-leaders .link-line')).toHaveCount(3);
      await runs.filter({ hasText: /^Manubrio$/ }).dblclick();
      const edit = page.getByRole('textbox', { name: 'Texto en Canvas' });
      await edit.fill('Dirección');
      await edit.press('Escape');
      await page.reload();
      await expect(
        stage.locator('.canvas-text-run').filter({ hasText: /^Dirección$/ }),
      ).toBeVisible();
      await expect(imgs).toHaveCount(1);
      break;
    }
    await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
    await expect(stage.locator('.material')).toHaveCount(0);
    await expect(stage.locator('[data-link]')).toHaveCount(0);
  }
});
test('C08-B215: enlazar materiales propios en orden espacial y cambiar las puntas sin perder el anclaje ni la etiqueta', async ({
  page,
}, info) => {
  await start(page);
  await (await palette(page)).locator('[data-graphic=comparison]').click();
  const pictures = page.locator('.material.image');
  await expect(pictures).toHaveCount(2);
  const before = await world(page);
  await pictures.nth(1).click();
  await pictures.nth(0).click({ modifiers: ['Shift'] });
  const p = await palette(page);
  await expect(p.getByRole('button', { name: 'En ciclo', exact: true })).toHaveCount(0);
  await p.getByRole('button', { name: 'En secuencia', exact: true }).click();
  const group = page.locator('.connection[data-link]');
  await expect(group).toHaveCount(1);
  const created = await world(page),
    link = created.links[0]!;
  expect(created.nodes).toEqual(before.nodes);
  expect(created.nodes.find((n) => n.id === link.from)!.x).toBeLessThan(
    created.nodes.find((n) => n.id === link.to)!.x,
  );
  const hit = group.locator('.link-hit'),
    line = group.locator('.link-line');
  await hit.focus();
  await page.keyboard.press('Enter');
  const field = page.getByLabel('Etiqueta de conexión', { exact: true });
  await field.fill('Transbordo');
  await field.press('Enter');
  await hit.focus();
  await page.keyboard.press('Space');
  const both = page.getByRole('button', { name: 'Flechas en ambos extremos' });
  await both.click();
  await expect(both).toHaveAttribute('aria-pressed', 'true');
  await expect(line).toHaveAttribute('marker-start', /url/);
  await expect(line).toHaveAttribute('marker-end', /url/);
  await capture(page, info, 'sentido-del-cable');
  const d = await line.getAttribute('d');
  const b = (await pictures.first().boundingBox())!;
  await moveMaterial(page, link.from, b.x + b.width / 2 - 30, b.y + b.height / 2 - 65);
  await expect(line).not.toHaveAttribute('d', d!);
  await page.reload();
  await expect(group.locator('text')).toHaveText('Transbordo');
  await expect(line).toHaveAttribute('marker-end', /url/);
  await expect(line).toHaveAttribute('marker-start', /url/);
  const existing = await world(page);
  await page
    .locator('.canvas-text-run')
    .filter({ hasText: /^Recorrido$/ })
    .click();
  await pictures.nth(0).click({ modifiers: ['Shift'] });
  await pictures.nth(1).click({ modifiers: ['Shift'] });
  await (await palette(page)).getByRole('button', { name: 'En ciclo', exact: true }).click();
  await expect(group).toHaveCount(3);
  const loop = await world(page);
  expect(loop.nodes).toEqual(existing.nodes);
  expect(loop.links.filter((l) => l.label === 'Transbordo')).toEqual(existing.links);
  const ends = loop.links.flatMap((l) => [l.from, l.to]);
  expect(new Set(ends).size).toBe(3);
  for (const id of new Set(ends)) expect(ends.filter((v) => v === id)).toHaveLength(2);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await expect(group).toHaveCount(1);
  expect((await world(page)).links).toEqual(existing.links);
});

test('C08-B216: señalar un punto propio; la llamada sigue la tinta durante movimiento, giro y escala y admite otro destino', async ({
  page,
}, info) => {
  await start(page);
  await (await palette(page)).locator('[data-graphic=comparison]').click();
  const bike = page
    .getByRole('article', { name: 'Bicicleta', exact: true })
    .filter({ has: page.locator('img') });
  await expect(bike).toBeVisible();
  const box = (await bike.boundingBox())!,
    at = { x: box.x + box.width * 0.28, y: box.y + box.height * 0.69 };
  async function open() {
    await page.mouse.click(at.x, at.y, { button: 'right' });
    await page.getByRole('menuitem', { name: 'Señalar un detalle…' }).click();
    return page.getByRole('textbox', { name: 'Rótulo del detalle' });
  }
  const first = await open();
  await first.fill('Descartado');
  await first.press('Escape');
  await expect(page.locator('.canvas-leaders .connection')).toHaveCount(0);
  const field = await open();
  await field.fill('Rueda delantera');
  await field.press('Enter');
  const ink = page.locator('.canvas-leaders .link-line');
  async function tip() {
    return ink.evaluate((el) => {
      const p = el as SVGPathElement,
        pt = p.getPointAtLength(p.getTotalLength()).matrixTransform(p.getScreenCTM()!);
      return { x: pt.x, y: pt.y };
    });
  }
  // Un trazo horizontal tiene una caja geométrica sin alto aunque sí pinte y reciba clics.
  await expect(ink).toHaveCSS('stroke', 'rgb(255, 209, 139)');
  expect(await ink.evaluate((e) => (e as SVGPathElement).getTotalLength())).toBeGreaterThan(30);
  const initial = await tip();
  expect(Math.hypot(initial.x - at.x, initial.y - at.y)).toBeLessThan(2);
  const id = (await bike.getAttribute('data-node'))!;
  await moveMaterial(page, id, box.x + box.width / 2 + 47, box.y + box.height / 2 - 35);
  const testSpot = async () => {
    const b = (await bike.boundingBox())!,
      theta = await bike.evaluate(
        (el) => ((parseFloat(getComputedStyle(el).rotate) || 0) * Math.PI) / 180,
      );
    const side = b.width / (Math.abs(Math.cos(theta)) + Math.abs(Math.sin(theta)));
    const x = (0.28 - 0.5) * side,
      y = (0.69 - 0.5) * side;
    const expected = {
      x: b.x + b.width / 2 + x * Math.cos(theta) - y * Math.sin(theta),
      y: b.y + b.height / 2 + x * Math.sin(theta) + y * Math.cos(theta),
    };
    const end = await tip();
    expect(Math.hypot(end.x - expected.x, end.y - expected.y)).toBeLessThan(2.5);
  };
  await testSpot();
  await bike.click();
  await page
    .getByRole('button', { name: 'Girar selección', exact: true })
    .press('Shift+ArrowRight');
  await expect(bike).toHaveCSS('rotate', '15deg');
  await testSpot();
  const resize = page.locator('[data-id="' + id + '"][data-corner=se]');
  const b0 = (await bike.boundingBox())!;
  await resize.press('Shift+ArrowRight');
  await expect.poll(async () => (await bike.boundingBox())!.width).toBeGreaterThan(b0.width);
  await testSpot();
  const hit = page.locator('.canvas-leaders .link-hit');
  await hit.focus();
  await hit.press('Space');
  const dest = page.locator('.canvas-leaders [data-end=to] .endpoint-dot'),
    pos = (await dest.boundingBox())!,
    b = (await bike.boundingBox())!;
  const next = { x: b.x + b.width * 0.61, y: b.y + b.height * 0.42 };
  await page.mouse.move(pos.x + pos.width / 2, pos.y + pos.height / 2);
  await page.mouse.down();
  await page.mouse.move(next.x, next.y, { steps: 9 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const t = await tip();
      return Math.hypot(t.x - next.x, t.y - next.y);
    })
    .toBeLessThan(2.5);
  await page.reload();
  await expect(
    page.locator('.canvas-text-run').filter({ hasText: 'Rueda delantera' }),
  ).toBeVisible();
  const saved = await tip();
  expect(Math.hypot(saved.x - next.x, saved.y - next.y)).toBeLessThan(2.5);
  await capture(page, info, 'detalle-en-imagen-propia');
});

test('C08-B220: componer en el lugar con texto, ilustración y flecha sin pasar por una plantilla', async ({
  page,
}, info) => {
  await start(page);
  await page.setViewportSize({ width: 880, height: 680 });
  const choose = async (name: string) =>
    (await palette(page)).getByRole('button', { name, exact: true }).click();
  await choose('Texto');
  await page.mouse.click(180, 190);
  const editor = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await editor.fill('Entrada por el parque');
  await editor.press('Escape');
  const graphics = await palette(page);
  const illustrations = graphics.getByRole('button', { name: 'Ilustraciones', exact: true });
  await expect(illustrations.locator('kbd')).toHaveText(/^i$/i);
  await illustrations.click();
  const pictures = page.getByRole('dialog', { name: 'Ilustraciones', exact: true });
  await pictures.getByRole('button', { name: 'Camión', exact: true }).click();
  await expect(pictures).toHaveCount(0);
  await choose('Flecha curva');
  await page.mouse.move(210, 340);
  await page.mouse.down();
  await page.mouse.move(355, 330, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('.free-arrow')).toHaveCount(1);
  const scene = await world(page);
  expect(scene.nodes.map((n) => n.data.kind)).toEqual(['text', 'image', 'drawing']);
  expect(scene.links).toHaveLength(0);
  await page.reload();
  expect((await world(page)).nodes).toEqual(scene.nodes);
  await page.keyboard.press('i');
  await expect(pictures).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Gráficos explicativos', exact: true }),
  ).toBeFocused();
  const openGraphics = await palette(page);
  await openGraphics.getByRole('button', { name: 'Buscar plantilla' }).click();
  const search = openGraphics.getByRole('searchbox');
  await search.press('i');
  await expect(search).toHaveValue('i');
  await search.press('Escape');
  await page.keyboard.press('i');
  await expect(pictures).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Incorporar materiales' })
      .getByRole('button', { name: 'Ilustraciones' }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await capture(page, info, 'composicion-libre');
});

test('C08-B221: buscar por propósito, insertar cada composición y volver al lienzo previo', async ({
  page,
}, info) => {
  await start(page);
  await page.setViewportSize({ width: 830, height: 670 });
  const menu = await palette(page);
  await menu.getByRole('button', { name: 'Buscar plantilla' }).click();
  const field = menu.getByRole('searchbox');
  await field.fill('inexistente');
  await expect(menu.getByText('Sin coincidencias.')).toBeVisible();
  await field.fill('logo');
  await expect(menu.locator('[data-graphic]:visible')).toHaveCount(1);
  await field.press('Enter');
  await expect(menu.locator('[data-graphic=identity]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu.locator('[data-graphic]:visible')).toHaveCount(20);
  await page.keyboard.press('Escape');
  for (const key of [
    'decision',
    'timeline',
    'priority',
    'handoff',
    'hierarchy',
    'story',
    'identity',
    'bars',
  ]) {
    const panel = await palette(page);
    await panel.locator('[data-graphic="' + key + '"]').click();
    await expect(panel).toHaveCount(0);
    const scene = await world(page);
    if (key === 'bars') expect(scene.nodes.map((n) => n.data.kind)).toEqual(['text', 'bars']);
    else expect(scene.nodes.length).toBeGreaterThanOrEqual(4);
    await expect(page.locator('.canvas-stage .material')).toHaveCount(scene.nodes.length);
    const truncated = await page
      .locator('.canvas-stage .material.note > :is(h3,p)')
      .evaluateAll((parts) =>
        parts.filter((el) => el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent),
      );
    expect.soft(truncated, key).toEqual([]);
    if (key === 'decision') {
      await expect(page.locator('.cable-label')).toHaveText(['Sí', 'No']);
    }
    if (key === 'identity') {
      const circle = scene.nodes.find(
        (n) => n.data.kind === 'shape' && n.data.shape === 'ellipse',
      )!;
      const sail = scene.nodes.find((n) => n.data.kind === 'shape' && n.data.shape === 'triangle')!;
      expect(circle.x).toBeLessThan(sail.x);
      expect(circle.x + circle.width).toBeGreaterThan(sail.x + sail.width);
    }
    await capture(page, info, 'plantilla-' + key);
    await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
    await expect(page.locator('.canvas-stage .material')).toHaveCount(0);
  }
});

test('C08-B222: un valor edita la barra, la escala y el rótulo, incluso con cero y datos ausentes', async ({
  page,
}, info) => {
  await start(page);
  await page.setViewportSize({ width: 720, height: 650 });
  await (await palette(page)).locator('[data-graphic=bars]').click();
  const chart = page.locator('.canvas-stage .material.bars'),
    rows = chart.locator('[data-bar-row]');
  const widths = () =>
    rows
      .locator('[data-bar-mark]')
      .evaluateAll((rs) => rs.map((r) => Number(r.getAttribute('width'))));
  const initial = await widths();
  expect(initial).toHaveLength(4);
  await chart.dblclick();
  const form = page.getByRole('dialog', { name: 'Editar datos de barras' });
  await form.getByRole('spinbutton').first().fill('80');
  await form.getByRole('spinbutton').nth(2).fill('0');
  await form.getByRole('spinbutton').nth(3).fill('');
  await capture(page, info, 'editar-barras');
  await form.getByRole('button', { name: 'Aplicar' }).click();
  await expect(form).toHaveCount(0);
  await expect(rows.nth(0)).toContainText('80');
  await expect(rows.nth(3)).toContainText('Sin dato');
  const updated = await widths();
  expect(updated[1]).toBeCloseTo(initial[1]! / 2);
  expect(updated[0]).toBe(initial[0]);
  expect(updated[2]).toBe(0);
  await expect(rows.nth(3).locator('rect')).toHaveCount(0);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect(await widths()).toEqual(initial);
  await chart.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Editar datos…' }).click();
  await form.getByRole('spinbutton').nth(1).fill('-12.5');
  await form.getByRole('button', { name: 'Agregar fila' }).click();
  await form.getByRole('textbox').last().fill('A caballo');
  await form.getByRole('spinbutton').last().fill('4');
  await form.getByRole('button', { name: 'Aplicar' }).click();
  await page.reload();
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(1)).toContainText('-12,5');
  await expect(rows.last()).toContainText('A caballo');
  await capture(page, info, 'barras-con-signo');
});

test('C08-B225: crear un gráfico desde piezas históricas conserva el original y toma el número escrito', async ({
  page,
}) => {
  await start(page);
  const { state, ui } = await snapshot(page);
  const project = state.worlds.find((w) => w.id === 'scout')!;
  const base = (x: number, y: number, width: number) => ({
    id: 'e-' + ++state.seq,
    x,
    y,
    width,
    height: 36,
    owner: null,
  });
  function label(value: string, x: number, y: number, width: number) {
    project.nodes.push({ ...base(x, y, width), data: { ...newCanvasText('wrap'), text: value } });
  }
  label('Cómo llega el público', 30, 20, 420);
  label('Personas encuestadas', 30, 80, 360);
  for (const [i, category] of ['A pie', 'Bicicleta', 'Colectivo', 'Auto'].entries()) {
    const y = 138 + i * 58,
      width = 400 - 100 * i;
    label(category, 30, y, 130);
    project.nodes.push({
      ...base(180, y, width),
      data: { kind: 'shape', shape: 'rectangle', color: '#b5d3e4', title: category },
    });
    label(String(i === 0 ? 80 : width / 10), 194 + width, y, 64);
  }
  await storedFixture(page, state, ui);
  await page.reload();
  const source = (await world(page)).nodes;
  const firstBar = page.locator('[data-node="' + source[3]!.id + '"]');
  await firstBar.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Crear copia con datos vinculados' }).click();
  const form = page.getByRole('dialog', { name: 'Editar datos de barras' });
  await expect(form.getByRole('spinbutton').first()).toHaveValue('80');
  await form.getByRole('button', { name: 'Cerrar' }).click();
  const chart = page.locator('.canvas-stage .material.bars');
  const widths = await chart
    .locator('[data-bar-mark]')
    .evaluateAll((marks) => marks.map((m) => Number(m.getAttribute('width'))));
  expect(widths[1]! / widths[0]!).toBeCloseTo(30 / 80);
  expect((await world(page)).nodes.filter((n) => n.data.kind !== 'bars')).toEqual(source);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await expect(chart).toHaveCount(0);
  expect((await world(page)).nodes).toEqual(source);
});

for (const [number, keys] of [
  [223, ['floorplan', 'affinity', 'fishbone', 'concepts']],
  [224, ['exploded', 'journey', 'venn', 'moodboard']],
] as const) {
  test(`C08-B${number}: leer y modificar las plantillas de ${keys.join(', ')}`, async ({
    page,
  }, info) => {
    await start(page);
    await page.setViewportSize({ width: 830, height: 670 });
    for (const key of keys) {
      const panel = await palette(page);
      if (key === 'fishbone') {
        await panel.getByRole('button', { name: 'Buscar plantilla' }).click();
        await panel.getByRole('searchbox').fill('por qué falló una entrega');
        await expect(panel.locator('[data-graphic]:visible')).toHaveCount(1);
      }
      await panel.locator('[data-graphic=' + key + ']').click();
      await expect(panel).toHaveCount(0);
      await page.mouse.move(2, 65);
      const scene = await world(page);
      const stage = page.locator('.canvas-stage');
      await expect(stage.locator('.material')).toHaveCount(scene.nodes.length);
      expect(
        await stage
          .locator('.material.note > :is(h3,p)')
          .evaluateAll((parts) =>
            parts.filter((el) => el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent),
          ),
        key,
      ).toEqual([]);
      if (key === 'affinity') {
        expect(scene.canvasGroups?.map((g) => [g.name, g.nodes.length])).toEqual([
          ['Encontrar el acceso', 2],
          ['Entender el precio', 2],
        ]);
      }
      if (key === 'journey')
        await expect(
          stage.locator('.canvas-text-run').filter({ hasText: 'Abandonó al elegir la fila' }),
        ).toBeVisible();
      if (key === 'venn') {
        const ellipses = stage.locator('.material.shape-material');
        const a = (await ellipses.nth(0).boundingBox())!,
          b = (await ellipses.nth(1).boundingBox())!;
        const both = stage.locator('.canvas-text-run').filter({ hasText: 'Bicicleta' });
        const r = (await both.boundingBox())!;
        expect(r.x + r.width / 2).toBeGreaterThan(b.x);
        expect(r.x + r.width / 2).toBeLessThan(a.x + a.width);
      }
      if (key === 'moodboard') await expect(stage.locator('.material.image img')).toHaveCount(3);
      if (key === 'concepts')
        await expect(stage.locator('.cable-label')).toHaveText([
          'dan',
          'tienen',
          'reduce',
          'retienen',
          'disminuye',
        ]);
      if (key === 'floorplan' || key === 'fishbone' || key === 'exploded') {
        const paths = stage.locator('.link-line');
        for (const path of await paths.all())
          expect(await path.getAttribute('d')).toMatch(/^M [^C]+ L /);
        if (key === 'floorplan') {
          // La ruta debe quedar visible y su etiqueta entre los extremos, aun dentro del contorno de un predio.
          const north = (await stage
            .getByRole('article', { name: 'Límite norte', exact: true })
            .boundingBox())!;
          const south = (await stage
            .getByRole('article', { name: 'Límite sur', exact: true })
            .boundingBox())!;
          for (const label of await stage.locator('.cable-label').all()) {
            const box = (await label.boundingBox())!;
            expect(box.y).toBeGreaterThan(north.y);
            expect(box.y + box.height).toBeLessThan(south.y);
          }
        }
      }
      await capture(page, info, 'plantilla-' + key);
      if (key === 'exploded' || key === 'fishbone') {
        const node = scene.nodes.find((n) =>
          n.data.kind === 'note'
            ? n.data.title === 'Humedad'
            : n.data.kind === 'image' && n.data.title === 'Fotografía',
        )!;
        const link = scene.links.find((l) => l.from === node.id || l.to === node.id)!;
        const path = stage.locator('[data-link="' + link.id + '"] .link-line');
        const before = await path.getAttribute('d'),
          rect = (await stage.locator('[data-node="' + node.id + '"]').boundingBox())!;
        await moveMaterial(
          page,
          node.id,
          rect.x + rect.width / 2 + 30,
          rect.y + rect.height / 2 - 28,
        );
        await expect(path).not.toHaveAttribute('d', before!);
        await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
        await expect(path).toHaveAttribute('d', before!);
      }
      await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
      await expect(stage.locator('.material')).toHaveCount(0);
    }
  });
}
