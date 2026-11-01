import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { wireframeMaterial } from '../../src/domain/wireframes';
import type { Page } from '@playwright/test';

async function add(page: Page, name: string) {
  const before = new Set((await world(page)).nodes.map((n) => n.id));
  await page.getByRole('button', { name: 'Bosquejos', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Agregar ' + name, exact: true }).click();
  return (await world(page)).nodes.filter((n) => !before.has(n.id));
}
async function edit(page: Page, id: string) {
  await page.locator(`[data-node="${id}"] .wireframe-body`).dblclick();
  await expect(page.locator('.wireframe-editor')).toBeVisible();
}

test('C08-B137: barras por defecto, rótulo opcional y edición de botón estable con radio y color persistidos', async ({
  page,
}, info) => {
  await start(page);
  const [button] = await add(page, 'botón');
  const material = page.locator(`[data-node="${button!.id}"]`);
  await expect(
    material.locator(
      '.wireframe-content input,.wireframe-content textarea,.wireframe-content button',
    ),
  ).toHaveCount(0);
  await expect(material.locator('.wireframe-placeholder')).toBeVisible();
  expect(
    (await material.locator('.wireframe-placeholder i').first().boundingBox())!.width,
  ).toBeGreaterThan(button!.width / 3);
  const before = (await material.boundingBox())!;
  await material.dblclick();
  const editor = page.locator('.wireframe-editor');
  await page.getByRole('textbox', { name: 'Contenido del bosquejo', exact: true }).fill('Entrar');
  await expect(
    page.getByRole('checkbox', { name: 'Texto simulado', exact: true }),
  ).not.toBeChecked();
  await expect(material.locator('.wireframe-body')).toHaveText('Entrar');
  const radius = page.getByRole('spinbutton', { name: 'Radio de esquina', exact: true });
  await radius.fill('12');
  await radius.press('Enter');
  await expect(material.locator('.wireframe-content')).toHaveCSS('border-radius', '12px');
  await page.getByRole('button', { name: 'Relleno de la pieza', exact: true }).click();
  const hex = page.getByRole('textbox', { name: 'Color hexadecimal', exact: true });
  await hex.fill('#E3F0E8');
  await hex.press('Enter');
  await expect(editor).toBeVisible();
  await expect(material.locator('.wireframe-content')).toHaveCSS(
    'background-color',
    'rgb(227, 240, 232)',
  );
  await page.keyboard.press('Escape'); // cerrar color, conservar inspector
  await page.keyboard.press('Escape');
  const after = (await material.boundingBox())!;
  expect(after.width).toBeCloseTo(before.width, 4);
  expect(after.height).toBeCloseTo(before.height, 4);
  expect((await world(page)).nodes[0]!.width).toBe(button!.width);
  for (let i = 0; i < 3; i++) {
    await material.dblclick();
    await page.keyboard.press('Escape');
  }
  expect((await material.boundingBox())!.width).toBeCloseTo(before.width, 4);
  await page.reload();
  await expect(material.locator('.wireframe-body')).toHaveText('Entrar');
  await expect(material.locator('.wireframe-content')).toHaveCSS('border-radius', '12px');
  await edit(page, button!.id);
  await page.getByRole('checkbox', { name: 'Texto simulado', exact: true }).check();
  await page.keyboard.press('Escape');
  await expect(material.locator('.wireframe-placeholder')).toBeVisible();
  await capture(page, info, 'boton-simulado-estable');
  const [text] = await add(page, 'texto');
  await edit(page, text!.id);
  await page
    .getByRole('textbox', { name: 'Contenido del bosquejo', exact: true })
    .fill('Título del proyecto');
  await page.getByRole('button', { name: 'Apariencia y tamaño', exact: true }).click();
  const height = page.getByRole('spinbutton', { name: 'Alto de la pieza', exact: true });
  await height.fill('120');
  await height.press('Enter');
  await page.getByRole('spinbutton', { name: 'Radio de esquina', exact: true }).fill('8');
  await page.getByRole('spinbutton', { name: 'Radio de esquina', exact: true }).press('Enter');
  expect((await world(page)).nodes.find((n) => n.id === text!.id)!.height).toBe(120);
});

test('C08-B138: tabla ocupa su altura y los elementos antiguos de lista se editan por fila sin resize nativo', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  const table = wireframeMaterial('table', 'table', { x: -240, y: 0 });
  table.height = 360;
  const list = wireframeMaterial('list', 'list', { x: 240, y: 0 });
  w.nodes = [table, list];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  const ratios = await page.locator('[data-node=table]').evaluate((element) => {
    const body = element.querySelector('.wireframe-body')!.getBoundingClientRect();
    const table = element.querySelector('table')!.getBoundingClientRect();
    return { body: body.height, table: table.height };
  });
  expect(ratios.table).toBeGreaterThanOrEqual(ratios.body - 2);
  await edit(page, 'list');
  const fields = page.getByRole('group', { name: 'Elementos del bosquejo', exact: true });
  await fields.getByRole('textbox', { name: 'Elemento 2', exact: true }).fill('Segundo editado');
  await fields.getByRole('button', { name: 'Agregar elemento', exact: true }).click();
  await fields.getByRole('textbox', { name: 'Elemento 4', exact: true }).fill('Cuarto');
  await fields.getByRole('button', { name: 'Quitar elemento 1', exact: true }).click();
  const node = (await world(page)).nodes.find((n) => n.id === 'list')!;
  expect(
    node.data.kind === 'wireframe' && node.data.content.type !== 'table' && node.data.content.text,
  ).toBe('Segundo editado\nTercer elemento\nCuarto');
  await page.keyboard.press('Escape');
  await edit(page, 'table');
  await expect(page.getByRole('dialog', { name: 'Editar tabla', exact: true })).toBeVisible();
  const dimensions = page.getByRole('spinbutton', { name: 'Alto de la pieza', exact: true });
  await dimensions.fill('480');
  await dimensions.press('Enter');
  expect((await world(page)).nodes.find((n) => n.id === 'table')!.height).toBe(480);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes.find((n) => n.id === 'table')!.height).toBe(360);
  await edit(page, 'list');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  const box = (await page.locator('.wireframe-editor').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(
    await page
      .locator('.wireframe-editor textarea')
      .evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).resize === 'none')),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await page.reload();
  expect((await world(page)).nodes.find((n) => n.id === 'list')!.data).toEqual(node.data);
  await capture(page, info, 'lista-por-elementos');
  await page.setViewportSize({ width: 1440, height: 900 });
  const paginated = await snapshot(page);
  const legacy = paginated.state.worlds
    .find((w) => w.id === 'scout')!
    .nodes.find((n) => n.id === 'list')!;
  if (legacy.data.kind !== 'wireframe' || legacy.data.content.type === 'table')
    throw new Error('Se perdió la lista de prueba.');
  legacy.data.content.text = Array.from({ length: 20 }, (_, i) => 'Elemento ' + (i + 1)).join('\n');
  await storedFixture(page, paginated.state, paginated.ui);
  await page.reload();
  await edit(page, 'list');
  await fields.getByRole('button', { name: 'Agregar elemento', exact: true }).click();
  await expect(fields.getByRole('textbox', { name: 'Elemento 21', exact: true })).toBeFocused();
  await fields.getByRole('textbox', { name: 'Elemento 21', exact: true }).fill('Último');
  await fields.getByRole('button', { name: 'Quitar elemento 21', exact: true }).click();
  await expect(fields.getByRole('textbox', { name: 'Elemento 20', exact: true })).toBeFocused();
});

test('C08-B139: separación numérica en dos ejes desde cabecera y contexto, error sin movimiento y deshacer atómico', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [
    wireframeMaterial('button', 'a', { x: -200, y: -120 }),
    wireframeMaterial('input', 'b', { x: 100, y: 20 }),
    wireframeMaterial('image', 'c', { x: 280, y: 180 }),
  ];
  input.ui.canvas.selections = ['a', 'b', 'c'];
  input.ui.canvas.selection = 'a';
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  const before = (await world(page)).nodes;
  await page.getByRole('button', { name: 'Organizar selección', exact: true }).click();
  const horizontal = page.getByRole('spinbutton', { name: 'Separación horizontal', exact: true });
  await horizontal.fill('-1');
  await horizontal.press('Enter');
  expect((await world(page)).nodes).toEqual(before);
  await expect(horizontal).toBeFocused();
  await horizontal.fill('24.5');
  await page.getByRole('button', { name: 'Aplicar separación horizontal', exact: true }).click();
  let nodes = (await world(page)).nodes.toSorted((a, b) => a.x - b.x);
  nodes
    .slice(1)
    .forEach((node, i) => expect(node.x - nodes[i]!.x - nodes[i]!.width).toBeCloseTo(24.5, 5));
  expect(nodes[0]!.x).toBe(before[0]!.x);
  await page.locator('[data-node=a]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Alinear y distribuir', exact: false }).click();
  await page.getByRole('spinbutton', { name: 'Separación vertical', exact: true }).fill('32');
  await page.getByRole('button', { name: 'Aplicar separación vertical', exact: true }).click();
  nodes = (await world(page)).nodes.toSorted((a, b) => a.y - b.y);
  nodes
    .slice(1)
    .forEach((node, i) => expect(node.y - nodes[i]!.y - nodes[i]!.height).toBeCloseTo(32, 5));
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes.map((n) => n.y)).toEqual(before.map((n) => n.y));
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes).toEqual(before);
  await page.reload();
  expect((await world(page)).nodes).toEqual(before);
  await capture(page, info, 'separacion-exacta');
});

test('C08-B140: composiciones son piezas editables agrupadas, no formularios; video y carrusel se conservan y se deshacen juntos', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  const base = await add(page, 'pantalla');
  for (const name of ['tarjeta', 'lista', 'menú', 'carrusel']) {
    const before = (await world(page)).nodes;
    const added = await add(page, name);
    expect(added.length).toBeGreaterThanOrEqual(4);
    const group = (await world(page)).canvasGroups!.at(-1)!;
    expect(new Set(group.nodes)).toEqual(new Set(added.map((n) => n.id)));
    for (const node of added)
      await expect(
        page.locator(`[data-node="${node.id}"] input,[data-node="${node.id}"] textarea`),
      ).toHaveCount(0);
    await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
    expect((await world(page)).nodes).toEqual(before);
    await page.getByRole('button', { name: 'Rehacer · Ctrl+Shift+Z', exact: true }).click();
    expect((await world(page)).nodes.filter((n) => group.nodes.includes(n.id))).toEqual(added);
    const part = added.find((n) => n.data.kind === 'wireframe' && n.data.content.type === 'text');
    if (part) {
      await edit(page, part.id);
      await page
        .getByRole('textbox', { name: 'Contenido del bosquejo', exact: true })
        .fill('Mi rótulo');
      await page.keyboard.press('Escape');
      const untouched = (await world(page)).nodes.filter(
        (n) => group.nodes.includes(n.id) && n.id !== part.id,
      );
      expect(untouched).toEqual(added.filter((n) => n.id !== part.id));
    }
  }
  const [video] = await add(page, 'video');
  await expect(page.locator(`[data-node="${video!.id}"] .wireframe-video-play`)).toBeVisible();
  const beforeReload = (await world(page)).nodes;
  await page.reload();
  expect((await world(page)).nodes).toEqual(beforeReload);
  expect((await world(page)).nodes.find((n) => n.id === base[0]!.id)).toEqual(base[0]);
  await capture(page, info, 'composiciones-editables');
});

test('C08-B141: arrastrar una composición conserva cámara y disposición de sus partes, cancelar no crea materiales', async ({
  page,
}, info) => {
  await start(page);
  for (const percent of [38, 200]) {
    await page.getByRole('button', { name: /^Zoom de Canvas:/ }).click();
    const zoom = page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true });
    await zoom.fill(String(percent));
    await zoom.press('Enter');
    const before = await world(page),
      camera = (await snapshot(page)).camera;
    await page.getByRole('button', { name: 'Bosquejos', exact: true }).click();
    const item = page.getByRole('menuitem', { name: 'Agregar lista', exact: true });
    const b = (await item.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(980, 440, { steps: 10 });
    await expect(page.locator('.wireframe-drag-preview > div')).toHaveCount(7);
    await page.mouse.up();
    const w = await world(page),
      group = w.canvasGroups!.at(-1)!;
    const nodes = w.nodes.filter((n) => group.nodes.includes(n.id));
    expect(nodes).toHaveLength(7);
    expect((await snapshot(page)).camera).toEqual(camera);
    const root = page.locator(`[data-node="${group.nodes[0]}"]`),
      rect = (await root.boundingBox())!;
    expect(rect.x + rect.width / 2).toBeCloseTo(980, 0);
    expect(rect.y + rect.height / 2).toBeCloseTo(440, 0);
    await expect(root.locator('.material-identification')).toBeHidden();
    await expect(root.locator('.resize-handle:visible')).toHaveCount(0);
    // Una parte se elige y edita directamente; el resto conserva sus coordenadas.
    const text = nodes.find((n) => n.data.kind === 'wireframe' && n.data.content.type === 'text')!;
    const bar = (await page
      .locator(`[data-node="${text.id}"] .wireframe-placeholder i`)
      .first()
      .boundingBox())!;
    expect(bar.width).toBeGreaterThan((text.width * percent) / 200);
    await edit(page, text.id);
    await expect(page.locator('.wireframe-editor textarea')).toHaveCSS('resize', 'none');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
    expect((await world(page)).nodes).toEqual(before.nodes);
  }
  await page.getByRole('button', { name: 'Bosquejos', exact: true }).click();
  const b = (await page
    .getByRole('menuitem', { name: 'Agregar carrusel', exact: true })
    .boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(900, 400, { steps: 6 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await world(page)).nodes).toHaveLength(0);
  await capture(page, info, 'composicion-por-arrastre');
});

test('C08-B142: construir una interfaz de escritorio con piezas y composiciones por gestos reales y recuperarla completa', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  const [screen] = await add(page, 'pantalla');
  await edit(page, screen!.id);
  await expect(page.getByRole('button', { name: 'Escritorio', exact: true })).toContainText(
    '1280 × 800',
  );
  await page.getByRole('button', { name: 'Escritorio', exact: true }).click();
  await edit(page, screen!.id);
  await page.getByRole('spinbutton', { name: 'Radio de esquina', exact: true }).fill('16');
  await page.getByRole('spinbutton', { name: 'Radio de esquina', exact: true }).press('Enter');
  await page.keyboard.press('Escape');
  const frame = (await page.locator(`[data-node="${screen!.id}"]`).boundingBox())!;
  const drop = async (name: string, x: number, y: number) => {
    const before = new Set((await world(page)).nodes.map((n) => n.id));
    await page.getByRole('button', { name: 'Bosquejos', exact: true }).click();
    const b = (await page
      .getByRole('menuitem', { name: 'Agregar ' + name, exact: true })
      .boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(frame.x + (x * frame.width) / 1280, frame.y + (y * frame.height) / 800, {
      steps: 10,
    });
    await page.mouse.up();
    return (await world(page)).nodes.filter((n) => !before.has(n.id));
  };
  const [title] = await drop('texto', 220, 80);
  await edit(page, title!.id);
  await page
    .getByRole('textbox', { name: 'Contenido del bosquejo', exact: true })
    .fill('Proyecto · Resumen');
  await page.keyboard.press('Escape');
  await drop('campo', 980, 80);
  await drop('menú', 150, 300);
  await drop('tarjeta', 520, 300);
  await drop('carrusel', 990, 300);
  await drop('tabla', 520, 620);
  await drop('video', 990, 620);
  const w = await world(page),
    scene = w.nodes;
  expect(w.canvasGroups).toHaveLength(3);
  for (const node of scene.filter((n) => n.id !== screen!.id)) {
    expect(node.x).toBeGreaterThanOrEqual(screen!.x);
    expect(node.y).toBeGreaterThanOrEqual(screen!.y);
    expect(node.x + node.width).toBeLessThanOrEqual(screen!.x + 1280);
    expect(node.y + node.height).toBeLessThanOrEqual(screen!.y + 800);
  }
  await page.mouse.click(12, 120);
  await page.mouse.move(12, 90);
  await expect(
    page.locator('.wireframe-content input,.wireframe-content textarea,.wireframe-content button'),
  ).toHaveCount(0);
  await capture(page, info, 'interfaz-compuesta-baja');
  await page.reload();
  expect((await world(page)).nodes).toEqual(scene);
  expect((await world(page)).canvasGroups).toEqual(w.canvasGroups);
});
