import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, snapshot, world, capture, reference, connect } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { dockChat, undockChat } from './interaction-helpers';

const ready = async (page: Page) =>
  expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
const opensLeft = (samples: { left: number }[]) =>
  samples.every((s, i) => i === 0 || s.left <= samples[i - 1]!.left + 0.8);

test('C08-B59: color visual, tono, alfa y HEX operan sin subdiálogos ni desbordes', async ({
  page,
}, info) => {
  await start(page);
  await page.getByRole('button', { name: 'Formas', exact: true }).click();
  await page.getByRole('button', { name: 'Rectángulo', exact: true }).click();
  await page.locator('#draw-color').click();
  const picker = page.getByRole('dialog', { name: 'Color de relleno', exact: true });
  const area = picker.getByRole('slider', { name: 'Saturación y brillo', exact: true });
  await expect(area).toBeFocused();
  const rect = (await area.boundingBox())!;
  expect(rect.width).toBeGreaterThan(180);
  expect(rect.height).toBeGreaterThanOrEqual(140);
  expect(await area.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain(
    'linear-gradient',
  );
  await area.evaluate(
    (el) => ((el as HTMLElement).style.height = (el as HTMLElement).style.flexBasis = '1px'),
  );
  expect((await area.boundingBox())!.height).toBeLessThan(140);
  await area.evaluate((el) => {
    (el as HTMLElement).style.removeProperty('height');
    (el as HTMLElement).style.removeProperty('flex-basis');
  });
  expect((await area.boundingBox())!.height).toBeGreaterThanOrEqual(140);
  await page.mouse.click(rect.x + rect.width * 0.8, rect.y + rect.height * 0.2);
  const first = (await snapshot(page)).ui.canvas.color;
  await area.press('Shift+ArrowLeft');
  expect((await snapshot(page)).ui.canvas.color).not.toBe(first);
  await picker.getByRole('slider', { name: 'Tono', exact: true }).fill('220');
  await picker.getByRole('slider', { name: 'Opacidad', exact: true }).fill('30');
  const hex = picker.getByRole('textbox', { name: 'Color hexadecimal', exact: true });
  await hex.fill('invalid');
  await hex.press('Enter');
  await expect(hex).toHaveAttribute('aria-invalid', 'true');
  await hex.fill('#ff0000');
  await hex.press('Enter');
  expect((await snapshot(page)).ui.canvas.color).toBe('#ff00004d');
  await area.focus();
  await area.press('n');
  await area.press('Backspace');
  expect((await snapshot(page)).ui.canvas.tool).toBe('rectangle');
  await expect(picker.locator('input[type=color]')).toHaveCount(0);
  for (const width of [390, 300]) {
    await page.setViewportSize({ width, height: 700 });
    await expect(picker).toBeInViewport();
    const overflow = await picker.evaluate((el) => ({
      width: el.clientWidth,
      scroll: el.scrollWidth,
      children: [...el.children].map((c) => ({
        tag: c.tagName,
        cls: c.className,
        width: c.getBoundingClientRect().width,
        x: c.getBoundingClientRect().x,
      })),
    }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
    expect((await area.boundingBox())!.height).toBeGreaterThanOrEqual(140);
  }
  await capture(page, info, 'selector-color-300');
  await area.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.mouse.move(420, 200);
  await page.mouse.down();
  await page.mouse.move(650, 370, { steps: 8 });
  await page.mouse.up();
  const shape = (await world(page)).nodes.at(-1)!;
  expect(shape.data.kind === 'shape' && shape.data.color).toBe('#ff00004d');
  await page.reload();
  await ready(page);
  expect((await world(page)).nodes.at(-1)!.data).toEqual(shape.data);
});

test('C08-B60: nombre directo y extracción del conjunto sin perseguir el arrastre', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [0, 1].map((i) => ({
    id: 'piece-' + i,
    x: -350 + i * 250,
    y: -80,
    width: 180,
    height: 140,
    owner: null,
    data: { kind: 'note' as const, title: 'Pieza ' + i, text: 'Conservar ' + i, color: '#e4efdf' },
  }));
  w.canvasGroups = [{ id: 'assembly', name: 'Conjunto sin nombre', nodes: ['piece-0', 'piece-1'] }];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  await page
    .getByRole('button', { name: 'Renombrar conjunto Conjunto sin nombre', exact: true })
    .click();
  await page.getByLabel('Nombre del conjunto', { exact: true }).fill('Arquitectura');
  await page.keyboard.press('Enter');
  const header = page.locator('[data-group=assembly]'),
    outline = page.locator('.canvas-manual-group');
  await expect(header).toContainText('Arquitectura');
  const head = (await header.boundingBox())!,
    frame = (await outline.boundingBox())!;
  expect(head.y + head.height).toBeLessThanOrEqual(frame.y + 2);
  const node = page.locator('[data-node=piece-0]'),
    box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 80, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 370, { steps: 12 });
  expect((await outline.boundingBox())!.height).toBeCloseTo(frame.height, 0);
  expect((await world(page)).canvasGroups![0]!.nodes).toHaveLength(2);
  await page.mouse.up();
  expect((await world(page)).canvasGroups![0]!.nodes).toEqual(['piece-1']);
  expect((await world(page)).nodes[0]!.data).toEqual(w.nodes[0]!.data);
  await page.keyboard.press('Control+z');
  expect((await world(page)).canvasGroups![0]!.nodes).toHaveLength(2);
  expect((await world(page)).nodes).toEqual(w.nodes);
  await node.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Sacar del conjunto', exact: true }).click();
  expect((await world(page)).canvasGroups![0]!.nodes).toEqual(['piece-1']);
  expect((await world(page)).nodes).toEqual(w.nodes);
  await capture(page, info, 'pieza-fuera-del-conjunto');
  await page.reload();
  await ready(page);
  expect((await world(page)).canvasGroups![0]!.nodes).toEqual(['piece-1']);
});

test('C08-B61: incorporar Docs y Code y elegir fragmentos con instrucción y preview', async ({
  page,
}, info) => {
  await start(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  const menu = page.locator('.reference-menu');
  for (const heading of ['Documentos de Docs', 'Archivos de Code', 'Tareas de Board'])
    await expect(menu.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  const source = (await world(page)).docs[0]!;
  const id = await reference(page, 'document', source.id, 500, 300);
  const material = page.locator(`[data-node="${id}"]`);
  await material.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Mostrar un fragmento…', exact: true }).click();
  const picker = page.locator('.fragment-picker');
  await expect(picker).toContainText('El documento original conserva todo su contenido');
  const submit = picker.getByRole('button', { name: 'Usar selección', exact: true });
  await expect(submit).toBeDisabled();
  const text = picker.getByRole('textbox', { name: 'Contenido de origen', exact: true });
  await text.press('Control+Home');
  for (let i = 0; i < 12; i++) await text.press('Shift+ArrowRight');
  await expect(picker.getByLabel('Fragmento elegido', { exact: true })).toHaveText(
    source.body.slice(0, 12),
  );
  await expect(submit).toBeEnabled();
  await capture(page, info, 'fragmento-elegido');
  await submit.click();
  expect((await world(page)).docs[0]!.body).toBe(source.body);
  expect((await world(page)).referenceAnchors!.at(-1)!.quote).toBe(source.body.slice(0, 12));
});

test('C08-B62: el tirador del chat no contrae y conserva tamaño, borrador y estados', async ({
  page,
}, info) => {
  await start(page);
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await dockChat(page);
  const chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
  const composer = chat.getByRole('textbox', { name: 'Escribí un mensaje…', exact: true });
  await composer.fill('No perder este borrador');
  await expect(chat.getByRole('button', { name: 'Anclar chat', exact: true })).toHaveCount(0);
  await expect(chat.locator('[data-action=chat-compact] svg')).not.toHaveAttribute(
    'data-icon',
    'down',
  );
  const before = (await chat.boundingBox())!,
    grip = (await chat.locator('.chat-grip').boundingBox())!;
  await page.mouse.move(grip.x + 6, grip.y + 6);
  await page.mouse.down();
  expect((await chat.boundingBox())!.height).toBeCloseTo(before.height, 0);
  expect((await snapshot(page)).ui.chat.chatMode).toBe('docked');
  await page.mouse.up();
  await undockChat(page);
  const after = (await chat.boundingBox())!;
  expect(after.height).toBeGreaterThanOrEqual(before.height - 2);
  expect(after.width).toBeCloseTo(before.width, 0);
  await expect(composer).toHaveValue('No perder este borrador');
  const clearTools = async () => {
    await expect
      .poll(async () => {
        const a = await chat.boundingBox(),
          b = await page.locator('.canvas-tools').boundingBox();
        // Resize puede reemplazar el DOM entre ambas mediciones; la ausencia nunca aprueba el acceso.
        if (!a || !b) return true;
        return (
          a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
        );
      })
      .toBe(false);
    for (const selector of [
      '[data-action=canvas-tool][data-tool=select]',
      '#canvas-chat-composer [type=submit]',
    ]) {
      const button = page.locator(selector);
      expect(
        await button.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        }),
      ).toBe(true);
    }
  };
  await clearTools();
  await capture(page, info, 'chat-desacoplado-sin-encoger');
  await chat.getByRole('button', { name: 'Contraer chat', exact: true }).click();
  await expect(chat.getByRole('button', { name: 'Desplegar chat', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await chat.getByRole('button', { name: 'Desplegar chat', exact: true }).click();
  await expect
    .poll(async () => (await chat.boundingBox())!.height)
    .toBeGreaterThanOrEqual(after.height - 2);
  await dockChat(page);
  await chat.locator('.chat-grip').press('ArrowRight');
  await expect(chat).toHaveClass(/quick/);
  await expect(composer).toHaveValue('No perder este borrador');
  await clearTools();
  for (const width of [801, 640, 390, 300]) {
    await page.setViewportSize({ width, height: 700 });
    await clearTools();
    await expect(composer).toHaveValue('No perder este borrador');
  }
  await capture(page, info, 'chat-y-dock-alcanzables-a-300');
  await page.reload();
  await ready(page);
  await expect(composer).toHaveValue('No perder este borrador');
});

test('C08-B63: configuración agrupada, cierre desde cabecera y búsqueda sin rebote', async ({
  page,
}, info) => {
  await start(page);
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await expect(page.locator('.profile-tabs button')).toHaveText(['Perfil', 'Configuración']);
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  await expect(page.getByLabel('Idioma de dictado')).toBeVisible();
  await page.getByRole('button', { name: 'Volver a Configuración', exact: true }).click();
  await page.getByRole('button', { name: 'Herramientas', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Exportar diagnóstico', exact: true }),
  ).toBeVisible();
  await page.locator('#shell').click({ position: { x: 600, y: 25 } });
  await expect(page.locator('.profile-pop')).toHaveCount(0);
  const measurements = [];
  for (const width of [1440, 801, 390, 300]) {
    await page.setViewportSize({ width, height: 900 });
    for (let cycle = 0; cycle < 2; cycle++) {
      // Registrar desde el clic captura la apertura, incluso al invertir un cierre en curso.
      await page.evaluate(() => {
        const data: { left: number; right: number; trigger: number }[] = [];
        (window as unknown as { searchSamples: typeof data }).searchSamples = data;
        const measure = () => {
          const r = document.querySelector('.global-search')!.getBoundingClientRect();
          const t = document.querySelector('[data-action=search]')!.getBoundingClientRect();
          data.push({ left: r.left, right: r.right, trigger: t.left });
          if (data.length < 35) requestAnimationFrame(measure);
        };
        document
          .querySelector('[data-action=search]')!
          .addEventListener('click', measure, { once: true, capture: true });
      });
      await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as unknown as { searchSamples: unknown[] }).searchSamples.length,
          ),
        )
        .toBe(35);
      const samples = await page.evaluate(
        () =>
          (
            window as unknown as {
              searchSamples: { left: number; right: number; trigger: number }[];
            }
          ).searchSamples,
      );
      expect(
        Math.max(...samples.map((s) => s.trigger)) - Math.min(...samples.map((s) => s.trigger)),
      ).toBeLessThan(1.5);
      await info.attach(`apertura-${width}-${cycle}`, {
        body: JSON.stringify(samples),
        contentType: 'application/json',
      });
      expect(opensLeft(samples), JSON.stringify({ width, cycle, samples })).toBe(true);
      const broken = structuredClone(samples);
      broken[10]!.left = broken[9]!.left + 20;
      expect(opensLeft(broken), 'El comparador debe detectar un rebote deliberado').toBe(false);
      measurements.push({ width, samples });
      await page.keyboard.press('Escape');
    }
  }
  await info.attach('busqueda-por-fotograma', {
    body: JSON.stringify(measurements),
    contentType: 'application/json',
  });
  await capture(page, info, 'cabecera-zoom-300');
});

test('C08-B64: zoom en cabecera, límites, encuadre, entradas inválidas y recuperación', async ({
  page,
}, info) => {
  await start(page);
  const source = (await world(page)).docs[0]!;
  const id = await reference(page, 'document', source.id, 500, 300);
  const zoom = page.locator('[data-action=canvas-zoom]');
  await expect(page.locator('#shell [data-action=canvas-zoom]')).toBeVisible();
  const choose = async (value: string) => {
    await zoom.click();
    const field = page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true });
    await field.fill(value);
    await field.press('Enter');
    if (value && Number(value) >= 1 && Number(value) <= 600)
      await expect
        .poll(async () => (await snapshot(page)).camera.z)
        .toBeCloseTo(Number(value) / 100, 5);
  };
  for (const value of ['', '0', '601']) {
    await choose(value);
    await expect(
      page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true }),
    ).toHaveAttribute('aria-invalid', 'true');
    expect((await snapshot(page)).camera.z).toBe(1);
    await page.keyboard.press('Escape');
  }
  await choose('1');
  await expect(zoom).toHaveAccessibleName('Zoom de Canvas: 1 %');
  expect((await snapshot(page)).camera.z).toBe(0.01);
  await page.mouse.move(1000, 500);
  await page.mouse.wheel(0, 800);
  await expect.poll(async () => (await snapshot(page)).camera.z).toBeCloseTo(0.01, 5);
  await choose('600');
  expect((await snapshot(page)).camera.z).toBe(6);
  await zoom.click();
  await page.getByRole('button', { name: 'Ajustar al contenido', exact: true }).click();
  await expect(page.locator(`[data-node="${id}"]`)).toBeInViewport();
  await capture(page, info, 'encuadre-contenido');
  await choose('25');
  await page.reload();
  await ready(page);
  await expect(zoom).toHaveAccessibleName('Zoom de Canvas: 25 %');
  expect((await world(page)).nodes[0]!.data).toEqual({
    kind: 'reference',
    ref: { kind: 'document', id: source.id },
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await zoom.click();
  await page.getByRole('button', { name: '100 %', exact: true }).click();
  await expect(zoom).toHaveAccessibleName('Zoom de Canvas: 100 %');
});

test('C08-B65: etiqueta en línea sin botones, menú contextual y borrado conservan el cable', async ({
  page,
}, info) => {
  await start(page);
  for (const x of [400, 1000]) {
    await page.getByRole('button', { name: 'Crear nota · N', exact: true }).click();
    await page.mouse.click(x, 300);
  }
  const nodes = (await world(page)).nodes;
  await connect(page, nodes[0]!.id, nodes[1]!.id, 'Decisión');
  const id = (await world(page)).links[0]!.id,
    hit = page.locator(`[data-link="${id}"] .link-hit`);
  const menu = async () => {
    await hit.focus();
    await hit.press('Shift+F10');
  };
  await menu();
  await page.getByRole('menuitem', { name: 'Editar etiqueta', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Etiqueta de conexión', exact: true });
  await expect(page.locator('[data-label] button,.link-actions')).toHaveCount(0);
  await input.fill('Cancelada');
  await input.press('Escape');
  expect((await world(page)).links[0]!.label).toBe('Decisión');
  await menu();
  await page.getByRole('menuitem', { name: 'Quitar etiqueta', exact: true }).click();
  expect((await world(page)).links[0]!.label ?? '').toBe('');
  expect((await world(page)).links[0]!.id).toBe(id);
  await page.keyboard.press('Control+z');
  expect((await world(page)).links[0]!.label).toBe('Decisión');
  await hit.press('Enter');
  await input.fill('');
  await input.press('Enter');
  expect((await world(page)).links).toHaveLength(1);
  expect((await world(page)).links[0]!.label ?? '').toBe('');
  await hit.press('Enter');
  await input.fill('Nombre nuevo');
  await input.press('Backspace');
  expect((await world(page)).links).toHaveLength(1);
  await input.fill('Nombre nuevo');
  await input.press('Enter');
  await capture(page, info, 'etiqueta-en-el-cable');
  await hit.focus();
  await hit.press('Delete');
  expect((await world(page)).links).toHaveLength(0);
  await page.keyboard.press('Control+z');
  expect((await world(page)).links[0]).toMatchObject({ id, label: 'Nombre nuevo' });
  await menu();
  await page.getByRole('menuitem', { name: 'Eliminar conexión', exact: true }).click();
  await page.keyboard.press('Delete');
  expect((await world(page)).links).toHaveLength(0);
  expect((await snapshot(page)).ui.canvas.linkSelection).toBeNull();
  await page.keyboard.press('Control+z');
  expect((await world(page)).links[0]).toMatchObject({ id, label: 'Nombre nuevo' });
  expect((await world(page)).nodes).toEqual(nodes);
});
