import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, world, snapshot, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';

async function setup(page: Page) {
  await start(page);
  const fixture = await snapshot(page),
    w = fixture.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [0, 1, 2].map((i) => ({
    id: `format-${i}`,
    x: -350 + i * 250,
    y: -160 + i * 30,
    width: 180,
    height: 180,
    owner: null,
    data: {
      kind: 'note',
      title: ['Decisión', 'Pregunta', 'Próximo paso'][i]!,
      text: 'Conservar el contexto y las referencias.\nUna idea por nota.',
      color: ['#f3ebcf', '#334155', '#777777'][i]!,
    },
  }));
  await storedFixture(page, fixture.state, fixture.ui);
  await page.reload();
  await expect(page.locator('[data-node=format-0]')).toBeVisible();
}
const open = (page: Page) =>
  page.getByRole('button', { name: 'Alinear selección', exact: true }).click();
async function select(page: Page, count: number) {
  await page.locator('[data-node=format-0]').click();
  for (let i = 1; i < count; i++)
    await page.locator(`[data-node=format-${i}]`).click({ modifiers: ['Shift'] });
}
test('C08-B157: alinear siempre visible, acciones por selección, espacio real, capas y teclado', async ({
  page,
}, info) => {
  await setup(page);
  await open(page);
  await expect(page.locator('.arrangement-icons button')).toHaveCount(6);
  await expect(page.locator('.arrangement-icons button:disabled')).toHaveCount(6);
  await expect(page.locator('.arrangement-spacing input:disabled')).toHaveCount(2);
  await capture(page, info, 'alineacion-sin-seleccion');
  await page.keyboard.press('Escape');
  await select(page, 1);
  await open(page);
  await expect(page.getByRole('menuitem', { name: 'Traer al frente', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await select(page, 2);
  await open(page);
  await expect(
    page.getByRole('menuitem', { name: 'Espaciar horizontalmente', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Separación horizontal', { exact: true }).fill('24');
  await page.keyboard.press('Enter');
  let nodes = (await world(page)).nodes;
  expect(nodes[1]!.x - nodes[0]!.x - nodes[0]!.width).toBe(24);
  await select(page, 3);
  await open(page);
  await page.getByRole('menuitem', { name: 'Alinear arriba', exact: true }).click();
  nodes = (await world(page)).nodes;
  expect(new Set(nodes.map((n) => n.y)).size).toBe(1);
  await open(page);
  await page.getByRole('menuitem', { name: 'Espaciar horizontalmente', exact: true }).click();
  nodes = (await world(page)).nodes;
  expect(nodes[1]!.x - nodes[0]!.x - nodes[0]!.width).toBeCloseTo(
    nodes[2]!.x - nodes[1]!.x - nodes[1]!.width,
  );
  await open(page);
  await capture(page, info, 'alineacion-tres-elementos');
  await page.keyboard.press('Escape');
  await select(page, 2);
  await open(page);
  await page.getByRole('menuitem', { name: 'Alinear a la izquierda', exact: true }).click();
  await page.locator('[data-node=format-1]').click();
  await open(page);
  await page.getByRole('menuitem', { name: 'Enviar al fondo', exact: true }).click();
  expect((await world(page)).nodes[0]!.id).toBe('format-1');
  await page.keyboard.press('Control+z');
  expect((await world(page)).nodes[0]!.id).toBe('format-0');
  await page.reload();
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '26px'));
  await open(page);
  const menu = await page.locator('.arrangement-menu').boundingBox();
  expect(menu!.x).toBeGreaterThanOrEqual(0);
  expect(menu!.x + menu!.width).toBeLessThanOrEqual(320);
  expect(
    await page.locator('.arrangement-menu').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await capture(page, info, 'alineacion-320-texto-200');
});

test('C08-B158: puntero de selección, mano al panear y cursores locales de texto y tamaño', async ({
  page,
}, info) => {
  await setup(page);
  const card = page.locator('[data-node=format-0]');
  const fixture = await snapshot(page),
    w = fixture.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes.push(
    {
      id: 'cursor-shape',
      x: -350,
      y: 130,
      width: 70,
      height: 70,
      owner: null,
      data: { kind: 'shape', shape: 'rectangle', color: '#ffffff' },
    },
    {
      id: 'cursor-sketch',
      x: -220,
      y: 130,
      width: 100,
      height: 70,
      owner: null,
      data: { kind: 'wireframe', title: 'Bloque', content: { type: 'block', text: '' } },
    },
    {
      id: 'cursor-drawing',
      x: -80,
      y: 130,
      width: 100,
      height: 70,
      owner: null,
      data: {
        kind: 'drawing',
        title: 'Trazo',
        color: '#ffffff',
        thickness: 2,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 70 },
        ],
      },
    },
  );
  w.zones = [
    {
      id: 'cursor-zone',
      name: 'Contexto',
      agent: w.agents[0]!.id,
      x: 100,
      y: 130,
      width: 160,
      height: 110,
    },
  ];
  await storedFixture(page, fixture.state, fixture.ui);
  await page.reload();
  for (const selector of [
    '.canvas-stage',
    '[data-node=format-0]',
    '[data-node=format-0] h3',
    '[data-node=format-1] p',
    '[data-node=cursor-shape] .shape-art',
    '[data-node=cursor-shape] .material-selection-frame',
    '[data-node=cursor-sketch]',
    '[data-node=cursor-drawing] polyline',
    '.agent-zone',
  ])
    await expect(page.locator(selector)).toHaveCSS('cursor', 'default');
  await card.click();
  await expect(card.locator('[data-corner=se]')).toHaveCSS('cursor', 'nwse-resize');
  await page.keyboard.press('h');
  await expect(card).toHaveCSS('cursor', 'grab');
  await expect(page.locator('[data-node=cursor-sketch]')).toHaveCSS('cursor', 'grab');
  const before = await snapshot(page),
    box = (await card.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 85, box.y + 65, { steps: 8 });
  await expect(card).toHaveCSS('cursor', 'grabbing');
  await page.mouse.up();
  expect((await snapshot(page)).state.camera).not.toEqual(before.state.camera);
  expect((await world(page)).nodes).toEqual(
    before.state.worlds.find((w) => w.id === 'scout')!.nodes,
  );
  await page.keyboard.press('v');
  await expect(card.locator('h3')).toHaveCSS('cursor', 'default');
  await page.getByRole('button', { name: 'Formas', exact: true }).click();
  await page.getByRole('button', { name: 'Rectángulo', exact: true }).click();
  for (const selector of ['.canvas-stage', '[data-node=format-0]', '.agent-zone'])
    await expect(page.locator(selector)).toHaveCSS('cursor', 'crosshair');
  await page.keyboard.press('v');
  await card.dblclick();
  await expect(page.getByLabel('Contenido de la nota', { exact: true })).toHaveCSS(
    'cursor',
    'text',
  );
  await page
    .getByLabel('Contenido de la nota', { exact: true })
    .fill('H V N no cambian herramientas mientras escribo.');
  await page.getByRole('button', { name: 'Volver al Canvas', exact: true }).click();
  await expect(card).toHaveCSS('cursor', 'default');
  await capture(page, info, 'seleccion-y-mano');
});

async function noteContrast(page: Page, selector: string, paper: string, placeholder = false) {
  return page.locator(selector).evaluate(
    (el, args) => {
      const style = getComputedStyle(el, args.placeholder ? '::placeholder' : null);
      const bg = getComputedStyle(el.closest(args.paper)!).backgroundColor;
      const luminance = (rgb: string) =>
        rgb
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((n) => n / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
      const a = luminance(style.color),
        b = luminance(bg);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    },
    { paper, placeholder },
  );
}
test('C08-B159: notas contrastadas, formato compartido, teclado, persistencia y espacio estrecho', async ({
  page,
}, info) => {
  await setup(page);
  for (const i of [0, 1, 2]) {
    for (const element of ['h3', 'p'])
      expect(
        await noteContrast(page, `[data-node=format-${i}] ${element}`, '.note'),
      ).toBeGreaterThanOrEqual(4.5);
  }
  await page.locator('[data-node=format-0]').dblclick();
  await page.getByLabel('Título de la nota', { exact: true }).fill('Una idea que se pueda leer');
  await page
    .getByLabel('Contenido de la nota', { exact: true })
    .fill('Diseñar con contexto.\nLas referencias y las decisiones permanecen juntas.');
  for (const name of [
    'Amarillo',
    'Lavanda',
    'Verde',
    'Azul',
    'Rosa',
    'Naranja',
    'Papel',
    'Grafito',
  ]) {
    await page.getByRole('button', { name: 'Color ' + name, exact: true }).click();
    await expect(page.locator('.note-colors button[aria-pressed=true]')).toHaveCount(1);
    for (const selector of ['#note-title', '#note-text']) {
      expect(await noteContrast(page, selector, '.note-paper')).toBeGreaterThanOrEqual(4.5);
      expect(await noteContrast(page, selector, '.note-paper', true)).toBeGreaterThanOrEqual(4.5);
    }
  }
  await page.getByLabel('Tipografía de la nota', { exact: true }).selectOption('serif');
  await page.getByLabel('Tamaño del texto', { exact: true }).fill('20');
  await page.getByLabel('Tamaño del texto', { exact: true }).press('Enter');
  await expect(page.locator('#note-text')).toHaveCSS('font-size', '20px');
  await expect(page.locator('#note-text')).toHaveCSS('font-family', 'Georgia, Cambria, serif');
  await capture(page, info, 'nota-grafito-tipografia');
  // Control negativo: detectar la regresión original aunque la paleta exista y responda.
  await page.locator('#note-text').evaluate((el) => ((el as HTMLElement).style.color = '#334155'));
  expect(await noteContrast(page, '#note-text', '.note-paper')).toBe(1);
  await page
    .locator('#note-text')
    .evaluate((el) => (el as HTMLElement).style.removeProperty('color'));
  await page.getByRole('button', { name: 'Volver al Canvas', exact: true }).click();
  await expect(page.locator('[data-node=format-0] p')).toHaveCSS('font-size', '20px');
  expect(await noteContrast(page, '[data-node=format-0] p', '.note')).toBeGreaterThanOrEqual(4.5);
  await page.reload();
  await page.locator('[data-node=format-0]').dblclick();
  await expect(page.getByLabel('Tipografía de la nota', { exact: true })).toHaveValue('serif');
  await expect(page.getByLabel('Tamaño del texto', { exact: true })).toHaveValue('20');
  await page.getByRole('button', { name: 'Color Verde', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Color Verde', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByLabel('Tipografía de la nota', { exact: true }).selectOption('mono');
  await page.setViewportSize({ width: 320, height: 700 });
  await page
    .getByLabel('Contenido de la nota', { exact: true })
    .fill('Una nota larga con líneas y contexto.\n'.repeat(30));
  expect(
    await page.locator('.note-editor').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  expect(
    await page.locator('#note-text').evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
  ).toBe(true);
  await page.locator('.note-format').scrollIntoViewIfNeeded();
  await capture(page, info, 'nota-320');
  const data = (await world(page)).nodes[0]!.data;
  expect(data.kind === 'note' && data.font === 'mono' && data.fontSize === 20).toBe(true);
  expect((await world(page)).nodes[1]!.data).toMatchObject({ color: '#334155', title: 'Pregunta' });
});
