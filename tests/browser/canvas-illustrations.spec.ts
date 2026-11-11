import { test, expect } from './fixtures';
import { capture, connect, start, world } from './canvas-utility-helpers';

test('C08-B211: buscar por atajo, cambiar una tinta, deshacer y recuperar la paleta después de recargar @development', async ({
  page,
}, info) => {
  await start(page);
  await page.keyboard.press('i');
  const picker = page.getByRole('dialog', { name: 'Ilustraciones', exact: true });
  const search = picker.getByRole('button', { name: 'Buscar ilustración' });
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await expect(picker.getByRole('button', { name: 'Camión', exact: true })).toBeFocused();
  const count = await picker.locator('[data-illustration]').count();
  expect(count).toBeGreaterThan(150);
  const sources = await picker.locator('.illustration-grid img').evaluateAll(async (imgs) => {
    const urls = new Set(imgs.map((el) => (el as HTMLImageElement).src));
    await Promise.all(
      [...urls].map(async (url) => {
        const image = new Image();
        image.src = url;
        await image.decode();
      }),
    );
    return urls.size;
  });
  expect(sources).toBe(count);
  const originalView = page.viewportSize()!;
  await page.setViewportSize({ width: 390, height: 640 });
  const compact = await picker.boundingBox();
  expect(compact!.width).toBeLessThan(300);
  expect(compact!.y + compact!.height).toBeLessThanOrEqual(640);
  const category = picker.getByRole('combobox', { name: 'Filtrar por categoría' });
  const close = picker.getByRole('button', { name: 'Cerrar' });
  const [s, f, c] = await Promise.all([
    search.boundingBox(),
    category.boundingBox(),
    close.boundingBox(),
  ]);
  expect([s!.width, s!.height]).toEqual([c!.width, c!.height]);
  expect(f!.x).toBeGreaterThanOrEqual(s!.x + s!.width);
  expect(c!.x).toBeGreaterThanOrEqual(f!.x + f!.width);
  await category.selectOption('Salud y ciencia');
  await expect(picker.getByRole('button', { name: 'Termómetro', exact: true })).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Camión', exact: true })).toBeHidden();
  await search.click();
  const input = picker.getByRole('searchbox');
  await input.fill('reparto');
  await expect(picker.getByRole('status')).toHaveText('Sin coincidencias.');
  await input.fill('frio');
  await expect(picker.locator('[data-illustration]:visible')).toHaveCount(1);
  expect(await input.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
  await input.press('Escape');
  await expect(category).toHaveValue('Salud y ciencia');
  await capture(page, info, 'ilustraciones-por-categoria');
  await category.selectOption('');
  await page.setViewportSize(originalView);
  await search.click();
  await input.fill('fresa');
  await expect(picker.locator('[data-illustration]:visible')).toHaveCount(1);
  await input.press('Escape');
  await expect(search).toBeFocused();
  await expect(picker.locator('[data-illustration]:visible')).toHaveCount(count);
  await search.click();
  await input.fill('no-existe-xyz');
  await expect(picker.getByRole('status')).toHaveText('Sin coincidencias.');
  await input.fill('reparto');
  await input.press('Enter');
  await page.keyboard.press('Enter');
  const truck = page.getByRole('article', { name: 'Camión', exact: true });
  const picture = truck.locator('img');
  await expect(picture).toHaveAttribute('data-asset', 'fluent-flat-v1-delivery-truck');
  const pixels = () =>
    picture.evaluate(async (el) => {
      const im = el as HTMLImageElement;
      await im.decode();
      const surface = document.createElement('canvas');
      surface.width = surface.height = 64;
      const ctx = surface.getContext('2d')!;
      ctx.drawImage(im, 0, 0, 64, 64);
      const bytes = ctx.getImageData(0, 0, 64, 64).data;
      const count = (r: number, g: number, b: number) =>
        Array.from({ length: 4096 }, (_, n) => 4 * n).filter(
          (i) => bytes[i] === r && bytes[i + 1] === g && bytes[i + 2] === b,
        ).length;
      return [count(255, 130, 45), count(80, 40, 230), count(38, 201, 252)];
    });
  const original = await pixels();
  expect(original[0]).toBeGreaterThan(5);
  expect(original[2]).toBeGreaterThan(5);
  const colors = page.getByRole('dialog', { name: 'Colores de la ilustración' });
  const edit = async () => {
    await truck.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Editar colores…' }).click();
  };
  await edit();
  // El diálogo de color es nativo del sistema. Comprobamos su evento y los píxeles que produjo.
  await colors.getByLabel('Cambiar color #ff822d').evaluate((el) => {
    (el as HTMLInputElement).value = '#5028e6';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await capture(page, info, 'editar-color-camion');
  await colors.getByRole('button', { name: 'Aplicar' }).click();
  await expect.poll(pixels).toEqual([0, original[0], original[2]]);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await expect.poll(pixels).toEqual(original);
  await page.getByRole('button', { name: 'Rehacer · Ctrl+Shift+Z', exact: true }).click();
  await page.reload();
  await edit();
  await expect(colors.getByLabel('Cambiar color #ff822d')).toHaveValue('#5028e6');
  await colors.getByRole('button', { name: 'Restablecer' }).click();
  await colors.getByRole('button', { name: 'Aplicar' }).click();
  await expect.poll(pixels).toEqual(original);
});

test('C08-B209: colocar ilustraciones y reemplazar una imagen girada conserva su conexión y el historial @development', async ({
  page,
}, info) => {
  await start(page);
  const trigger = page.getByRole('button', { name: 'Incorporar materiales', exact: true });
  const open = async () => {
    await trigger.click();
    await page.getByRole('button', { name: 'Ilustraciones', exact: true }).click();
    return page.getByRole('dialog', { name: 'Ilustraciones' });
  };
  let picker = await open();
  const stage = page.locator('.canvas-stage'),
    box = (await stage.boundingBox())!;
  const point = { x: 245, y: 178 };
  await picker
    .getByRole('button', { name: 'Camión', exact: true })
    .dragTo(stage, { targetPosition: point });
  const truck = page.getByRole('article', { name: 'Camión', exact: true });
  await expect(truck).toBeVisible();
  const bounds = (await truck.boundingBox())!;
  expect(Math.abs(box.x + point.x - bounds.x - bounds.width / 2)).toBeLessThan(2);
  expect(Math.abs(box.y + point.y - bounds.y - bounds.height / 2)).toBeLessThan(2);
  const id = (await truck.getAttribute('data-node'))!;
  picker = await open();
  await expect(picker.getByRole('button', { name: 'Camión', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const other = page.getByRole('article', { name: 'Caja', exact: true });
  await expect(other).toBeVisible();
  await connect(page, id, (await other.getAttribute('data-node'))!, 'Entrega');
  await truck.click();
  await page
    .getByRole('button', { name: 'Girar selección', exact: true })
    .press('Shift+ArrowRight');
  const before = await world(page),
    original = before.nodes.find((n) => n.id === id)!;
  const replace = async () => {
    await truck.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Reemplazar imagen…' }).click();
    return page.getByRole('dialog', { name: 'Reemplazar imagen' });
  };
  picker = await replace();
  await picker
    .locator('input[type=file]')
    .setInputFiles({ name: 'rota.png', mimeType: 'image/png', buffer: Buffer.from('truncado') });
  await expect(picker.getByRole('status')).toContainText('Formato');
  expect((await world(page)).nodes).toEqual(before.nodes);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="blue"/></svg>';
  await picker
    .locator('input[type=file]')
    .setInputFiles({ name: 'paisaje.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
  await expect(picker).toHaveCount(0);
  const replaced = await world(page),
    edited = replaced.nodes.find((n) => n.id === id)!;
  expect(edited.width / edited.height).toBe(2);
  expect(edited.x + edited.width / 2).toBe(original.x + original.width / 2);
  expect(edited.y + edited.height / 2).toBe(original.y + original.height / 2);
  expect(edited.rotation).toBe(15);
  expect(replaced.links).toEqual(before.links);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes).toEqual(before.nodes);
  await page.getByRole('button', { name: 'Rehacer · Ctrl+Shift+Z', exact: true }).click();
  await page.reload();
  expect((await world(page)).nodes).toEqual(replaced.nodes);
  await expect
    .poll(() => truck.locator('img').evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBe(200);
  picker = await replace();
  await capture(page, info, 'reemplazar-ilustracion');
  await picker.getByRole('button', { name: 'Termómetro', exact: true }).click();
  await expect(truck.locator('img')).toHaveAttribute('data-asset', 'fluent-flat-v1-thermometer');
});

test('C08-B210: dos diseños anotados se pueden leer, editar y recuperar por separado del viaje @development', async ({
  page,
}, info) => {
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 800 });
    // Cada tamaño abre una composición sin guardado previo; cambiar la ventana conserva las ediciones.
    await page.goto('/design/composicion-visual/?escena=etiquetas');
    const text = page.locator('[data-node=propuesta-frio] .canvas-text-run');
    await expect(text).toHaveText('Conservar a 4 °C');
    for (const part of ['producto', 'frio', 'peso', 'fruta']) {
      const styles = await page.evaluate(
        (part) =>
          ['actual', 'propuesta'].map((id) => {
            const node = document.querySelector<HTMLElement>(`[data-node=${id}-${part}]`)!;
            const paper = document.querySelector<HTMLElement>(`[data-node=${id}-papel]`)!;
            const el = node.querySelector('.canvas-text-run, img')!;
            const style = getComputedStyle(el);
            const a = node.getBoundingClientRect(),
              b = paper.getBoundingClientRect();
            return {
              x: a.x - b.x,
              y: a.y - b.y,
              width: a.width,
              height: a.height,
              text: el.textContent,
              asset: el.getAttribute('data-asset'),
              color: style.color,
              font: style.fontFamily,
              size: style.fontSize,
              weight: style.fontWeight,
            };
          }),
        part,
      );
      const [a, b] = styles;
      expect(a!.x).toBeCloseTo(b!.x, 1);
      expect(a!.y).toBeCloseTo(b!.y, 1);
      expect(a!.width).toBeCloseTo(b!.width, 1);
      expect(a!.height).toBeCloseTo(b!.height, 1);
      expect([a!.text, a!.asset, a!.font, a!.size, a!.color]).toEqual([
        b!.text,
        b!.asset,
        b!.font,
        b!.size,
        b!.color,
      ]);
      if (part === 'frio') expect([a!.weight, b!.weight]).toEqual(['400', '700']);
      else expect(a!.weight).toEqual(b!.weight);
    }
    const left = (await page.locator('[data-node=actual-papel]').boundingBox())!,
      right = (await page.locator('[data-node=propuesta-papel]').boundingBox())!;
    if (width === 390) expect(right.y).toBeGreaterThan(left.y + left.height);
    else expect(right.x).toBeGreaterThan(left.x + left.width);
    for (const id of ['actual', 'propuesta']) {
      const note = page.locator(`[data-node=${id}-observacion] .canvas-text-run`);
      await expect(note).toBeInViewport({ ratio: 0.99 });
      const geometry = await note.evaluate((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        const lines = r.getClientRects(),
          last = lines[lines.length - 1]!;
        const hit = document.elementFromPoint(
          last.left + last.width / 2,
          last.top + last.height / 2,
        );
        return { height: last.height, hit: el.contains(hit) };
      });
      expect(geometry.height).toBeGreaterThan(12);
      expect(geometry.hit).toBe(true);
    }
    await capture(page, info, 'etiquetas-' + width);
    await text.dblclick();
    const field = page.getByRole('textbox', { name: 'Texto en Canvas' });
    await field.fill('6 °C');
    await field.press('Escape');
    await page.reload();
    await expect(text).toHaveText('6 °C');
    await expect(page.locator('[data-node=actual-frio] .canvas-text-run')).toHaveText(
      'Conservar a 4 °C',
    );
    await page.goto('/design/composicion-visual/?escena=viaje');
    await expect(page.locator('[data-node=camion] img')).toHaveAttribute(
      'data-asset',
      'fluent-flat-v1-delivery-truck',
    );
    await expect(page.locator('[data-node=frio] .canvas-text-run')).toHaveText('4 °C en tránsito');
    if (width === 1024) {
      // Sólo la base de la comparación creada en este contexto aislado del test.
      await page.evaluate(
        () =>
          new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase('everett-review-etiquetas-peso');
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            req.onblocked = () => reject(Error('Base de comparación ocupada'));
          }),
      );
    }
  }
});
