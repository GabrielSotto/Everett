import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, snapshot, world, capture, moveMaterial, connect } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { wireframeKinds, wireframeMaterial, type WireframeKind } from '../../src/domain/wireframes';
import { legacyWireframe, openLibrary, librarySearch } from './sketch-library-helpers';
import { isWireframeComposition } from '../../src/domain/wireframe-compositions';

async function add(page: Page, type: WireframeKind): Promise<string> {
  return (await legacyWireframe(page, type)).id;
}
async function openEditor(page: Page, id: string): Promise<void> {
  await page.locator(`[data-node="${id}"]`).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.wireframe-editor')).toBeVisible();
}
async function zoom(page: Page, percent: number): Promise<void> {
  await page.getByRole('button', { name: /^Zoom de Canvas:/ }).click();
  await page
    .getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true })
    .fill(String(percent));
  await page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true }).press('Enter');
  await expect.poll(async () => (await snapshot(page)).camera.z).toBeCloseTo(percent / 100, 5);
}

test('C08-B126: bosquejos guardados del catálogo anterior permiten editar contenido y conserva una composición tras recargar', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await start(page);
  const ids = new Map<WireframeKind, string>();
  for (const type of wireframeKinds.filter((kind) => !isWireframeComposition(kind))) {
    const id = await add(page, type);
    ids.set(type, id);
    if (type === 'table') continue;
    if (type === 'screen') {
      await page.locator(`[data-node="${id}"] .wireframe-body`).dblclick();
      await expect(page.locator('.wireframe-editor')).toBeVisible();
    } else await openEditor(page, id);
    const value = {
      screen: 'Proyecto Everett',
      block: '',
      text: 'Organizar el trabajo',
      button: 'Crear tarea',
      input: 'Buscar materiales…',
      card: 'Decisiones\nConservar el contexto y sus referencias',
      list: 'Documentación\nArquitectura\nPróximos pasos',
      image: 'Referencia visual',
      menu: 'Resumen\nMateriales\nTareas',
      video: 'Presentación del proyecto',
      carousel: 'Referencia uno\nReferencia dos\nReferencia tres',
    }[type];
    if (['list', 'menu', 'carousel'].includes(type)) {
      for (const [index, line] of value.split('\n').entries())
        await page
          .getByRole('textbox', { name: 'Elemento ' + (index + 1), exact: true })
          .fill(line);
    } else
      await page.getByRole('textbox', { name: 'Contenido del bosquejo', exact: true }).fill(value);
    if (type === 'screen') {
      await expect(page.locator(`[data-node="${id}"] .material-identification button`)).toHaveText(
        value,
      );
      await expect(page.locator(`[data-node="${id}"]`)).toHaveAttribute('aria-label', value);
    }
    await page.keyboard.press('Escape');
    const node = (await world(page)).nodes.find((n) => n.id === id)!;
    expect(
      node.data.kind === 'wireframe' &&
        node.data.content.type !== 'table' &&
        node.data.content.text,
    ).toBe(value);
  }
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  const layout: Record<WireframeKind, [number, number, number, number]> = {
    screen: [-450, -300, 900, 620],
    block: [480, 260, 160, 100],
    text: [-410, -230, 450, 60],
    menu: [-420, -140, 180, 240],
    input: [-210, -130, 300, 44],
    button: [130, -130, 150, 44],
    card: [-210, -50, 250, 150],
    image: [70, -50, 320, 150],
    table: [-210, 130, 600, 130],
    list: [-420, 130, 180, 140],
    video: [480, -250, 320, 180],
    carousel: [480, 0, 320, 200],
  };
  for (const [type, id] of ids) {
    const [x, y, width, height] = layout[type];
    Object.assign(
      w.nodes.find((n) => n.id === id)!,
      { x, y, width, height },
    );
  }
  input.state.camera = { x: 0, y: -50, z: 1 };
  input.ui.canvas.selection = null;
  input.ui.canvas.selections = [];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);
  await expect(page.locator('.material.wireframe')).toHaveCount(ids.size);
  await expect(page.locator('.wireframe-body').filter({ hasText: 'Crear tarea' })).toBeVisible();
  const contrast = await page
    .locator(`[data-node="${ids.get('text')}"] .wireframe-content`)
    .evaluate((element) => {
      const luminance = (color: string) => {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
      };
      const ratio = () => {
        const style = getComputedStyle(element);
        const a = luminance(style.color),
          b = luminance(style.backgroundColor);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const actual = ratio();
      const node = element as HTMLElement;
      node.style.color = '#dde5ed';
      const counterexample = ratio();
      node.style.color = '';
      return { actual, counterexample };
    });
  expect(contrast.actual).toBeGreaterThanOrEqual(4.5);
  expect(contrast.counterexample).toBeLessThan(4.5);
  expect((await world(page)).nodes).toEqual(w.nodes);
  await capture(page, info, 'composicion-de-bosquejo');
});

test('C08-B127: tabla edita, agrega y quita la fila elegida, pega rangos y conserva datos con Undo y copia', async ({
  page,
  context,
}, info) => {
  test.setTimeout(90000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await start(page);
  const id = await add(page, 'table');
  await openEditor(page, id);
  const editor = page.getByRole('dialog', { name: 'Editar tabla', exact: true });
  await editor
    .getByRole('textbox', { name: 'Fila 2, columna 1', exact: true })
    .fill('Arquitectura');
  await editor.getByRole('textbox', { name: 'Fila 2, columna 1', exact: true }).press('Enter');
  await expect(
    editor.getByRole('textbox', { name: 'Fila 3, columna 1', exact: true }),
  ).toBeFocused();
  await editor.getByRole('button', { name: 'Agregar fila', exact: true }).click();
  await editor.getByRole('button', { name: 'Agregar columna', exact: true }).click();
  await expect(editor.locator('input[data-cell-row]')).toHaveCount(16);
  await editor.getByRole('textbox', { name: 'Fila 3, columna 2', exact: true }).focus();
  await editor.getByRole('button', { name: 'Quitar fila', exact: true }).click();
  await editor.getByRole('button', { name: 'Quitar columna', exact: true }).click();
  await expect(editor.locator('input[data-cell-row]')).toHaveCount(9);
  await page.evaluate(() => navigator.clipboard.writeText('Revisión\tGabi\nLista\tMilo'));
  await editor.getByRole('textbox', { name: 'Fila 2, columna 2', exact: true }).focus();
  await page.keyboard.press('Control+v');
  await expect(editor.getByRole('textbox', { name: 'Fila 3, columna 3', exact: true })).toHaveValue(
    'Milo',
  );
  await page.keyboard.press('Escape');
  const filled = (await world(page)).nodes.find((n) => n.id === id)!.data;
  await page.keyboard.press('Control+d');
  const copy = (await world(page)).nodes.at(-1)!;
  await openEditor(page, copy.id);
  await page
    .getByRole('textbox', { name: 'Fila 2, columna 1', exact: true })
    .fill('Alternativa independiente');
  await page.keyboard.press('Escape');
  expect((await world(page)).nodes.find((n) => n.id === id)!.data).toEqual(filled);
  await page.keyboard.press('Control+z');
  expect((await world(page)).nodes.find((n) => n.id === copy.id)!.data).toEqual(copy.data);
  await page.keyboard.press('Control+Shift+z');
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);
  await openEditor(page, copy.id);
  await expect(page.getByRole('textbox', { name: 'Fila 2, columna 1', exact: true })).toHaveValue(
    'Alternativa independiente',
  );
  await capture(page, info, 'tabla-editable');
});

test('C08-B128: piezas usan selección, guías, tamaño, capas, grupos y conexiones existentes durante zoom e historial', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [
    wireframeMaterial('screen', 'screen', { x: 0, y: 0 }),
    wireframeMaterial('button', 'button', { x: -140, y: 0 }),
    wireframeMaterial('input', 'input', { x: 160, y: 0 }),
  ];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);
  await moveMaterial(page, 'button', 550, 420);
  const moved = (await world(page)).nodes.find((n) => n.id === 'button')!;
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+Shift+z');
  expect((await world(page)).nodes.find((n) => n.id === 'button')).toEqual(moved);
  await connect(page, 'button', 'input', 'Abre búsqueda');
  await page.locator('[data-node=button]').click();
  const handle = page.locator('[data-node=button] [data-corner=se]');
  const h = await handle.boundingBox();
  if (!h) throw Error('No hay tirador de tamaño');
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + 55, h.y + 30, { steps: 8 });
  const live = await page.locator('[data-node=button]').evaluate((element) => {
    const svg = element.querySelector<SVGSVGElement>('.wireframe-border')!;
    const viewBox = svg.viewBox.baseVal;
    return {
      width: parseFloat(getComputedStyle(element).width),
      height: parseFloat(getComputedStyle(element).height),
      svgWidth: viewBox.width,
      svgHeight: viewBox.height,
    };
  });
  expect(live.svgWidth).toBeCloseTo(live.width, 4);
  expect(live.svgHeight).toBeCloseTo(live.height, 4);
  // Antes de soltar, el modelo se conserva y el borde representa el tamaño transitorio.
  expect((await world(page)).nodes.find((n) => n.id === 'button')).toEqual(moved);
  await page.mouse.up();
  const resized = (await world(page)).nodes.find((n) => n.id === 'button')!;
  expect(resized.width).toBeGreaterThan(moved.width);
  const path = await page.locator('[data-node=button] .wireframe-border').innerHTML();
  for (const z of [10, 40, 100, 200, 600, 100]) {
    await zoom(page, z);
    expect(await page.locator('[data-node=button] .wireframe-border').innerHTML()).toBe(path);
    expect((await world(page)).nodes.find((n) => n.id === 'button')).toEqual(resized);
  }
  await page.locator('[data-node=button]').click();
  await page.locator('[data-node=input]').click({ modifiers: ['Shift'] });
  await page.locator('[data-node=button]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Crear conjunto', exact: true }).click();
  const group = (await world(page)).canvasGroups!.at(-1)!;
  expect(group.nodes.sort()).toEqual(['button', 'input']);
  await page.keyboard.press('Control+d');
  expect((await world(page)).canvasGroups!.length).toBe(2);
  expect((await world(page)).links.length).toBe(2);
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  expect((await world(page)).canvasGroups!.length).toBe(3);
  expect((await world(page)).links.length).toBe(3);
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);
  expect((await world(page)).canvasGroups!.length).toBe(3);
  await capture(page, info, 'bosquejos-conjunto-y-conexiones');
});

test('C08-B129: tablas y listas extensas acotan preview, rechazan pegado excesivo y preservan todo el contenido', async ({
  page,
  context,
}, info) => {
  test.setTimeout(90000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  const table = wireframeMaterial('table', 'limits', { x: 0, y: 0 });
  table.data = {
    kind: 'wireframe',
    title: 'Tabla extensa',
    content: {
      type: 'table',
      cells: Array.from({ length: 100 }, (_, r) =>
        Array.from({ length: 20 }, (_, c) => `${r}:${c}`),
      ),
    },
  };
  w.nodes = [table, wireframeMaterial('menu', 'long-menu', { x: -400, y: 0 })];
  const menu = w.nodes[1]!;
  menu.data = {
    kind: 'wireframe',
    title: 'Menú extenso',
    content: {
      type: 'menu',
      text: Array.from({ length: 1000 }, (_, i) => 'Sección ' + i).join('\n'),
    },
  };
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);
  await expect(page.locator('[data-node=limits] td,[data-node=limits] th')).toHaveCount(48);
  await expect(page.locator('[data-node=long-menu] li')).toHaveCount(12);
  await expect(page.locator('[data-node=long-menu] .wireframe-overflow')).toHaveText(
    '1000 opciones',
  );
  await openEditor(page, 'limits');
  const editor = page.getByRole('dialog', { name: 'Editar tabla', exact: true });
  await expect(editor.getByRole('button', { name: 'Agregar fila', exact: true })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'Agregar columna', exact: true })).toBeDisabled();
  await page.evaluate(() => navigator.clipboard.writeText('A\tB\nC\tD'));
  await editor.getByRole('textbox', { name: 'Fila 100, columna 20', exact: true }).focus();
  await page.keyboard.press('Control+v');
  await expect(
    page.getByText(
      'La tabla admite 100 filas, 20 columnas y 100 000 caracteres. Pegá un rango menor.',
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  expect((await world(page)).nodes.find((n) => n.id === 'limits')!.data).toEqual(table.data);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  await editor.getByRole('textbox', { name: 'Fila 100, columna 20', exact: true }).focus();
  await expect(
    editor.getByRole('button', { name: 'Cerrar edición de bosquejo', exact: true }),
  ).toBeInViewport();
  const bounds = (await editor.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(70);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(700);
  await expect(
    editor.getByRole('textbox', { name: 'Fila 100, columna 20', exact: true }),
  ).toBeInViewport();
  await capture(page, info, 'tabla-320-texto200');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => (document.documentElement.style.fontSize = ''));
  await openEditor(page, 'long-menu');
  await expect(page.getByRole('textbox', { name: 'Elemento 1', exact: true })).toHaveValue(
    'Sección 0',
  );
  await expect(page.locator('[data-item-index]')).toHaveCount(20);
  await page.getByRole('button', { name: 'Siguientes', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Elemento 21', exact: true })).toHaveValue(
    'Sección 20',
  );
  expect((await world(page)).nodes.find((n) => n.id === 'long-menu')!.data).toEqual(menu.data);
  await page.keyboard.press('Escape');
  await capture(page, info, 'limites-de-bosquejos');
});

test('C08-B130: biblioteca y editor funcionan por teclado a 320px y texto 200%, no mueven el fondo ni retienen listeners', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  const id = await add(page, 'input');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  await page.getByRole('button', { name: 'Bosquejos', exact: true }).click();
  await page.getByRole('button', { name: 'Bosquejos', exact: true }).press('ArrowDown');
  const palette = await openLibrary(page);
  const p = (await palette.boundingBox())!;
  expect(p.x).toBeGreaterThanOrEqual(0);
  expect(p.x + p.width).toBeLessThanOrEqual(320);
  await (await librarySearch(page)).fill('Tabla de datos');
  await expect(
    palette.getByRole('button', { name: 'Agregar Tabla de datos', exact: true }),
  ).toBeInViewport();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await openEditor(page, id);
  const camera = (await snapshot(page)).camera;
  await page.locator('.wireframe-editor').hover();
  await page.mouse.wheel(0, 160);
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, 100);
  await page.keyboard.up('Alt');
  expect((await snapshot(page)).camera).toEqual(camera);
  await expect(
    page.getByRole('button', { name: 'Cerrar edición de bosquejo', exact: true }),
  ).toBeInViewport();
  await page
    .getByRole('textbox', { name: 'Contenido del bosquejo', exact: true })
    .fill('<script>alert(1)</script>');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => (document.documentElement.style.fontSize = ''));
  await expect(page.locator(`[data-node="${id}"] .wireframe-body`)).toHaveText(
    '<script>alert(1)</script>',
  );
  await expect(page.locator(`[data-node="${id}"] script`)).toHaveCount(0);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  const before = await cdp.send('Memory.getDOMCounters');
  for (let i = 0; i < 15; i++) {
    await openEditor(page, id);
    await page.keyboard.press('Escape');
  }
  await page.mouse.move(20, 80);
  await cdp.send('HeapProfiler.collectGarbage');
  const after = await cdp.send('Memory.getDOMCounters');
  expect(after.jsEventListeners).toBeLessThanOrEqual(before.jsEventListeners + 2);
  expect(after.nodes).toBeLessThanOrEqual(before.nodes + 10);
  await cdp.detach();
  await capture(page, info, 'bosquejos-accesibles');
});
