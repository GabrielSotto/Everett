import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';

async function add(page: Page, url: string): Promise<string> {
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('[data-action=canvas-link]').click();
  await page.getByLabel('Dirección del enlace').fill(url);
  await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
  return (await world(page)).nodes.at(-1)!.id;
}
async function gesture(page: Page, delta: number, modifier = 'Alt'): Promise<void> {
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await page.waitForTimeout(450);
  await page.keyboard.down(modifier);
  await page.mouse.wheel(0, delta);
  await page.keyboard.up(modifier);
}
async function imageUrls(page: Page): Promise<void> {
  const png = await readFile('tests/fixtures/link-cover.png');
  await page.route('**/api/link-preview', (route) =>
    route.fulfill({
      json: {
        status: 'ready',
        checkedAt: 123,
        resolvedUrl: route.request().postDataJSON().url,
        file: { kind: 'image', mime: 'image/png', data: png.toString('base64') },
      },
    }),
  );
}

test('C08-B108: modificador espacial se cambia desde Atajos, persiste y la rueda de imagen sigue siendo local', async ({
  page,
}, info) => {
  await start(page);
  await imageUrls(page);
  const id = await add(page, 'https://example.org/first.png');
  await expect(page.locator(`[data-node="${id}"] img`)).toHaveAttribute('src', /^blob:/);
  await page.locator('[data-action=profile]').click();
  await page.locator('[data-action=profile-tab][data-tab=settings]').click();
  await page.locator('[data-action=settings-shortcuts]').click();
  const field = page.getByLabel('Modificador de navegación espacial', { exact: true });
  await expect(field).toHaveValue('Alt + rueda');
  await field.focus();
  await page.keyboard.press('Shift');
  await expect(field).toHaveValue('Mayús + rueda');
  await page.getByRole('button', { name: 'Restaurar todos', exact: true }).click();
  await expect(field).toHaveValue('Alt + rueda');
  await field.focus();
  await page.keyboard.press('Shift');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await page.locator(`[data-node="${id}"]`).hover();
  await gesture(page, -240, 'Shift');
  await expect(page.locator('.image-inspector')).toBeVisible();
  await page.locator('.image-stage').hover();
  await page.mouse.wheel(0, 240);
  await expect(page.locator('.image-inspector')).toBeVisible();
  await gesture(page, 240, 'Alt');
  await expect(page.locator('.image-inspector')).toBeVisible();
  await gesture(page, 240, 'Shift');
  await expect(page.locator(`[data-node="${id}"]`)).toBeVisible();
  await capture(page, info, 'atajo-global-conservado');
});

test('C08-B109: selección de imágenes abre galería acotada, zoom gradual, rotación y regreso sin perder selección', async ({
  page,
}, info) => {
  await start(page);
  await imageUrls(page);
  const first = await add(page, 'https://example.org/first.png');
  const second = await add(page, 'https://example.org/second.png');
  const third = await add(page, 'https://example.org/third.png');
  await expect(page.locator(`[data-node="${third}"] img`)).toHaveAttribute('src', /^blob:/);
  const input = await snapshot(page);
  input.state.worlds
    .find((w) => w.id === 'scout')!
    .nodes.forEach((node, i) => {
      node.x = -420 + i * 280;
      node.y = -100;
      node.width = 220;
      node.height = node.data.kind === 'image' ? 220 / node.data.ratio : 160;
    });
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await page.locator(`[data-node="${first}"]`).click();
  await page.keyboard.down('Shift');
  await page.locator(`[data-node="${second}"]`).click();
  await page.keyboard.up('Shift');
  const camera = (await snapshot(page)).camera;
  await page.locator(`[data-node="${second}"]`).hover();
  await gesture(page, -240);
  await expect(page.locator('.image-gallery')).toContainText('2 / 2');
  await expect(
    page.getByRole('button', { name: 'Imagen siguiente', exact: true }).locator('path'),
  ).toHaveAttribute('d', 'm9 6 6 6-6 6');
  await page.getByRole('button', { name: '100 %', exact: true }).click();
  const output = page.getByRole('status', { name: 'Zoom de imagen', exact: true });
  await expect(output).toHaveText('100 %');
  for (let i = 0; i < 6; i++) {
    const before = Number((await output.innerText()).replace(/\D/g, ''));
    await page.getByRole('button', { name: 'Acercar imagen', exact: true }).click();
    await expect
      .poll(async () => Number((await output.innerText()).replace(/\D/g, '')))
      .toBeGreaterThan(before);
    const after = Number((await output.innerText()).replace(/\D/g, ''));
    expect(after / before).toBeLessThan(1.13);
  }
  await page.getByRole('button', { name: 'Imagen anterior', exact: true }).click();
  await expect(page.locator('.image-gallery')).toContainText('1 / 2');
  await page.getByRole('button', { name: 'Rotar imagen', exact: true }).click();
  await expect(page.locator('.image-inspector img')).toHaveAttribute('style', /rotate\(90deg\)/);
  await expect(
    page.getByRole('button', { name: 'Imagen anterior', exact: true }),
  ).not.toBeFocused();
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'Imagen siguiente', exact: true }).click();
  }
  await expect(page.locator('.image-gallery')).toContainText('1 / 2');
  await expect(page.getByRole('button', { name: 'Imagen siguiente', exact: true })).toBeFocused();
  await expect(page.locator('.image-inspector img')).toBeVisible();
  await capture(page, info, 'galeria-seleccionada');
  await page.locator('.image-stage').hover();
  await gesture(page, 240);
  expect((await snapshot(page)).ui.canvas.selections).toEqual([first, second]);
  expect((await snapshot(page)).camera).toEqual(camera);
});

test('C08-B110: lectura seguida se retoma incluso tras recargar sin cambiar el origen de la tarjeta', async ({
  page,
}, info) => {
  await start(page);
  await page.route('**/api/link-preview', (route) => {
    const second = route.request().postDataJSON().url.endsWith('/introduction');
    return route.fulfill({
      json: {
        status: 'ready',
        checkedAt: 123,
        resolvedUrl: route.request().postDataJSON().url,
        title: second ? 'Introduction' : 'Documentación',
        reader: {
          title: second ? 'Introduction' : 'Documentación',
          html: `<p>${'Contenido legible. '.repeat(200)}</p><a href="https://example.org/introduction">Introduction</a>`,
          text: 'Lectura',
          byline: '',
          capturedAt: 123,
        },
      },
    });
  });
  const id = await add(page, 'https://example.org/docs');
  await expect(page.locator(`[data-node="${id}"] .link-open`)).toBeVisible();
  await page.locator(`[data-node="${id}"]`).hover();
  await gesture(page, -240);
  await page.getByRole('link', { name: 'Introduction', exact: true }).click();
  await expect(page.locator('.reader-content h2')).toHaveText('Introduction');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(page.locator('.reader-content h2')).toHaveText('Documentación');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.locator(`[data-node="${id}"]`).hover();
  await gesture(page, -240);
  await expect(page.locator('.reader-content h2')).toHaveText('Introduction');
  await page.route('**/api/link-preview', (route) => route.abort());
  await page.reload();
  await expect(page.locator('.reader-content h2')).toHaveText('Introduction');
  const data = (await world(page)).nodes[0]!.data;
  expect(data.kind === 'link' && data.url).toBe('https://example.org/docs');
  await capture(page, info, 'lectura-retomada-offline');
});

test('C08-B111: Tab completa historial local y los errores distinguen dominio inexistente de sintaxis válida', async ({
  page,
}, info) => {
  await start(page);
  await page.route('**/api/link-preview', (route) =>
    route.fulfill({
      json: {
        status: 'error',
        problem: 'host-not-found',
        checkedAt: 123,
        resolvedUrl: route.request().postDataJSON().url,
      },
    }),
  );
  const id = await add(page, 'https://pablitoclavounclavito.invalid/');
  await expect(page.locator(`[data-node="${id}"]`)).toContainText('No se encontró este dominio');
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('[data-action=canvas-link]').click();
  const field = page.getByLabel('Dirección del enlace');
  await field.fill('https://pablito');
  await expect(page.locator('.completion-ghost')).toHaveText(
    'https://pablitoclavounclavito.invalid/',
  );
  expect(
    await page.locator('.completion-ghost').evaluate((element) => getComputedStyle(element).font),
  ).toBe(await field.evaluate((element) => getComputedStyle(element).font));
  await field.press('Tab');
  await expect(field).toHaveValue('https://pablitoclavounclavito.invalid/');
  await field.fill('pablito');
  await expect(page.locator('.completion-ghost')).toHaveText('pablitoclavounclavito.invalid/');
  await field.press('Tab');
  await expect(field).toHaveValue('pablitoclavounclavito.invalid/');
  await field.press('Tab');
  await expect(field).not.toBeFocused();
  await page.keyboard.press('Escape');
  await page.locator(`[data-node="${id}"]`).hover();
  await gesture(page, -240);
  await expect(page.locator('.reader-message')).toContainText('No se encontró este dominio');
  await expect(page.locator('.reader-scroll')).toHaveClass(/reader-unavailable/);
  await capture(page, info, 'dominio-no-encontrado');
});

test('C08-B112: Enter confirma renombres repetidos con respuesta tardía y sin perder una edición activa', async ({
  page,
}, info) => {
  await start(page);
  let complete: (() => void) | undefined;
  await page.route('**/api/link-preview', async (route) => {
    await new Promise<void>((resolve) => {
      complete = resolve;
    });
    await route.fulfill({
      json: {
        status: 'ready',
        checkedAt: 123,
        title: 'Título remoto',
        resolvedUrl: 'https://example.org/docs',
        description: 'Descripción',
      },
    });
  });
  const id = await add(page, 'https://example.org/docs');
  const card = page.locator(`[data-node="${id}"]`);
  await card.click({ button: 'right' });
  await page.getByRole('menuitem', { name: /^Renombrar/ }).click();
  const input = page.getByLabel('Nombre del material', { exact: true });
  await input.fill('Godot doc 0');
  await expect.poll(() => !!complete).toBe(true);
  complete!();
  await expect(card.locator('.link-card')).toHaveAttribute('data-preview-status', 'ready');
  await expect(input).toHaveValue('Godot doc 0');
  await expect(input).toBeFocused();
  await input.press('Enter');
  for (let i = 1; i <= 16; i++) {
    await card.click({ button: 'right' });
    await page.getByRole('menuitem', { name: /^Renombrar/ }).click();
    await input.fill('Godot doc ' + i);
    await input.press('Enter');
    await expect(card.locator('.material-identification button')).toHaveText('Godot doc ' + i);
  }
  await page.reload();
  await expect(card.locator('.material-identification button')).toHaveText('Godot doc 16');
  await capture(page, info, 'renombre-conservado');
});

test('C08-B113: guías alinean en varias escalas, Ctrl suspende, cancelar y Undo recuperan la geometría', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    project = input.state.worlds.find((w) => w.id === 'scout')!;
  project.nodes = [
    {
      id: 'fixed',
      x: 120,
      y: -140,
      width: 180,
      height: 120,
      owner: null,
      data: { kind: 'note', title: 'Referencia', text: 'Fija', color: '#e8efd8' },
    },
    {
      id: 'moving',
      x: -250,
      y: 90,
      width: 140,
      height: 100,
      owner: null,
      data: { kind: 'note', title: 'Móvil', text: 'Mover', color: '#eee2ee' },
    },
  ];
  for (const zoom of [0.5, 1, 2]) {
    input.state.camera = { x: 0, y: 0, z: zoom };
    input.ui.canvasContexts = {};
    await storedFixture(page, input.state, input.ui);
    await page.reload();
    const card = page.locator('[data-node=moving]'),
      box = (await card.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 370 * zoom + 3, box.y + box.height / 2, {
      steps: 10,
    });
    await expect(page.locator('.alignment-guides line')).toHaveCount(1);
    await expect(page.locator('.alignment-guides line')).toHaveAttribute('x1', '120');
    await page.mouse.up();
    expect((await world(page)).nodes.find((n) => n.id === 'moving')!.x).toBeCloseTo(120, 4);
    await page.keyboard.press('Control+z');
    expect((await world(page)).nodes.find((n) => n.id === 'moving')!.x).toBe(-250);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 370 * zoom + 3, box.y + box.height / 2, {
      steps: 10,
    });
    await expect(page.locator('.alignment-guides')).toHaveCount(0);
    await page.mouse.up();
    await page.keyboard.up('Control');
    expect((await world(page)).nodes.find((n) => n.id === 'moving')!.x).toBeCloseTo(
      120 + 3 / zoom,
      4,
    );
    await page.keyboard.press('Control+z');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 370 * zoom + 3, box.y + box.height / 2, {
      steps: 10,
    });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect((await world(page)).nodes.find((n) => n.id === 'moving')!.x).toBe(-250);
  }
  await capture(page, info, 'alineacion-cancelada-sin-cambios');
});

test('C08-B114: encuadre contextual comparte resultado con zoom y no altera los materiales', async ({
  page,
}, info) => {
  await start(page);
  await imageUrls(page);
  const id = await add(page, 'https://example.org/tiny.png');
  await expect(page.locator(`[data-node="${id}"] img`)).toHaveAttribute('src', /^blob:/);
  const before = (await world(page)).nodes;
  await page.locator(`[data-node="${id}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Ajustar a la selección', exact: true }).click();
  expect((await snapshot(page)).camera.z).toBeGreaterThan(1);
  expect((await world(page)).nodes).toEqual(before);
  await capture(page, info, 'encuadre-contextual');
});

test('C08-B115: conjunto se alinea como una pieza y conserva distancias, miembros e historial', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    project = input.state.worlds.find((w) => w.id === 'scout')!;
  project.nodes = [
    {
      id: 'fixed',
      x: 120,
      y: -180,
      width: 180,
      height: 100,
      owner: null,
      data: { kind: 'note', title: 'Referencia', text: 'Fija', color: '#e8efd8' },
    },
    {
      id: 'one',
      x: -330,
      y: 30,
      width: 100,
      height: 80,
      owner: null,
      data: { kind: 'note', title: 'Uno', text: 'Uno', color: '#eee2ee' },
    },
    {
      id: 'two',
      x: -200,
      y: 60,
      width: 100,
      height: 80,
      owner: null,
      data: { kind: 'note', title: 'Dos', text: 'Dos', color: '#eee2ee' },
    },
  ];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await page.locator('[data-node=one]').click();
  await page.keyboard.down('Shift');
  await page.locator('[data-node=two]').click();
  await page.keyboard.up('Shift');
  await page.locator('[data-node=one]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Crear conjunto', exact: true }).click();
  const before = (await world(page)).nodes;
  const grip = (await page.locator('.group-grip').boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 453, grip.y + grip.height / 2, { steps: 15 });
  await expect(page.locator('.alignment-guides line')).toHaveAttribute('x1', '120');
  await capture(page, info, 'guias-de-conjunto');
  await page.mouse.up();
  const after = (await world(page)).nodes;
  expect(after[0]).toEqual(before[0]);
  expect(after[1]!.x).toBe(120);
  expect(after[2]!.x - after[1]!.x).toBe(130);
  expect(after[2]!.y - after[1]!.y).toBe(30);
  const group = (await world(page)).canvasGroups![0]!;
  expect(group.nodes).toEqual(['one', 'two']);
  await page.keyboard.press('Control+z');
  expect((await world(page)).nodes).toEqual(before);
  await page.keyboard.press('Control+Shift+z');
  expect((await world(page)).nodes).toEqual(after);
  await page.reload();
  expect((await world(page)).nodes).toEqual(after);
  await page.locator('.group-heading').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Ajustar a la selección', exact: true }).click();
  expect((await snapshot(page)).ui.canvas.selections).toEqual(['one', 'two']);
  expect((await world(page)).nodes).toEqual(after);
});
