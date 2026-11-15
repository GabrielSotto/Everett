import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { wireframeMaterial } from '../../src/domain/wireframes';
import { addLibrary, libraryTile, dragLibrary, legacyWireframe } from './sketch-library-helpers';
import type { Page } from '@playwright/test';

test('C08-B136: crecer texto conectado y agrupado actualiza cables y conjunto sin perder foco y se deshace junto al contenido', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [
    wireframeMaterial('text', 'growing', { x: 0, y: 0 }),
    wireframeMaterial('button', 'target', { x: 400, y: -160 }),
  ];
  w.canvasGroups = [{ id: 'composition', name: 'Texto conectado', nodes: ['growing', 'target'] }];
  w.links = [{ id: 'wire', from: 'growing', to: 'target', fromAnchor: 'east', toAnchor: 'west' }];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  const text = page.locator('[data-node=growing]'),
    path = page.locator('[data-link=wire] .link-line');
  const group = page.locator('.canvas-manual-group');
  const initialPath = await path.getAttribute('d'),
    initialGroup = (await group.boundingBox())!;
  await text.dblclick();
  // La edición se comprueba como una única ráfaga, sin pausas causadas por el runner.
  await page.clock.setFixedTime(Date.now());
  const field = page.getByRole('textbox', { name: 'Contenido del bosquejo', exact: true });
  await field.fill('Decisión y referencia\n'.repeat(12).trim());
  await expect(field).toBeFocused();
  await field.press('End');
  await field.pressSequentially(' final');
  await expect(field).toBeFocused();
  await expect(text.locator('.wireframe-body')).toContainText(' final');
  const grown = (await world(page)).nodes.find((n) => n.id === 'growing')!;
  const origin = (await path.getAttribute('d'))!.match(/^M\s*([-\d.]+)[,\s]+([-\d.]+)/)!;
  expect(Number(origin[1])).toBeCloseTo(grown.x + grown.width, 4);
  expect(Number(origin[2])).toBeCloseTo(grown.y + grown.height / 2, 4);
  expect((await group.boundingBox())!.height).toBeGreaterThan(initialGroup.height);
  const textBounds = (await text.boundingBox())!,
    groupBounds = (await group.boundingBox())!;
  expect(groupBounds.y + groupBounds.height).toBeGreaterThanOrEqual(
    textBounds.y + textBounds.height,
  );
  await page.keyboard.press('Escape');
  await capture(page, info, 'texto-conectado-y-agrupado');
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes).toEqual(w.nodes);
  await expect(path).toHaveAttribute('d', initialPath!);
  expect((await group.boundingBox())!.height).toBeCloseTo(initialGroup.height, 3);
});

async function drop(page: Page, name: string, x: number, y: number) {
  const ids: Record<string, string> = {
    texto: 'label',
    botón: 'button',
    campo: 'text-field',
    imagen: 'image',
  };
  const added = await dragLibrary(page, ids[name]!, x, y);
  return (
    added.find((n) => n.data.kind === 'wireframe' && n.data.content.type === 'text')?.id ??
    added[0]!.id
  );
}

test('C08-B132: arrastrar desde biblioteca respeta suelta y cámara; cancelar o salir no crea piezas ni bloquea el siguiente clic', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  await page.getByRole('button', { name: /^Zoom de Canvas:/ }).click();
  await page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true }).fill('1');
  await page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true }).press('Enter');
  await addLibrary(page, 'label');
  expect((await snapshot(page)).camera.z).toBeCloseTo(1, 5);
  const initialText = (await world(page)).nodes[0]!;
  const initialBounds = (await page.locator(`[data-node="${initialText.id}"]`).boundingBox())!;
  expect(initialBounds.width).toBeLessThanOrEqual(321);
  expect(initialBounds.height).toBeLessThanOrEqual(33);
  for (const percent of [38, 100, 200]) {
    await page.getByRole('button', { name: /^Zoom de Canvas:/ }).click();
    await page
      .getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true })
      .fill(String(percent));
    await page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true }).press('Enter');
    const camera = (await snapshot(page)).camera;
    await drop(page, 'botón', 1000, 500);
    expect((await snapshot(page)).camera).toEqual(camera);
  }
  const before = (await world(page)).nodes;
  for (const cancel of ['escape', 'outside'] as const) {
    const b = (await (await libraryTile(page, 'label')).boundingBox())!;
    await page.mouse.move(b.x + 15, b.y + 15);
    await page.mouse.down();
    await page.mouse.move(900, 300, { steps: 8 });
    if (cancel === 'escape') await page.keyboard.press('Escape');
    else await page.mouse.move(30, 25);
    await page.mouse.up();
    await expect(page.locator('.library-drag-preview')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Biblioteca de bosquejos' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar biblioteca' }).click();
    expect((await world(page)).nodes).toEqual(before);
  }
  const fieldParts = await addLibrary(page, 'text-field');
  expect((await world(page)).nodes).toHaveLength(before.length + fieldParts.length);
  await capture(page, info, 'arrastre-desde-biblioteca');
});

test('C08-B133: componer sobre una pantalla guardada de teléfono con piezas por arrastre, texto local que crece y formatos libres', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  const screen = await legacyWireframe(page, 'screen');
  const screenNode = page.locator(`[data-node="${screen.id}"]`);
  await expect(screenNode.locator('.wireframe-screen-bar')).toHaveCount(0);
  await screenNode.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Teléfono', exact: true }).click();
  expect((await world(page)).nodes[0]).toMatchObject({ width: 390, height: 844 });
  const frame = (await screenNode.boundingBox())!;
  // Colocar la composición por los mismos gestos disponibles al usuario, sin
  // inyectar una disposición terminada como hacía el caso anterior de nueve piezas.
  const x = frame.x + frame.width / 2;
  const text = await drop(page, 'texto', x, frame.y + 130);
  const textNode = page.locator(`[data-node="${text}"]`);
  await textNode.dblclick();
  const editor = page.locator('.wireframe-inline-editor'),
    field = page.getByRole('textbox', { name: 'Contenido del bosquejo', exact: true });
  const editorRect = (await editor.boundingBox())!,
    textRect = (await textNode.boundingBox())!;
  expect(Math.abs(editorRect.x - textRect.x)).toBeLessThan(12);
  expect(editorRect.height).toBeLessThan(100);
  expect(editorRect.width).toBeLessThan(350);
  const content = 'Bienvenido\nOrganizá tus referencias\nConservá tus decisiones';
  await field.fill(content);
  await page.keyboard.press('Escape');
  await expect(textNode.locator('.wireframe-body')).toHaveText(content);
  const unclipped = await textNode
    .locator('.wireframe-body')
    .evaluate((el) => el.scrollHeight <= el.clientHeight + 1);
  expect(unclipped).toBe(true);
  await drop(page, 'campo', x, frame.y + 290);
  await drop(page, 'botón', x, frame.y + 370);
  await drop(page, 'imagen', x, frame.y + 560);
  const composition = await world(page);
  for (const n of composition.nodes.filter((n) => n.id !== screen.id)) {
    expect(n.x).toBeGreaterThanOrEqual(screen.x);
    expect(n.x + n.width).toBeLessThanOrEqual(screen.x + 390);
  }
  await capture(page, info, 'pantalla-compuesta-con-gestos');
  await page.reload();
  await expect(textNode.locator('.wireframe-body')).toHaveText(content);
  await screenNode.click({ position: { x: 8, y: 8 } });
  // El resize real de pantalla usa los tiradores compartidos, sin bloquear relación de aspecto.
  const resize = screenNode.getByRole('button', { name: 'Redimensionar se', exact: true });
  const corner = (await resize.boundingBox())!;
  await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2);
  await page.mouse.down();
  await page.mouse.move(corner.x + corner.width / 2 + 90, corner.y + corner.height / 2 - 160, {
    steps: 8,
  });
  await page.mouse.up();
  const resized = (await world(page)).nodes.find((n) => n.id === screen.id)!;
  expect(resized.width).toBeGreaterThan(390);
  expect(resized.height).toBeLessThan(844);
  const pieces = (await world(page)).nodes.filter((n) => n.id !== screen.id);
  for (const [name, width, height] of [
    ['Tablet', 768, 1024],
    ['Escritorio', 1280, 800],
  ] as const) {
    await screenNode.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name, exact: true }).click();
    expect((await world(page)).nodes.find((n) => n.id === screen.id)).toMatchObject({
      width,
      height,
    });
    expect((await world(page)).nodes.filter((n) => n.id !== screen.id)).toEqual(pieces);
    await expect(
      screenNode.getByRole('button', { name: 'Redimensionar se', exact: true }),
    ).toBeInViewport();
  }
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes.find((n) => n.id === screen.id)).toMatchObject({
    width: 768,
    height: 1024,
  });
});

test('C08-B135: guías identifican la referencia visible y no ajustan contra un objeto fuera de pantalla', async ({
  page,
}, info) => {
  await start(page);
  for (const visible of [true, false]) {
    const input = await snapshot(page),
      w = input.state.worlds.find((w) => w.id === 'scout')!;
    w.canvasGroups = [];
    w.nodes = [
      {
        ...wireframeMaterial('button', 'moving', { x: 0, y: 0 }),
        x: -300,
        y: -100,
        width: 100,
        height: 60,
      },
      {
        ...wireframeMaterial('button', 'near', { x: 0, y: 0 }),
        x: visible ? 100 : 300,
        y: 100,
        width: 100,
        height: 60,
      },
      {
        ...wireframeMaterial('button', 'far', { x: 0, y: 0 }),
        x: 103,
        y: -6000,
        width: 100,
        height: 60,
      },
    ];
    await storedFixture(page, input.state, input.ui);
    await page.reload();
    const box = (await page.locator('[data-node="moving"]').boundingBox())!;
    await page.mouse.move(box.x + 50, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + 50 + 403, box.y + 30 + 110, { steps: 12 });
    if (visible) {
      const line = page.locator('.alignment-guides line').first();
      await expect(line).toHaveAttribute('x1', '100');
      const matches = page.locator(
        '.alignment-guides g:has(> line[data-snap-source=object][data-snap-target=near])',
      );
      await expect(matches).toHaveCount(3);
      await expect(matches.locator('path')).toHaveCount(6);
      const points = await line.evaluate((el) => [
        Number(el.getAttribute('y1')),
        Number(el.getAttribute('y2')),
      ]);
      expect(Math.min(...points)).toBeGreaterThan(-100);
      expect(Math.max(...points)).toBeLessThan(300);
      await capture(page, info, 'guia-con-referencia-visible');
    } else await expect(page.locator('.alignment-guides')).toHaveCount(0);
    await page.mouse.up();
    expect((await world(page)).nodes.find((n) => n.id === 'moving')!.x).toBeCloseTo(
      visible ? 100 : 103,
      3,
    );
  }
});

test('C08-B134: espaciar selecciones inicialmente solapadas opera en ambos ejes y repetir no añade historial', async ({
  page,
}, info) => {
  await start(page);
  for (const axis of ['x', 'y'] as const) {
    const input = await snapshot(page),
      w = input.state.worlds.find((w) => w.id === 'scout')!;
    w.canvasGroups = [];
    w.nodes = [0, 20, 75].map((p, i) => ({
      ...wireframeMaterial('card', 'overlap-' + i, { x: 0, y: 0 }),
      x: axis === 'x' ? p : -350 + i * 300,
      y: axis === 'y' ? p : -200 + i * 180,
      width: [80, 65, 90][i]!,
      height: [80, 65, 90][i]!,
    }));
    await storedFixture(page, input.state, input.ui);
    await page.reload();
    for (const [i, n] of w.nodes.entries())
      await page.locator(`[data-node="${n.id}"]`).click({ modifiers: i ? ['Shift'] : [] });
    const action = axis === 'x' ? 'Espaciar horizontalmente' : 'Espaciar verticalmente';
    const organize = async () => {
      await page.getByRole('button', { name: 'Alinear selección', exact: true }).click();
      await expect(page.getByRole('menuitem', { name: action, exact: true })).toBeEnabled();
      await page.getByRole('menuitem', { name: action, exact: true }).click();
    };
    await organize();
    const after = (await world(page)).nodes,
      size = axis === 'x' ? 'width' : 'height';
    expect(
      after[1]![axis] + after[1]![size] / 2 - after[0]![axis] - after[0]![size] / 2,
    ).toBeCloseTo(after[2]![axis] + after[2]![size] / 2 - after[1]![axis] - after[1]![size] / 2, 5);
    await organize();
    expect((await world(page)).nodes).toEqual(after);
    await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
    expect((await world(page)).nodes).toEqual(w.nodes);
  }
  await capture(page, info, 'distribucion-con-solapamiento');
});
