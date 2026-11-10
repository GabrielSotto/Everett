import { test, expect } from './fixtures';
import { start, world, snapshot, capture, moveMaterial } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { googleFontFiles } from './google-font-files';

test('C08-B192: T escribe sobre la escena, conserva saltos, edición y copias independientes', async ({
  page,
}, info) => {
  await start(page);
  await page.keyboard.press('t');
  await page.keyboard.press('Escape');
  await expect(page.locator('.canvas-tools [data-tool=select]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('t');
  await page.mouse.click(420, 285);
  const field = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await expect(field).toBeFocused();
  await field.pressSequentially('Dia 3');
  await field.press('Enter');
  await field.pressSequentially('Salida del camion');
  await field.press('Escape');
  const material = page.locator('.material.text');
  await expect(material).toHaveCount(1);
  await expect(material.locator('.canvas-text-run')).toHaveText('Dia 3\nSalida del camion');
  await expect(material).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const original = (await world(page)).nodes[0]!;
  await expect(material).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('Dia 3\nSalida del camion');
  await field.fill('Día 4 · Tránsito');
  await field.press('Escape');
  await page.keyboard.press('Control+z');
  await expect(material.locator('.canvas-text-run')).toHaveText('Dia 3\nSalida del camion');
  await page.keyboard.press('Control+Shift+z');
  await expect(material.locator('.canvas-text-run')).toHaveText('Día 4 · Tránsito');
  await moveMaterial(page, original.id, 700, 430);
  expect((await world(page)).nodes[0]!.x).not.toBe(original.x);
  await page.keyboard.press('Control+d');
  await expect(material).toHaveCount(2);
  await material.last().dblclick();
  await field.fill('Terminal de llegada');
  await field.press('Escape');
  await page.reload();
  await expect(material.first().locator('.canvas-text-run')).toHaveText('Día 4 · Tránsito');
  await expect(material.last().locator('.canvas-text-run')).toHaveText('Terminal de llegada');
  await capture(page, info, 'texto-en-canvas');
});

test('C08-B193: el arrastre define ancho; el formato, el ancho y las líneas viajan con el texto', async ({
  page,
}, info) => {
  await start(page);
  await page.getByRole('button', { name: /^Texto · T$/ }).click();
  await page.mouse.click(400, 240);
  const field = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await field.press('Escape');
  expect((await world(page)).nodes).toHaveLength(0);
  await page.keyboard.press('t');
  await page.mouse.move(580, 300);
  await page.mouse.down();
  await page.mouse.move(400, 314, { steps: 6 });
  await page.mouse.up();
  await expect(field).toBeFocused();
  await field.fill('Del depósito al punto de entrega. Revisar la carga antes de salir.');
  const size = page.getByRole('spinbutton', { name: 'Tamaño del texto en píxeles' });
  await size.fill('30');
  await page.getByRole('button', { name: 'Centrar texto' }).click();
  await page.getByLabel('Peso', { exact: true }).selectOption('700');
  await expect(field).toHaveCSS('font-size', '30px');
  await capture(page, info, 'texto-ajustado-edicion');
  await field.press('Escape');
  const n = (await world(page)).nodes[0]!;
  expect(n.width).toBeCloseTo(180, 0);
  expect(n.height).toBeGreaterThan(75);
  expect(n.data).toMatchObject({
    kind: 'text',
    sizing: 'wrap',
    size: 30,
    weight: 700,
    align: 'center',
  });
  const run = page.locator('.material.text .canvas-text-run');
  await expect(run).toHaveCSS('font-weight', '700');
  await expect(run).toHaveCSS('text-align', 'center');
  const handle = page.locator('.material.text .resize-handle.e');
  await handle.focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press('Shift+ArrowRight');
  expect((await world(page)).nodes[0]!.height).toBeLessThan(n.height);
  await page.keyboard.press('t');
  await page.mouse.click(250, 430);
  await field.fill('Guardar al salir');
  await page.reload();
  await expect(page.locator('.material.text')).toHaveCount(2);
  await expect(page.locator('.material.text').last().locator('.canvas-text-run')).toHaveText(
    'Guardar al salir',
  );
});

test('C08-B194: texto sobre una forma clara y atajos existentes en un mundo previo', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes.push({
    id: 'paper',
    x: -290,
    y: -210,
    width: 500,
    height: 230,
    owner: null,
    data: { kind: 'shape', shape: 'rectangle', title: 'Ruta', color: '#fff', fill: true },
  });
  delete input.ui.shortcuts.text;
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await snapshot(page);
  await page.keyboard.press('t');
  await page.locator('[data-node=paper]').click({ position: { x: 25, y: 35 } });
  const field = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await field.fill('Día 7 · Llegada');
  await page.mouse.click(180, 600);
  const run = page.locator('.material.text .canvas-text-run');
  await expect(run).toHaveText('Día 7 · Llegada');
  await expect(run).toHaveCSS('color', 'rgb(38, 50, 60)');
  await capture(page, info, 'rotulo-sobre-forma');
});

test('C08-B195: formato a 320 px; una fuente que llega tras cerrar ajusta el rótulo sin otro paso de Deshacer', async ({
  page,
}, info) => {
  await start(page);
  await page.setViewportSize({ width: 320, height: 640 });
  let release!: () => void;
  await googleFontFiles(
    page,
    new Promise<void>((r) => {
      release = r;
    }),
  );
  await page.route('**/api/google-fonts', (route) =>
    route.fulfill({
      json: {
        families: [{ family: 'Lora', category: 'serif', weights: [400, 700], italic: false }],
      },
    }),
  );
  await page.keyboard.press('t');
  await page.mouse.click(60, 280);
  const field = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await field.fill('Salida del camión');
  await page.getByRole('combobox', { name: 'Tipografía', exact: true }).fill('Lora');
  await page.locator('[data-action=font-select][data-font="google:Lora"]').click();
  const toolbar = page.getByRole('group', { name: 'Formato del texto' });
  const box = (await toolbar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  for (const control of await toolbar.locator('input,select').all())
    await expect(control).toBeInViewport();
  await capture(page, info, 'formato-texto-320');
  await field.press('Escape');
  release();
  const material = page.locator('.material.text');
  await expect(material).toHaveAttribute('data-font-state', 'ready');
  const metrics = await material.evaluate((el) => {
    const run = el.querySelector('.canvas-text-run')!,
      range = document.createRange();
    range.selectNodeContents(run);
    return { body: el.getBoundingClientRect().width, ink: range.getBoundingClientRect().width };
  });
  expect(metrics.body - metrics.ink).toBeGreaterThanOrEqual(0);
  expect(metrics.body - metrics.ink).toBeLessThanOrEqual(2);
  await page.keyboard.press('Control+z');
  await expect(material).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(material).toHaveCount(1);
  await expect(material).toHaveAttribute('data-font-state', 'ready');
});
