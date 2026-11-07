import { test, expect } from './fixtures';
import { start, world, capture } from './canvas-utility-helpers';
import { openLibrary, librarySearch, libraryTile } from './sketch-library-helpers';

test('C08-B153: búsqueda lateral sin saltos ni filtros ocultos y switch de rótulos coherente con preview e inserción', async ({
  page,
}, info) => {
  await start(page);
  const panel = await openLibrary(page);
  const toggle = panel.getByRole('button', { name: 'Buscar en la biblioteca', exact: true });
  const labels = panel.getByRole('switch', { name: 'Mostrar rótulos', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(panel.getByRole('searchbox')).toHaveCount(0);
  await expect(panel.getByRole('tab', { name: 'Piezas', exact: true })).toBeFocused();
  await expect(labels).not.toBeChecked();
  await panel.locator('.library-items').hover();
  await page.mouse.wheel(0, 500);
  const scrolled = await panel.locator('.library-items').evaluate((el) => el.scrollTop);
  expect(scrolled).toBeGreaterThan(100);
  await labels.click();
  await expect(panel.locator('.library-items')).toHaveJSProperty('scrollTop', scrolled);
  await labels.click();
  await panel.getByRole('tab', { name: 'Componentes', exact: true }).click();
  const familyFilter = panel.getByRole('button', { name: 'Filtrar componentes' });
  await familyFilter.click();
  await panel.getByRole('menuitemradio', { name: 'Navegación', exact: true }).click();
  const category = await panel
    .locator('[data-library-add]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-library-add')));

  for (const width of [1440, 550, 320]) {
    await page.setViewportSize({ width, height: 720 });
    const items = (await panel.locator('.library-items').boundingBox())!;
    const button = (await toggle.boundingBox())!;
    const track = panel.locator('.library-search');
    const frames = track.evaluate(
      (el) =>
        new Promise<{ width: number; right: number }[]>((resolve) => {
          const values: { width: number; right: number }[] = [];
          const until = performance.now() + 700;
          const sample = () => {
            const r = el.getBoundingClientRect();
            values.push({ width: r.width, right: r.right });
            if (performance.now() < until) requestAnimationFrame(sample);
            else resolve(values);
          };
          sample();
        }),
    );
    await toggle.click();
    const measured = await frames;
    const widths = measured.map((f) => f.width);
    expect(
      widths.some((w) => w > 32 && w < 220),
      'apertura con posiciones intermedias',
    ).toBe(true);
    expect(
      Math.max(...measured.map((f) => f.right)) - Math.min(...measured.map((f) => f.right)),
      'anclaje derecho estable',
    ).toBeLessThan(1);
    expect(Math.max(...widths)).toBeLessThanOrEqual(232);
    await expect(panel.getByRole('searchbox')).toBeFocused();
    expect((await panel.locator('.library-items').boundingBox())!.y).toBeCloseTo(items.y, 0);
    expect((await toggle.boundingBox())!.x).toBeCloseTo(button.x, 0);
    // Buscar no ocupa una fila propia ni empuja el catálogo; el campo queda en la cabecera.
    const field = (await panel.getByRole('searchbox').boundingBox())!;
    expect(field.x + field.width).toBeLessThanOrEqual(button.x + 1);
    expect(field.y + field.height).toBeLessThan(items.y);
    await panel.getByRole('searchbox').pressSequentially('carrusel');
    await expect(panel.locator('[data-library-add=carousel]')).toBeVisible();
    await expect(panel.locator('[data-library-add]')).toHaveCount(1);
    await panel.getByRole('searchbox').press('Enter');
    expect((await world(page)).nodes).toHaveLength(0);
    await capture(page, info, 'busqueda-' + width);
    await toggle.click();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(familyFilter).toHaveAttribute('title', 'Filtrar: Navegación');
    expect(
      await panel
        .locator('[data-library-add]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-library-add'))),
    ).toEqual(category);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await toggle.press('Enter');
  await expect(panel.locator('.library-search')).toHaveCSS('transition-duration', '0s');
  await panel.getByRole('searchbox').fill('inexistente-zz');
  await expect(panel.getByText(/No hay coincidencias/)).toBeVisible();
  await panel.getByRole('searchbox').press('Escape');
  await expect(toggle).toBeFocused();
  await expect(familyFilter).toHaveAttribute('title', 'Filtrar: Navegación');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);

  const tile = await libraryTile(page, 'button');
  const thumb = panel.locator('[data-thumbnail=button]');
  await expect(thumb.locator('.library-text-bar')).toHaveCount(1);
  await labels.press('Space');
  await expect(labels).toBeChecked();
  await expect(thumb.locator('.library-text-bar')).toHaveCount(0);
  await expect(thumb.locator('.library-text')).toHaveText('Continuar');
  await labels.press('Enter');
  await expect(labels).not.toBeChecked();
  await expect(thumb.locator('.library-text-bar')).toHaveCount(1);
  await labels.click();
  await tile.click();
  await expect(page.locator('.material .library-text')).toHaveText('Continuar');
  await openLibrary(page);
  await expect(labels).toBeChecked();
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.sketch-library')!.style.fontSize = '26px';
  });
  await expect(labels).toBeInViewport();
  await expect(labels.locator('.library-switch-track')).toBeInViewport();
  const tabs = panel.getByRole('tab');
  for (const tab of await tabs.all()) {
    expect(
      await tab.evaluate((el) => el.scrollWidth <= el.clientWidth),
      'rótulo completo dentro de cada pestaña',
    ).toBe(true);
  }
  const firstPiece = panel.getByRole('button', { name: 'Agregar Bloque rectangular', exact: true });
  await firstPiece.focus();
  await firstPiece.press('ArrowDown');
  await expect(
    panel.getByRole('button', { name: 'Agregar Forma redondeada', exact: true }),
  ).toBeFocused();
  await expect(panel.locator('.library-tile-name').first()).toHaveJSProperty(
    'scrollWidth',
    await panel
      .locator('.library-tile-name')
      .first()
      .evaluate((el) => el.clientWidth),
  );
  const wrap = await labels.boundingBox(),
    knob = await labels.locator('.library-switch-track').boundingBox();
  expect(knob!.x + knob!.width).toBeLessThan(wrap!.x + wrap!.width);
  await capture(page, info, 'rotulos-texto-ampliado');
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.sketch-library')!.style.fontSize = '';
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await capture(page, info, 'biblioteca-compacta');
  await (await librarySearch(page)).fill('botón');
  await labels.click();
  await panel.locator('[data-library-add=button]').click();
  await expect(page.locator('.material .library-text-bar')).toHaveCount(1);
});
