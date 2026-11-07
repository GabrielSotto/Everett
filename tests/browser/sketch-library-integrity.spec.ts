import { test, expect } from './fixtures';
import { start, world, snapshot, capture, moveMaterial } from './canvas-utility-helpers';
import { addLibrary, libraryTile, openLibrary, dragLibrary } from './sketch-library-helpers';
import { entries } from '../../design/wireframe-library/samples.js';
import { storedFixture } from './canvas-fixtures';

test('C08-B150: biblioteca sin red después de cargar conserva miniaturas, hora, inserción y arrastre', async ({
  page,
  context,
}, info) => {
  await start(page);
  await context.setOffline(true);
  try {
    const panel = await openLibrary(page);
    for (const id of ['block', 'symbol', 'button', entries.find((e) => /hora/i.test(e.name))!.id]) {
      await libraryTile(page, id);
      await expect(panel.locator(`[data-thumbnail="${id}"]`)).toHaveAttribute('data-ready', 'true');
      await expect(panel.getByText('Vista previa no disponible')).toHaveCount(0);
    }
    const nodes = await addLibrary(page, entries.find((e) => /hora/i.test(e.name))!.id);
    expect(nodes.length).toBeGreaterThan(3);
    await dragLibrary(page, 'button', 1100, 420);
    const current = await world(page);
    expect(current.canvasGroups).toHaveLength(2);
    expect(current.nodes.every((n) => n.data.kind === 'wireframe')).toBe(true);
    await capture(page, info, 'biblioteca-disponible-sin-red');
  } finally {
    await context.setOffline(false);
  }
});

test('C08-B151: tocar, mover, escalar, copiar y borrar un componente conserva sus partes hasta desagrupar', async ({
  page,
}, info) => {
  await start(page);
  const fixture = await snapshot(page);
  const project = fixture.state.worlds.find((item) => item.id === 'scout')!;
  project.zones = [
    {
      id: 'component-zone',
      agent: project.agents[0]!.id,
      name: 'Revisión',
      x: 40,
      y: 110,
      width: 200,
      height: 180,
    },
  ];
  await storedFixture(page, fixture.state, fixture.ui);
  await page.reload();
  const created = await addLibrary(page, 'button');
  // El botón no debe incorporar la hoja blanca ni el espacio de exhibición del catálogo.
  expect(created).toHaveLength(2);
  expect(Math.max(...created.map((n) => n.width))).toBeLessThan(150);
  expect(
    created.some((n) => n.data.kind === 'wireframe' && n.data.title.startsWith('Fondo ·')),
  ).toBe(false);
  const text = created.find((n) => n.data.kind === 'wireframe' && n.data.content.type === 'text')!;
  const part = page.locator(`[data-node="${text.id}"]`);
  await part.click();
  expect((await snapshot(page)).ui.canvas.selections.sort()).toEqual(
    created.map((n) => n.id).sort(),
  );
  await part.dblclick();
  await expect(page.locator('.wireframe-editor')).toHaveCount(0);
  const box = (await part.boundingBox())!;
  await moveMaterial(page, text.id, box.x + box.width / 2 + 80, box.y + box.height / 2 + 60);
  let moved = await world(page);
  for (const node of created) {
    const current = moved.nodes.find((n) => n.id === node.id)!;
    expect(current.x - node.x).toBeCloseTo(80, 1);
    expect(current.y - node.y).toBeCloseTo(60, 1);
  }
  const handle = page.locator('[data-resize=group][data-corner=se]');
  const rect = (await handle.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2 + 100, rect.y + rect.height / 2 + 30, {
    steps: 10,
  });
  await page.mouse.up();
  const scaled = await world(page);
  expect(scaled.nodes.find((n) => n.id === text.id)!.width).toBeGreaterThan(text.width);
  const scale = scaled.nodes[0]!.width / moved.nodes[0]!.width;
  for (const node of moved.nodes)
    expect(scaled.nodes.find((n) => n.id === node.id)!.width / node.width).toBeCloseTo(scale, 4);
  await handle.focus();
  await page.keyboard.press('Shift+ArrowRight');
  const keyboardScaled = await world(page);
  expect(keyboardScaled.nodes[0]!.width).toBeGreaterThan(scaled.nodes[0]!.width);
  await expect(handle).toBeFocused();
  await page.keyboard.press('Control+z');
  expect((await world(page)).nodes).toEqual(scaled.nodes);
  await part.click();
  await page.keyboard.press('Control+d');
  expect((await world(page)).nodes).toHaveLength(created.length * 2);
  expect((await world(page)).canvasGroups!.every((g) => g.component)).toBe(true);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await world(page)).nodes.length).toBe(created.length);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await world(page)).nodes.length).toBe(created.length * 2);
  await page.reload();
  expect((await world(page)).canvasGroups!.every((g) => g.component)).toBe(true);
  // La copia queda encima del original: usar su texto para la separación explícita.
  const copy = (await world(page)).nodes.find(
    (n) =>
      !created.some((o) => o.id === n.id) &&
      n.data.kind === 'wireframe' &&
      n.data.content.type === 'text',
  )!;
  await page.locator(`[data-node="${copy.id}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Desagrupar componente', exact: true }).click();
  await page.locator(`[data-node="${copy.id}"]`).click();
  expect((await snapshot(page)).ui.canvas.selections).toEqual([copy.id]);
  await page.locator(`[data-node="${copy.id}"]`).dblclick();
  await expect(
    page.getByRole('textbox', { name: 'Contenido del bosquejo', exact: true }),
  ).toBeVisible();
  await capture(page, info, 'piezas-editables-tras-desagrupar');
  await page.keyboard.press('Escape');
  // Asignar el componente original debe transferir todas sus partes, sin tocar la copia separada.
  await page.locator(`[data-node="${text.id}"]`).press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Asignar a una zona', exact: false }).click();
  await page.getByRole('menuitem', { name: 'Resumir', exact: true }).click();
  const assigned = await world(page);
  expect(
    assigned.nodes
      .filter((n) => n.owner)
      .map((n) => n.id)
      .sort(),
  ).toEqual(created.map((n) => n.id).sort());
  expect(assigned.canvasGroups).toHaveLength(1);
});

test('C08-B152: alineación conserva controles visibles y habilita según unidades seleccionadas', async ({
  page,
}, info) => {
  await start(page);
  await page.getByRole('button', { name: 'Alinear selección', exact: true }).click();
  await expect(page.locator('.arrangement-spacing')).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Separación horizontal' })).toBeDisabled();
  await expect(page.getByText('Seleccioná al menos dos elementos', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');
  await addLibrary(page, 'button');
  await page.getByRole('button', { name: 'Alinear selección', exact: true }).click();
  await expect(page.locator('.arrangement-spacing')).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Separación horizontal' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+d');
  const frames = await page.locator('[data-component]').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    }),
  );
  await page.mouse.move(
    Math.min(...frames.map((r) => r.x)) - 20,
    Math.min(...frames.map((r) => r.y)) - 60,
  );
  await page.mouse.down();
  await page.mouse.move(
    Math.max(...frames.map((r) => r.right)) + 20,
    Math.max(...frames.map((r) => r.bottom)) + 20,
    { steps: 10 },
  );
  await page.mouse.up();
  const selected = await snapshot(page);
  await page.locator(`[data-node="${selected.ui.canvas.selection}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Alinear y distribuir', exact: false }).click();
  await expect(page.locator('.arrangement-spacing')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Alinear selección', exact: true }).click();
  await expect(page.locator('.arrangement-spacing')).toBeVisible();
  await expect(page.getByText('Separación exacta', { exact: false })).toHaveCount(0);
  await expect(
    page.getByRole('menuitem', { name: 'Alinear a la izquierda', exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole('menuitem', { name: 'Espaciar horizontalmente', exact: true }),
  ).toBeDisabled();
  await capture(page, info, 'alineacion-contextual');
  const before = (await world(page)).nodes;
  await page.getByRole('spinbutton', { name: 'Separación horizontal' }).fill('73');
  await page.keyboard.press('Escape');
  await expect(page.locator('.arrangement-spacing')).toHaveCount(0);
  expect((await world(page)).nodes).toEqual(before);
  await expect(page.getByRole('button', { name: 'Alinear selección', exact: true })).toBeFocused();
});
