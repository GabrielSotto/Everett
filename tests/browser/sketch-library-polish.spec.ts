import { test, expect } from './fixtures';
import { start, world, capture, moveMaterial } from './canvas-utility-helpers';
import {
  openLibrary,
  librarySearch,
  libraryTile,
  addLibrary,
  dragLibrary,
} from './sketch-library-helpers';

test('C08-B154: switch y búsqueda conservan miniaturas sin cuadros vacíos en las tres categorías', async ({
  page,
}, info) => {
  await start(page);
  const panel = await openLibrary(page);
  const labels = panel.getByRole('switch', { name: 'Mostrar rótulos' });
  const search = panel.getByRole('button', { name: 'Buscar en la biblioteca' });
  for (const tab of ['Piezas', 'Componentes', 'Interfaces']) {
    await panel.getByRole('tab', { name: tab, exact: true }).click();
    const visible = panel.locator('[data-thumbnail]').first();
    await expect(visible).toHaveAttribute('data-ready', 'true');
    const observation = panel.evaluate(
      (el) =>
        new Promise<{ blank: number; detached: number; scaled: number; samples: number }>(
          (resolve) => {
            const hosts = [...el.querySelectorAll<HTMLElement>('[data-thumbnail]')].filter(
              (h) => h.dataset.ready === 'true',
            );
            const row = el.querySelector<HTMLElement>('.library-text-mode')!;
            const result = { blank: 0, detached: 0, scaled: 0, samples: 0 };
            const until = performance.now() + 1800;
            const frame = () => {
              result.samples++;
              if (hosts.some((h) => !h.isConnected)) result.detached++;
              if (hosts.some((h) => !h.childElementCount || h.dataset.ready !== 'true'))
                result.blank++;
              if (!['none', '1'].includes(getComputedStyle(row).scale)) result.scaled++;
              if (performance.now() < until) requestAnimationFrame(frame);
              else resolve(result);
            };
            frame();
          },
        ),
    );
    const r = (await labels.boundingBox())!;
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await expect(labels).toHaveCSS('scale', '1');
    await page.mouse.up();
    await labels.click();
    await labels.click();
    await search.click();
    await search.click();
    await search.click();
    await panel.getByRole('searchbox').press('Escape');
    const result = await observation;
    expect(result.samples).toBeGreaterThan(8);
    expect(result.blank).toBe(0);
    expect(result.detached).toBe(0);
    expect(result.scaled).toBe(0);
    // Al quitar un filtro se recuperan también las tarjetas ya pintadas, sin esperas de red/layout.
    const first = await visible.getAttribute('data-thumbnail');
    await librarySearch(page);
    await panel.getByRole('searchbox').fill('zz-sin-resultados');
    await expect(panel.getByText(/No hay coincidencias/)).toBeVisible();
    await search.click();
    await expect(panel.locator(`[data-thumbnail="${first}"]`)).toHaveAttribute(
      'data-ready',
      'true',
    );
    await capture(page, info, 'continuidad-' + tab);
  }
});

test('C08-B155: previews con contornos uniformes, máscara convencional y texto transparente legible sobre claro y oscuro', async ({
  page,
}, info) => {
  await start(page);
  const panel = await openLibrary(page);
  for (const id of [
    'block',
    'rounded',
    'ellipse',
    'polygon',
    'path',
    'line',
    'arrow',
    'divider',
    'bar',
  ]) {
    await libraryTile(page, id);
    const thumb = panel.locator(`[data-thumbnail="${id}"]`);
    await expect(thumb).toHaveAttribute('data-ready', 'true');
    const widths = await thumb.evaluate((el) => {
      const strokes: number[] = [];
      for (const path of el.querySelectorAll<SVGPathElement>('svg path')) {
        const matrix = path.getScreenCTM()!;
        strokes.push(
          parseFloat(getComputedStyle(path).strokeWidth) * Math.hypot(matrix.a, matrix.b),
        );
      }
      for (const piece of el.querySelectorAll<HTMLElement>('[data-library-piece]')) {
        const style = getComputedStyle(piece),
          rect = piece.getBoundingClientRect();
        const scale = rect.width / parseFloat(style.width);
        for (const side of ['top', 'right', 'bottom', 'left']) {
          const border = parseFloat(style.getPropertyValue(`border-${side}-width`));
          if (border > 0) strokes.push(border * scale);
        }
        if (
          Math.max(rect.width / rect.height, rect.height / rect.width) > 4 &&
          style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          Math.min(rect.width, rect.height) < 10
        )
          strokes.push(Math.min(rect.width, rect.height));
      }
      return strokes;
    });
    expect(widths.length, id).toBeGreaterThan(0);
    for (const width of widths)
      expect(Math.abs(width - 2), id + ': grosor visible').toBeLessThan(0.3);
  }
  await libraryTile(page, 'mask');
  await expect(panel.locator('[data-thumbnail=mask] .library-mask-symbol')).toHaveCSS(
    'mask-image',
    /data:image\/svg\+xml/,
  );
  await capture(page, info, 'mascara-convencional');
  const labels = panel.getByRole('switch', { name: 'Mostrar rótulos' });
  for (const id of ['label', 'heading', 'paragraph']) {
    await libraryTile(page, id);
    const thumb = panel.locator(`[data-thumbnail="${id}"]`);
    await expect(thumb).toHaveAttribute('data-ready', 'true');
    for (let mode = 0; mode < 2; mode++) {
      for (const text of await thumb.locator('.library-text').all())
        await expect(text).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await labels.click();
    }
  }
  if (!(await labels.isChecked())) await labels.click();
  const texts = await addLibrary(page, 'paragraph');
  for (const n of texts) {
    const node = page.locator(`[data-node="${n.id}"] .library-text`);
    await expect(node).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(node).toHaveCSS('color', 'rgb(224, 231, 237)');
  }
  await capture(page, info, 'texto-sin-placa-sobre-canvas');
  // Fondo claro real, detrás del texto: usar los controles de capas.
  const tb = (await page.locator(`[data-node="${texts[0]!.id}"]`).boundingBox())!;
  const blocks = await dragLibrary(page, 'block', tb.x + tb.width / 2, tb.y + tb.height / 2);
  const block = page.locator(`[data-node="${blocks[0]!.id}"]`);
  await block.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Enviar al fondo', exact: true }).click();
  const b = (await block.boundingBox())!;
  const text = texts[0]!;
  await moveMaterial(page, text.id, b.x + b.width / 2, b.y + b.height / 2);
  await expect(page.locator(`[data-node="${text.id}"] .library-text`)).not.toHaveCSS(
    'text-shadow',
    'none',
  );
  await capture(page, info, 'texto-cruzando-fondos');
  await block.click({ position: { x: 8, y: 8 } });
  const handle = page.locator(`[data-resize=node][data-id="${blocks[0]!.id}"][data-corner=se]`);
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 + 350, h.y + h.height / 2 + 80, { steps: 10 });
  await page.mouse.up();
  const expanded = (await block.boundingBox())!;
  await moveMaterial(
    page,
    text.id,
    expanded.x + expanded.width / 2,
    expanded.y + expanded.height / 2,
  );
  await expect(page.locator(`[data-node="${text.id}"] .library-text`)).toHaveCSS(
    'color',
    'rgb(38, 50, 60)',
  );
  await page.reload();
  await expect(page.locator(`[data-node="${text.id}"] .library-text`)).toHaveCSS(
    'color',
    'rgb(38, 50, 60)',
  );
  await capture(page, info, 'texto-sin-placa-sobre-claro');
  const polygon = await addLibrary(page, 'polygon');
  expect(polygon[0]!.data.kind).toBe('wireframe');
  if (polygon[0]!.data.kind === 'wireframe')
    expect(polygon[0]!.data.content.piece!.paths![0]!.width).toBe(1.5);
  expect((await world(page)).nodes.length).toBeGreaterThan(texts.length);
});

test('C08-B156: foco de teclado visible, clic sin halo persistente y nombre ajustado a sus glifos', async ({
  page,
}, info) => {
  await start(page);
  const panel = await openLibrary(page);
  const toggle = panel.getByRole('button', { name: 'Buscar en la biblioteca' });
  await toggle.click();
  await expect(panel.locator('.library-search')).toHaveCSS('outline-style', 'none');
  await expect(panel.locator('.library-search')).toHaveCSS('box-shadow', /inset/);
  await toggle.click();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS('outline-style', 'none');
  await expect(panel.locator('.library-search')).toHaveCSS('box-shadow', 'none');
  await toggle.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS('outline-style', 'solid');
  await toggle.press('Enter');
  await panel.getByRole('searchbox').press('Escape');
  await expect(toggle).toHaveCSS('outline-style', 'solid');
  await capture(page, info, 'foco-teclado');
  await page.keyboard.press('Escape');
  const name = page.getByRole('textbox', { name: 'Nombre del mundo' });
  for (const title of [
    'iii ll',
    'Componer una pantalla',
    'Un proyecto con un nombre muy largo para trabajar en varias superficies',
  ]) {
    await name.fill(title);
    await name.press('Enter');
    await expect(name).toHaveValue(title);
    const m = await name.evaluate((el) => {
      const input = el as HTMLInputElement,
        css = getComputedStyle(input);
      const canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d')!;
      ctx.font = css.font;
      const r = input.getBoundingClientRect(),
        next = input.nextElementSibling!.getBoundingClientRect();
      return {
        width: r.width,
        natural: Math.min(
          parseFloat(css.maxWidth),
          Math.max(
            parseFloat(css.minWidth),
            ctx.measureText(input.value).width +
              parseFloat(css.paddingLeft) +
              parseFloat(css.paddingRight),
          ),
        ),
        gap: next.left - r.right,
      };
    });
    expect(m.gap).toBeGreaterThanOrEqual(5);
    expect(m.gap).toBeLessThanOrEqual(10);
    expect(m.width).toBeLessThanOrEqual(250);
    expect(Math.abs(m.width - m.natural)).toBeLessThan(3);
  }
  for (const width of [1440, 550, 320]) {
    await page.setViewportSize({ width, height: 720 });
    await expect(
      page.getByRole('button', { name: 'Buscar en Everett', exact: true }),
    ).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Bosquejos', exact: true })).toBeInViewport();
    await capture(page, info, 'cabecera-' + width);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const global = page.getByRole('button', { name: 'Buscar en Everett', exact: true });
  await global.click();
  await expect(page.locator('.global-search')).toHaveCSS('box-shadow', /inset/);
  await global.click();
  await expect(page.locator('.global-search')).toHaveCSS('box-shadow', 'none');
  await expect(global).toHaveCSS('outline-style', 'none');
  await page.reload();
  await expect(name).toHaveValue(
    'Un proyecto con un nombre muy largo para trabajar en varias superficies',
  );
});
