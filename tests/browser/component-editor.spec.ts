import { test, expect } from './fixtures';
import { start, world, snapshot, capture } from './canvas-utility-helpers';
import { addLibrary, openLibrary } from './sketch-library-helpers';
import { storedFixture } from './canvas-fixtures';
import { instantiateLibrary, type LibraryComposition } from '../../src/domain/sketch-library';
import {
  componentElements,
  elementRect,
  validComponentTree,
} from '../../src/domain/component-tree';
import type { Page } from '@playwright/test';

test.use({ confirmationMode: 'manual' });

const recipe: LibraryComposition = {
  name: 'Formulario reutilizable',
  width: 320,
  height: 220,
  parts: [0, 1, 2].map((i) => ({
    name: `Campo ${i + 1}`,
    x: 0,
    y: i * 65,
    width: 160,
    height: 42,
    content: {
      type: 'text',
      text: `Etiqueta ${i + 1}`,
      piece: { style: { fontSize: '16px', color: '#111111', backgroundColor: '#eeeeee' } },
    },
  })),
};

test('C08-B184: componer desde piezas, convertir, anidar e incorporar otra pieza sin desagrupar', async ({
  page,
}, info) => {
  await start(page);
  const a = await addLibrary(page, 'block'),
    b = await addLibrary(page, 'label');
  expect(a).toHaveLength(1);
  expect(b).toHaveLength(1);
  const boxes = await Promise.all(
    [...a, ...b].map((n) => page.locator(`[data-node="${n.id}"]`).boundingBox()),
  );
  const left = Math.min(...boxes.map((r) => r!.x)) - 20,
    top = Math.min(...boxes.map((r) => r!.y)) - 20,
    right = Math.max(...boxes.map((r) => r!.x + r!.width)) + 20,
    bottom = Math.max(...boxes.map((r) => r!.y + r!.height)) + 20;
  await page.mouse.move(left, top);
  await page.mouse.down();
  await page.mouse.move(right, bottom, { steps: 12 });
  await page.mouse.up();
  expect((await snapshot(page)).ui.canvas.selections).toHaveLength(2);
  await page.locator(`[data-node="${b[0]!.id}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Crear conjunto', exact: true }).click();
  await page.getByRole('button', { name: 'Crear componente', exact: true }).click();
  const panel = page.locator('.component-inspector');
  await panel.locator('[data-part]').first().click();
  await panel
    .locator('[data-part]')
    .last()
    .click({ modifiers: ['Shift'] });
  await panel.getByRole('button', { name: 'Agrupar selección en contenedor' }).click();
  let group = (await world(page)).canvasGroups![0]!;
  const child = group.structure!.root.children[0]!;
  expect(child.children).toHaveLength(2);
  await panel.locator(`.component-children [data-part="${child.id}"]`).click();
  await panel.getByLabel('Distribución', { exact: true }).selectOption('column');
  await panel.getByLabel('Espacio', { exact: true }).fill('24');
  await panel.getByLabel('Espacio', { exact: true }).press('Enter');
  group = (await world(page)).canvasGroups![0]!;
  const children = group.structure!.root.children[0]!.children;
  expect(children[1]!.y - children[0]!.y - children[0]!.height).toBe(24);
  await panel.getByRole('button', { name: 'Terminar edición', exact: true }).click();
  const loose = await addLibrary(page, 'paragraph');
  await page.locator(`[data-action=component-edit][data-id="${group.id}"]`).click();
  const paragraph = (await world(page)).canvasGroups!.find((g) => g.nodes.includes(loose[0]!.id))!;
  await panel.getByText('Anidar un componente', { exact: true }).click();
  await panel.getByLabel('Componente del Canvas', { exact: true }).selectOption(paragraph.id);
  await panel.getByRole('button', { name: 'Anidar en este contenedor' }).click();
  expect((await world(page)).canvasGroups![0]!.nodes).toHaveLength(2 + loose.length);
  expect((await world(page)).canvasGroups).toHaveLength(1);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addStyleTag({ content: '.component-inspector{font-size:26px}' });
  expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await capture(page, info, 'composicion-desde-piezas-texto-200');
});
async function fixture(page: Page) {
  await start(page);
  const data = await snapshot(page),
    w = data.state.worlds.find((w) => w.id === 'scout')!;
  const result = instantiateLibrary(recipe, 'editable', { x: -200, y: 0 });
  w.nodes = result.nodes;
  w.canvasGroups = [result.group!];
  data.ui.canvas.selections = result.nodes.map((n) => n.id);
  data.ui.canvas.selection = result.nodes[0]!.id;
  await storedFixture(page, data.state, data.ui);
  await page.reload();
  await expect(page.locator('[data-node=editable]')).toBeVisible();
  await page.locator('[data-action=component-edit][data-id=editable-group]').click();
  return page.getByRole('complementary', { name: 'Editar componente' });
}

test('C08-B186: borrar partes y deshacer niveles permite seguir editando; retirar el componente cierra su editor', async ({
  page,
}) => {
  const panel = await fixture(page);
  await panel.locator('[data-part=part-0]').click();
  await page.locator('#canvas-stage').focus();
  await page.keyboard.press('Delete');
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  expect((await world(page)).nodes).toHaveLength(2);
  const root = (await world(page)).canvasGroups![0]!.structure!.root;
  expect((await snapshot(page)).ui.canvas.componentEditing?.selected).toBe(root.id);
  await panel.getByLabel('Ancho', { exact: true }).fill('360');
  await panel.getByLabel('Ancho', { exact: true }).press('Enter');
  expect((await world(page)).canvasGroups![0]!.structure!.root.width).toBe(360);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes).toHaveLength(3);
  await panel.locator('[data-part=part-0]').click();
  await panel.locator('[data-part=part-1]').click({ modifiers: ['Shift'] });
  await panel.getByRole('button', { name: 'Agrupar selección en contenedor' }).click();
  const nested = (await world(page)).canvasGroups![0]!.structure!.root.children.find(
    (e) => e.children.length,
  )!;
  await panel.locator(`.component-children [data-part="${nested.id}"]`).click();
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await snapshot(page)).ui.canvas.componentEditing?.element).toBe(root.id);
  await panel.getByLabel('Distribución', { exact: true }).selectOption('column');
  expect((await world(page)).canvasGroups![0]!.structure!.root.layout.direction).toBe('column');
  await panel.getByRole('button', { name: 'Terminar edición', exact: true }).click();
  await page.locator('[data-node=editable]').click();
  await page.locator('[data-action=component-edit][data-id=editable-group]').click();
  await page.locator('#canvas-stage').focus();
  await page.keyboard.press('Delete');
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(panel).toBeHidden();
  expect((await snapshot(page)).ui.canvas.componentEditing).toBeUndefined();
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await page.locator('[data-action=component-edit][data-id=editable-group]').click();
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Terminar edición', exact: true }).click();
  await page.locator('[data-node=editable]').click();
  const hand = page.getByRole('button', { name: 'Panear · H', exact: true });
  await hand.focus();
  await hand.press('Enter');
  await expect(hand).toHaveAttribute('aria-pressed', 'true');
  await expect(panel).toBeHidden();
  const select = page.getByRole('button', { name: 'Seleccionar · V', exact: true });
  await select.focus();
  await select.press('Enter');
  await page.locator('[data-node=editable]').click();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
});

test('C08-B185: nombres se representan como texto y la raíz de capas coincide con el inspector', async ({
  page,
}) => {
  const panel = await fixture(page);
  const name = 'Acceso <img src=x onerror="window.badName=1"> & registro';
  await panel.getByRole('textbox', { name: 'Nombre', exact: true }).fill(name);
  await panel.getByRole('textbox', { name: 'Nombre', exact: true }).press('Enter');
  await expect(panel.locator('.inspector-root [data-enter]')).toHaveAccessibleName(name);
  await expect(panel.locator('.inspector-root [data-enter] span')).toHaveText(name);
  await panel.locator('[data-part=part-0]').click();
  await expect(
    panel.getByLabel('Contenedor', { exact: true }).locator('option').first(),
  ).toHaveText(name);
  expect(await panel.locator('img').count()).toBe(0);
  expect(await page.evaluate(() => 'badName' in window)).toBe(false);
  await page.reload();
  expect((await world(page)).canvasGroups![0]!.name).toBe(name);
});
test('C08-B174: catálogo conserva jerarquía y geometría; entrar no separa ni desplaza las partes', async ({
  page,
}, info) => {
  await start(page);
  const nodes = await addLibrary(page, 'button');
  let w = await world(page),
    g = w.canvasGroups!.at(-1)!;
  expect(validComponentTree(g.structure, g.nodes)).toBe(true);
  for (const e of componentElements(g.structure!.root).filter((e) => e.material)) {
    const n = w.nodes.find((n) => n.id === e.material)!,
      r = elementRect(g.structure!, e.id)!;
    expect(r.x).toBeCloseTo(n.x, 3);
    expect(r.y).toBeCloseTo(n.y, 3);
    expect(r.width).toBeCloseTo(n.width, 3);
  }
  const before = structuredClone(w.nodes);
  await page.locator(`[data-action=component-edit][data-id="${g.id}"]`).click();
  await expect(page.locator('.component-inspector')).toBeVisible();
  expect((await world(page)).nodes).toEqual(before);
  const row = page.locator('.component-children [data-part]').first();
  await row.click();
  await capture(page, info, 'edicion-interna-del-boton');
  await page.getByRole('button', { name: 'Terminar edición', exact: true }).click();
  expect((await world(page)).canvasGroups!.at(-1)!.nodes).toEqual(nodes.map((n) => n.id));
});
test('C08-B175: fila y columnas, medidas y edición interna se conservan al recargar sin cambiar tipografía', async ({
  page,
}, info) => {
  const panel = await fixture(page);
  await panel.getByLabel('Distribución', { exact: true }).selectOption('row');
  await panel.getByLabel('Ancho', { exact: true }).fill('560');
  await panel.getByLabel('Ancho', { exact: true }).press('Enter');
  await panel.getByLabel('Margen interno', { exact: true }).fill('16');
  await panel.getByLabel('Margen interno', { exact: true }).press('Enter');
  await panel.getByLabel('Espacio', { exact: true }).fill('20');
  await panel.getByLabel('Espacio', { exact: true }).press('Enter');
  const group = (await world(page)).canvasGroups![0]!,
    children = group.structure!.root.children;
  expect(children[0]!.x).toBe(16);
  expect(children[1]!.x - children[0]!.x - children[0]!.width).toBe(20);
  const beforeDrag = await world(page);
  await page.locator('[data-node=editable]').click();
  const frame = page.locator('[data-component=editable-group]');
  const frameBefore = await frame.boundingBox();
  const from = (await page.locator('[data-node=editable]').boundingBox())!;
  const to = (await page.locator('[data-node="editable-1"]').boundingBox())!;
  const drag = async () => {
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width * 0.9, to.y + to.height / 2, { steps: 16 });
  };
  await drag();
  expect(await frame.boundingBox()).toEqual(frameBefore);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await world(page)).nodes).toEqual(beforeDrag.nodes);
  expect((await snapshot(page)).ui.canvas.componentEditing?.group).toBe(group.id);
  await drag();
  await page.mouse.up();
  const reordered = (await world(page)).canvasGroups![0]!.structure!.root.children;
  expect(reordered.map((e) => e.id)).toEqual(['part-1', 'part-0', 'part-2']);
  expect(reordered[1]!.x - reordered[0]!.x - reordered[0]!.width).toBe(20);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes).toEqual(beforeDrag.nodes);
  await panel.locator('[data-part=part-0]').click();
  await panel.getByRole('button', { name: 'Editar contenido y apariencia' }).click();
  await page
    .getByRole('textbox', { name: 'Contenido del bosquejo', exact: true })
    .fill('Rótulo editado dentro del componente');
  await page.keyboard.press('Escape');
  expect((await world(page)).canvasGroups![0]!.nodes).toHaveLength(3);
  const before = await world(page);
  await page.reload();
  await expect(page.locator('[data-node=editable]')).toBeVisible();
  expect((await world(page)).nodes).toEqual(before.nodes);
  expect((await world(page)).canvasGroups).toEqual(before.canvasGroups);
  await capture(page, info, 'distribucion-y-edicion-conservadas');
});
test('C08-B176: guardar, insertar independiente y vinculado requiere actualización intencional', async ({
  page,
}, info) => {
  let panel = await fixture(page);
  await panel.getByText('Reutilizar', { exact: true }).click();
  await panel.getByRole('button', { name: 'Guardar composición', exact: true }).click();
  expect((await world(page)).compositions).toHaveLength(1);
  await panel.getByRole('button', { name: 'Terminar edición', exact: true }).click();
  const library = await openLibrary(page);
  await library.getByText('Mis composiciones (1)', { exact: true }).click();
  await library.locator('[data-saved]').click();
  let w = await world(page);
  expect(w.canvasGroups).toHaveLength(2);
  expect(w.canvasGroups![1]!.recipe).toBeUndefined();
  await openLibrary(page);
  await page.getByText('Mis composiciones (1)', { exact: true }).click();
  await page.getByLabel('Permitir actualizaciones manuales').check();
  await page.locator('[data-saved]').click();
  w = await world(page);
  expect(w.canvasGroups![2]!.recipe?.revision).toBe(1);
  await page.locator(`[data-action=component-edit][data-id="${w.canvasGroups![2]!.id}"]`).click();
  panel = page.locator('.component-inspector');
  await panel.getByText('Reutilizar', { exact: true }).click();
  await expect(
    panel.getByRole('button', { name: 'Actualizar esta copia desde biblioteca' }),
  ).toBeVisible();
  const independent = structuredClone(
    w.nodes.filter((n) => w.canvasGroups![1]!.nodes.includes(n.id)),
  );
  await panel.getByLabel('Ancho', { exact: true }).fill('460');
  await panel.getByLabel('Ancho', { exact: true }).press('Enter');
  await panel.getByRole('button', { name: 'Actualizar composición guardada', exact: true }).click();
  expect((await world(page)).compositions![0]!.revision).toBe(2);
  expect((await world(page)).canvasGroups![2]!.recipe!.revision).toBe(1);
  await panel
    .getByRole('button', { name: 'Actualizar esta copia desde biblioteca', exact: true })
    .click();
  expect((await world(page)).canvasGroups![2]!.recipe!.revision).toBe(2);
  expect((await world(page)).nodes.filter((n) => w.canvasGroups![1]!.nodes.includes(n.id))).toEqual(
    independent,
  );
  await capture(page, info, 'reutilizacion-explicita');
});
test('C08-B177: recorrido entre pantallas vuelve por historial y restaura cámara; inspector entra a 320px', async ({
  page,
}, info) => {
  let panel = await fixture(page);
  await panel.getByRole('button', { name: 'Terminar edición', exact: true }).click();
  await page.locator('[data-node=editable]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Duplicar', exact: true }).click();
  const w = await world(page),
    destination = w.canvasGroups![1]!;
  await page.locator('[data-action=component-edit][data-id=editable-group]').click();
  panel = page.locator('.component-inspector');
  await panel.getByText('Recorrido', { exact: true }).click();
  await panel.getByLabel('Ir a', { exact: true }).selectOption(destination.id);
  await panel.getByRole('button', { name: 'Consultar recorrido' }).click();
  await expect(page.locator('#shell')).toHaveAttribute('inert', '');
  const sourcePart = page.locator('[data-node=editable]'),
    destinationPart = page.locator(`[data-node="${destination.nodes[0]}"]`);
  await expect(sourcePart).toBeVisible();
  await expect(destinationPart).toBeHidden();
  await capture(page, info, 'consulta-pantalla');
  const consulted = structuredClone((await world(page)).nodes);
  await page.locator('#canvas-stage').focus();
  await page.keyboard.press('Delete');
  expect((await world(page)).nodes).toEqual(consulted);
  await panel.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(panel.locator('header strong')).toHaveText(destination.name);
  await expect(destinationPart).toBeVisible();
  await expect(sourcePart).toBeHidden();
  await panel.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(panel.locator('header strong')).toHaveText('Formulario reutilizable');
  await expect(sourcePart).toBeVisible();
  await expect(destinationPart).toBeHidden();
  await panel.getByRole('button', { name: 'Salir del recorrido' }).click();
  await expect(page.locator('#shell')).not.toHaveAttribute('inert', '');
  await expect(sourcePart).toBeVisible();
  await expect(destinationPart).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  await expect(panel).toBeVisible();
  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  const pane = (await page.locator('#canvas-inspector').boundingBox())!;
  expect(pane.height).toBeLessThanOrEqual(280);
  expect(pane.y).toBeGreaterThan(300);
  expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await capture(page, info, 'inspector-320');
});

for (const [index, entry] of [
  'login',
  'dashboard',
  'search-results',
  'chat-app',
  'booking-mobile',
  'product-detail',
].entries()) {
  test(`C08-B${178 + index}: editar ${entry} a varios niveles, refinar contenido, resize y recarga conserva su composición`, async ({
    page,
  }, info) => {
    await start(page);
    const nodes = await addLibrary(page, entry),
      w = await world(page),
      group = w.canvasGroups!.at(-1)!;
    expect(validComponentTree(group.structure, group.nodes)).toBe(true);
    const elements = componentElements(group.structure!.root);
    expect(elements.some((e) => e.children.some((c) => c.children.length))).toBe(true);
    for (const element of elements.filter((e) => e.material)) {
      const rect = elementRect(group.structure!, element.id)!,
        node = nodes.find((n) => n.id === element.material)!;
      expect(rect.x).toBeCloseTo(node.x, 2);
      expect(rect.y).toBeCloseTo(node.y, 2);
    }
    await page.locator(`[data-action=component-edit][data-id="${group.id}"]`).click();
    const panel = page.locator('.component-inspector');
    // Recorrer las ramas reales del catálogo por los controles de entrada.
    const leaf = elements.find(
      (e) =>
        e.material &&
        nodes.some(
          (n) =>
            n.id === e.material && n.data.kind === 'wireframe' && n.data.content.type === 'text',
        ),
    )!;
    const path = [leaf];
    let parent = elements.find((e) => e.children.some((c) => c.id === leaf.id));
    while (parent) {
      path.unshift(parent);
      const id = parent.id;
      parent = elements.find((e) => e.children.some((c) => c.id === id));
    }
    for (const part of path.slice(1, -1))
      await panel.locator(`.component-children [data-expand="${part.id}"]`).click();
    await panel.locator(`[data-part="${leaf.id}"]`).click();
    await panel.getByRole('button', { name: 'Editar contenido y apariencia' }).click();
    const label = page.getByRole('textbox', { name: 'Contenido del bosquejo', exact: true });
    await label.fill('Revisar información · información completa y contextual');
    await page.keyboard.press('Escape');
    expect((await world(page)).nodes.find((n) => n.id === leaf.material)!.data).not.toEqual(
      nodes.find((n) => n.id === leaf.material)!.data,
    );
    expect((await world(page)).canvasGroups!.at(-1)!.nodes).toEqual(group.nodes);
    const refined = (await world(page)).nodes.find((n) => n.id === leaf.material)!;
    const original = nodes.find((n) => n.id === leaf.material)!;
    const intersects = (a: typeof refined, b: typeof refined) =>
      Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
      Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;
    for (const other of (await world(page)).nodes.filter(
      (n) => n.id !== refined.id && n.data.kind === 'wireframe' && n.data.content.type === 'text',
    )) {
      const previous = nodes.find((n) => n.id === other.id)!;
      if (!intersects(original, previous))
        expect(intersects(refined, other), `El contenido editado invade ${other.id}`).toBe(false);
    }
    await panel.locator(`.inspector-root [data-enter="${group.structure!.root.id}"]`).click();
    const before = await world(page),
      fonts = before.nodes.map((n) =>
        n.data.kind === 'wireframe' ? n.data.content.piece?.style.fontSize : undefined,
      );
    await panel
      .getByLabel('Ancho', { exact: true })
      .fill(String(Math.round(group.structure!.root.width + 100)));
    await panel.getByLabel('Ancho', { exact: true }).press('Enter');
    expect(
      (await world(page)).nodes.map((n) =>
        n.data.kind === 'wireframe' ? n.data.content.piece?.style.fontSize : undefined,
      ),
    ).toEqual(fonts);
    if (entry === 'booking-mobile') {
      const numbers = (await world(page)).nodes.filter(
        (n) =>
          n.data.kind === 'wireframe' &&
          !n.data.content.placeholder &&
          n.data.content.type === 'text' &&
          /^\d{2}$/.test(n.data.content.text),
      );
      expect(numbers.length).toBeGreaterThan(20);
      for (const number of numbers) {
        const ink = await page
          .locator(`[data-node="${number.id}"] [data-library-piece]`)
          .evaluate((e) => {
            const range = document.createRange();
            range.selectNodeContents(e);
            const lines = [...range.getClientRects()];
            const box = e.getBoundingClientRect();
            return {
              text: e.textContent,
              lines: lines.length,
              clipped: lines.some((r) => r.bottom > box.bottom + 0.5 || r.right > box.right + 0.5),
            };
          });
        expect(ink, `El día ${ink.text} debe conservar todos sus dígitos`).toMatchObject({
          lines: 1,
          clipped: false,
        });
      }
    }
    await capture(page, info, `${entry}-edicion-jerarquia`);
    const persisted = await world(page);
    await page.reload();
    await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
    expect((await world(page)).canvasGroups).toEqual(persisted.canvasGroups);
    expect((await world(page)).nodes).toEqual(persisted.nodes);
  });
}
