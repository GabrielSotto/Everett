import { test, expect } from './fixtures';
import { start, world, snapshot, capture } from './canvas-utility-helpers';
import { addLibrary, openLibrary } from './sketch-library-helpers';
import { storedFixture } from './canvas-fixtures';

test('C08-B160: filtro compacto conserva categoría, selección, teclado y altura disponible', async ({
  page,
}, info) => {
  await start(page);
  const panel = await openLibrary(page);
  await panel.getByRole('tab', { name: 'Componentes', exact: true }).click();
  const filter = panel.getByRole('button', { name: 'Filtrar componentes' });
  const items = panel.locator('.library-items');
  const before = await items.boundingBox();
  await filter.click();
  await expect(panel.getByRole('menuitemradio', { name: 'Todos los componentes' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(filter).toBeFocused();
  await expect(filter).toHaveAttribute('title', 'Filtrar: Controles');
  await expect(panel.locator('[data-library-add=button]')).toBeVisible();
  await expect(panel.locator('[data-library-add=sidebar]')).toHaveCount(0);
  const after = await items.boundingBox();
  expect(after!.y).toBeCloseTo(before!.y, 1);
  expect(after!.height).toBeCloseTo(before!.height, 1);
  await filter.click();
  await page.keyboard.press('Escape');
  await expect(panel).toBeVisible();
  await expect(filter).toBeFocused();
  await panel.getByRole('tab', { name: 'Interfaces', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Filtrar interfaces' })).toBeVisible();
  await expect(panel.locator('[data-library-add]')).toHaveCount(24);
  await panel.getByRole('tab', { name: 'Componentes', exact: true }).click();
  await expect(filter).toHaveAttribute('title', 'Filtrar: Controles');
  for (const width of [550, 320]) {
    await page.setViewportSize({ width, height: 668 });
    await filter.click();
    const menu = await panel.getByRole('menu', { name: 'Familia de componentes' }).boundingBox();
    expect(menu!.x).toBeGreaterThanOrEqual(0);
    expect(menu!.x + menu!.width).toBeLessThanOrEqual(width);
    await capture(page, info, 'filtro-compacto-' + width);
    await page.keyboard.press('Escape');
  }
});

test('C08-B161: seleccionar una interfaz pequeña conserva nombre y acceso a separar durante zoom', async ({
  page,
}, info) => {
  // Mantener el marco completo en pantalla incluso al 100 %: el encabezado sigue
  // su objeto y no debe fijarse al viewport cuando el usuario lo deja fuera.
  await page.setViewportSize({ width: 1440, height: 1200 });
  await start(page);
  await addLibrary(page, 'booking-mobile');
  const fixture = await snapshot(page);
  const project = fixture.state.worlds.find((item) => item.id === 'scout')!;
  const group = project.canvasGroups![0]!;
  group.name = 'Reserva móvil para visitas al estudio';
  // El mismo material guardado, ya seleccionado, en una cámara de revisión alejada.
  const left = Math.min(...project.nodes.map((node) => node.x));
  const right = Math.max(...project.nodes.map((node) => node.x + node.width));
  const top = Math.min(...project.nodes.map((node) => node.y));
  const bottom = Math.max(...project.nodes.map((node) => node.y + node.height));
  project.nodes.forEach((node) => {
    node.x -= (left + right) / 2;
    node.y -= (top + bottom) / 2;
  });
  fixture.state.camera = { x: 0, y: 0, z: 0.17 };
  fixture.ui.canvas.selections = [...group.nodes];
  await storedFixture(page, fixture.state, fixture.ui);
  await page.reload();
  const header = page.locator(`[data-group="${group.id}"]`);
  const name = header.locator('.group-name');
  const separate = header.getByRole('button', { name: 'Separar conjunto', exact: true });
  for (const value of [17, 38, 60, 100, 17]) {
    await page.getByRole('button', { name: /^Zoom de Canvas:/ }).click();
    const input = page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true });
    await input.fill(String(value));
    await input.press('Enter');
    await expect(separate).toBeVisible();
    await expect(header).toHaveCSS('opacity', '1');
    expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(
      await separate.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }),
    ).toBe(true);
  }
  await capture(page, info, 'interfaz-seleccionada-al-17');
  const before = await world(page);
  await separate.click();
  await expect.poll(async () => (await world(page)).canvasGroups?.length ?? 0).toBe(0);
  expect((await world(page)).nodes).toEqual(before.nodes);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await world(page)).canvasGroups?.length).toBe(1);
});
