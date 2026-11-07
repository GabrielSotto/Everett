import { test, expect } from './fixtures';
import { start, snapshot, world, capture, reference, connect } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { openSurface, assignMaterial } from './interaction-helpers';

test('C08-B55: búsqueda dentro de cabecera, botones compactos y switch opcional persistente', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  await expect(page.getByRole('button', { name: 'Superficies', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  const setting = page.getByRole('switch', { name: 'Mostrar botón de Superficies', exact: true });
  await expect(setting).toHaveAttribute('aria-checked', 'false');
  await setting.press('Space');
  await expect(setting).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await expect(page.getByRole('button', { name: 'Superficies', exact: true })).toBeVisible();
  const measurements = [];
  for (const width of [1440, 801, 800, 799, 564, 390, 300]) {
    await page.setViewportSize({ width, height: 700 });
    await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
    await expect(
      page.getByRole('textbox', { name: 'Buscar en Everett', exact: true }),
    ).toBeFocused();
    const samples = await page.evaluate(async () => {
      const entries = [];
      for (let n = 0; n < 20; n++) {
        await new Promise(requestAnimationFrame);
        const header = document.querySelector('.shell')!.getBoundingClientRect();
        const field = document.querySelector('.global-search')!.getBoundingClientRect();
        const trigger = document.querySelector('[data-action=search]')!.getBoundingClientRect();
        entries.push({ header: header.toJSON(), field: field.toJSON(), trigger: trigger.toJSON() });
      }
      return entries;
    });
    expect(
      samples.every(
        (s) =>
          s.field.top >= s.header.top &&
          s.field.bottom <= s.header.bottom &&
          s.field.left >= 0 &&
          s.field.right <= width,
      ),
    ).toBe(true);
    expect(
      Math.max(...samples.map((s) => s.trigger.x)) - Math.min(...samples.map((s) => s.trigger.x)),
    ).toBeLessThan(2);
    for (const name of ['Superficies', 'Estado'])
      await expect(page.getByRole('button', { name, exact: true })).toBeInViewport();
    const history = await page
      .locator('[data-action=canvas-undo],[data-action=canvas-redo]')
      .evaluateAll((elements) =>
        elements.map((el) => ({
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        })),
      );
    expect(history.every((r) => r.width <= 28 && r.height <= 28)).toBe(true);
    measurements.push({ width, samples, history });
    await page.keyboard.press('Escape');
    for (const name of [
      'Everett',
      'Bosquejos',
      'Alinear selección',
      'Vista y ajustes de Canvas',
      'Buscar en Everett',
      'Superficies',
      'Estado',
      'Perfil de Gabi',
    ])
      await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
  }
  await capture(page, info, 'cabecera-a-300');
  const searchButton = page.getByRole('button', { name: 'Buscar en Everett', exact: true });
  await searchButton.click();
  const belowHeader = await page.locator('.global-search').evaluate((el) => {
    const input = el as HTMLElement,
      original = input.getAttribute('style');
    input.style.position = 'fixed';
    input.style.top = '75px';
    const header = document.querySelector('.shell')!.getBoundingClientRect(),
      rect = input.getBoundingClientRect();
    const invalid = rect.bottom > header.bottom;
    if (original === null) input.removeAttribute('style');
    else input.setAttribute('style', original);
    return invalid;
  });
  expect(belowHeader, 'El control negativo debe detectar la búsqueda fuera de la cabecera').toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await info.attach('geometria-cabecera', {
    body: JSON.stringify(measurements),
    contentType: 'application/json',
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  await setting.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Superficies', exact: true })).toHaveCount(0);
  await openSurface(page, 'Docs');
  await expect(page.locator('#doc-body')).toBeVisible();
});

test('C08-B56: formas reversibles, opacidad dentro del color y etiquetas con Enter/Esc y borrado', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  for (const shape of ['Rectángulo', 'Elipse', 'Triángulo', 'Estrella']) {
    await page.getByRole('button', { name: 'Formas', exact: true }).click();
    await page.getByRole('button', { name: shape, exact: true }).click();
    await expect(page.locator('.shape-menu')).toHaveCount(0);
    await page.getByRole('button', { name: 'Formas', exact: true }).click();
    await expect(page.locator('#scene')).toHaveAttribute('data-tool', 'select');
  }
  await page.getByRole('button', { name: 'Formas', exact: true }).click();
  await page.getByRole('button', { name: 'Rectángulo', exact: true }).click();
  await page.locator('#draw-color').click();
  const picker = page.getByRole('dialog', { name: 'Color de relleno', exact: true });
  await expect(picker).toBeVisible();
  await picker.locator('#picker-rgb').fill('#ff0000');
  await picker.locator('#picker-rgb').press('Tab');
  await picker.getByRole('slider', { name: 'Opacidad', exact: true }).fill('50');
  await picker.getByRole('slider', { name: 'Opacidad', exact: true }).press('Escape');
  await page.mouse.move(430, 220);
  await page.mouse.down();
  await page.mouse.move(650, 380, { steps: 8 });
  await page.mouse.up();
  const shape = (await world(page)).nodes.at(-1)!;
  expect(shape.data.kind === 'shape' && shape.data.color).toBe('#ff000080');
  await expect(page.locator(`[data-node="${shape.id}"] .shape-art`)).toHaveAttribute(
    'fill',
    '#ff000080',
  );
  await capture(page, info, 'forma-semitransparente');
  await page.getByRole('button', { name: 'Crear nota · N', exact: true }).click();
  await page.mouse.click(950, 300);
  const note = (await world(page)).nodes.at(-1)!;
  await connect(page, shape.id, note.id, 'Relaciona');
  const link = (await world(page)).links.at(-1)!;
  const hit = page.locator(`[data-link="${link.id}"] .link-hit`);
  await hit.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-label] button')).toHaveCount(0);
  await expect(page.locator('[data-label] [type=submit]')).toHaveCount(0);
  await page.getByLabel('Etiqueta de conexión', { exact: true }).fill('Cancelado');
  await page.keyboard.press('Escape');
  expect((await world(page)).links.at(-1)!.label).toBe('Relaciona');
  await hit.focus();
  await page.keyboard.press('Backspace');
  await expect(page.locator('dialog.removal-dialog')).toHaveCount(0);
  expect((await world(page)).links).toHaveLength(0);
  await page.keyboard.press('Control+z');
  expect((await world(page)).links.at(-1)!.label).toBe('Relaciona');
});

test('C08-B57: conjunto manual se renombra, arrastra, recupera y separa sin borrar materiales', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  const input = await snapshot(page),
    project = input.state.worlds.find((w) => w.id === 'scout')!;
  project.nodes = [0, 1, 2].map((i) => ({
    id: 'g-' + i,
    x: -420 + i * 260,
    y: -100,
    width: 200,
    height: 150,
    owner: null,
    data: { kind: 'note', title: 'Decisión ' + i, text: 'Contenido ' + i, color: '#e4efdf' },
  }));
  project.zones = [
    {
      id: 'manual-zone',
      agent: project.agents[0]!.id,
      name: 'Revisión',
      x: 550,
      y: -100,
      width: 300,
      height: 250,
    },
  ];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await page.mouse.move(270, 270);
  await page.mouse.down();
  await page.mouse.move(1060, 570, { steps: 12 });
  await page.mouse.up();
  expect((await snapshot(page)).ui.canvas.selections).toHaveLength(3);
  await page.locator('[data-node=g-0]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Crear conjunto', exact: true }).click();
  const group = (await world(page)).canvasGroups![0]!;
  const header = page.locator(`[data-group="${group.id}"]`);
  const grip = header.locator('.group-grip');
  await header.focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Renombrar conjunto', exact: true }).click();
  await page.getByLabel('Nombre del conjunto', { exact: true }).fill('Arquitectura');
  await page.getByLabel('Nombre del conjunto', { exact: true }).press('Enter');
  const before = (await world(page)).nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }));
  const box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 75, box.y + 65, { steps: 10 });
  await page.mouse.up();
  const after = (await world(page)).nodes;
  expect(
    after.every(
      (n, i) => Math.abs(n.x - before[i]!.x - 65) < 1 && Math.abs(n.y - before[i]!.y - 55) < 1,
    ),
  ).toBe(true);
  await page.keyboard.press('Control+z');
  expect((await world(page)).nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }))).toEqual(before);
  await page.keyboard.press('Control+Shift+z');
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await expect(header).toHaveText(/Arquitectura/);
  await capture(page, info, 'conjunto-manual');
  for (const zoom of [0.4, 0.1, 1]) {
    const current = (await snapshot(page)).camera.z;
    await page.mouse.move(720, 480);
    await page.mouse.wheel(0, -Math.log(zoom / current) / 0.00165);
    await expect.poll(async () => (await snapshot(page)).camera.z).toBeCloseTo(zoom, 3);
    // En el panorama diminuto la identificación se consulta por foco, sin
    // imponer un encabezado mayor que el conjunto de forma permanente.
    await page.locator(`[data-group="${group.id}"]`).focus();
    // El zoom repinta el encabezado; resolver y medir el nodo vigente en el mismo frame.
    await expect
      .poll(() =>
        page.evaluate((id) => {
          const el = document.querySelector(`[data-group="${CSS.escape(id)}"]`),
            plane = document.querySelector('#canvas-plane');
          if (!el || !plane) return false;
          const rect = el.getBoundingClientRect(),
            font =
              parseFloat(getComputedStyle(el).fontSize) *
              Number(getComputedStyle(plane).getPropertyValue('--canvas-zoom'));
          return (
            Number.isFinite(font) &&
            font >= 12 &&
            el.contains(
              document.elementFromPoint(
                rect.x + Math.min(rect.width / 2, 35),
                rect.y + rect.height / 2,
              ),
            )
          );
        }, group.id),
      )
      .toBe(true);
  }
  await assignMaterial(page, 'g-0');
  expect((await world(page)).canvasGroups![0]!.nodes).toEqual(group.nodes);
  const blockedBox = (await grip.boundingBox())!;
  const blockedBefore = (await world(page)).nodes;
  await page.mouse.move(blockedBox.x + 10, blockedBox.y + 10);
  await page.mouse.down();
  await page.mouse.move(blockedBox.x + 70, blockedBox.y + 60, { steps: 8 });
  await page.mouse.up();
  expect((await world(page)).nodes).toEqual(blockedBefore);
  await page.locator('[data-zone=manual-zone]').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Devolver Decisión 0 al Canvas', exact: true }).click();
  expect((await world(page)).canvasGroups![0]!.nodes).toEqual(group.nodes);
  await page.getByRole('button', { name: 'Cerrar panel de zona', exact: true }).click();
  await header.focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Separar conjunto', exact: true }).click();
  expect((await world(page)).canvasGroups).toHaveLength(0);
  expect((await world(page)).nodes).toHaveLength(3);
});

test('C08-B58: referencias a secciones y funciones abren el origen preciso y detectan cambios', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  const input = await snapshot(page),
    project = input.state.worlds.find((w) => w.id === 'scout')!;
  project.docs[0]!.body =
    'Introducción\n\nDecisión de persistencia\nGuardar los bytes en IndexedDB.\n\nOtros acuerdos.';
  project.files[0]!.text =
    'export function first() { return 1; }\n\nexport function persist() { return true; }\n';
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  for (const kind of ['document', 'file'] as const) {
    const source = kind === 'document' ? project.docs[0]! : project.files[0]!;
    const id = await reference(page, kind, source.id, kind === 'document' ? 470 : 900, 330);
    await page.locator(`[data-node="${id}"]`).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Mostrar un fragmento…', exact: true }).click();
    const content = page.getByRole('textbox', { name: 'Contenido de origen', exact: true });
    const text = await content.inputValue(),
      quote =
        kind === 'document'
          ? 'Decisión de persistencia'
          : 'export function persist() { return true; }';
    await content.focus();
    await expect(content).toBeFocused();
    await content.press('x');
    await expect(content).toHaveValue(text);
    // Una única sesión de teclado conserva la selección nativa del lector de origen.
    await page.keyboard.press('Control+Home');
    for (let n = 0; n < text.indexOf(quote); n++) await page.keyboard.press('ArrowRight');
    for (let n = 0; n < quote.length; n++) await page.keyboard.press('Shift+ArrowRight');
    expect(
      await content.evaluate((el: HTMLTextAreaElement) =>
        el.value.slice(el.selectionStart, el.selectionEnd),
      ),
    ).toBe(quote);
    await page.getByRole('button', { name: 'Usar selección', exact: true }).click();
    await expect(page.locator('.fragment-picker')).toHaveCount(0);
    expect((await world(page)).referenceAnchors?.at(-1)?.quote).toBe(quote);
    await expect(page.locator(`[data-node="${id}"]`)).toContainText(quote);
    await expect(
      page.locator(`[data-node="${id}"] > ${kind === 'document' ? 'p' : 'pre'}`),
    ).toHaveText(quote);
    if (kind === 'document') {
      await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
      await page
        .getByRole('textbox', { name: 'Buscar en Everett', exact: true })
        .fill('Otros acuerdos');
      await expect(
        page.locator(`#global-results [data-surface=docs][data-id="${source.id}"]`),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
    }
    const contrast = await page.locator(`[data-node="${id}"] .fragment-state`).evaluate((el) => {
      const luminance = (color: string) => {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((n) => n / 255)
          .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
        return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
      };
      const foreground = luminance(getComputedStyle(el).color),
        background = luminance(getComputedStyle(el.closest('.material')!).backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await page.locator(`[data-node="${id}"]`).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
    const editor = page.locator(kind === 'document' ? '#doc-body' : '#code-editor');
    await expect(editor).toBeFocused();
    expect(
      await editor.evaluate((el: HTMLTextAreaElement) =>
        el.value.slice(el.selectionStart, el.selectionEnd),
      ),
    ).toBe(quote);
    await editor.press('Control+Home');
    await editor.press('Home');
    await editor.press('Enter');
    await page.keyboard.press('Escape');
    await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'scout/canvas/');
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
    const node = (await world(page)).nodes.find((n) => n.id === id)!;
    expect(node.data.kind === 'reference' && node.data.ref.fragment).toBeTruthy();
    await page.locator(`[data-node="${id}"]`).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
    expect(
      await editor.evaluate((el: HTMLTextAreaElement) =>
        el.value.slice(el.selectionStart, el.selectionEnd),
      ),
    ).toBe(quote);
    await editor.press('Backspace');
    await page.keyboard.press('Escape');
    await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'scout/canvas/');
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
    await expect(page.locator(`[data-node="${id}"] .fragment-state`)).toHaveText(
      'Fragmento no disponible',
    );
  }
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'scout/canvas/');
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await expect(page.locator('.fragment-state')).toHaveText([
    'Fragmento no disponible',
    'Fragmento no disponible',
  ]);
  await capture(page, info, 'fragmentos-no-disponibles');
});
