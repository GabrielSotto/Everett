import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture, videoFixture } from './canvas-fixtures';
import type { Page } from '@playwright/test';
import type { Material } from '../../src/domain/model';

const note = (id: string, x: number, data: Material['data']): Material => ({
  id,
  x,
  y: 170,
  width: 210,
  height: 160,
  owner: null,
  data,
});
async function fixture(page: Page, nodes: Material[]): Promise<void> {
  const input = await snapshot(page);
  input.state.worlds.find((w) => w.id === 'scout')!.nodes = nodes;
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);
}
async function select(page: Page, ids: string[]): Promise<void> {
  await page.locator(`[data-node="${ids[0]}"]`).click();
  for (const id of ids.slice(1))
    await page.locator(`[data-node="${id}"]`).click({ modifiers: ['Shift'] });
}

test('C08-B120: duplicar selección mixta desde menú y teclado conserva archivos, conexiones, grupos e historial', async ({
  page,
  context,
}, info) => {
  test.setTimeout(60000);
  await start(page);
  await fixture(page, [
    note('note-copy', 60, {
      kind: 'note',
      title: 'Decisiones',
      text: 'Texto original',
      color: '#eee',
    }),
    note('shape-copy', 360, {
      kind: 'shape',
      shape: 'triangle',
      color: '#c0a3df',
      fill: true,
      thickness: 2,
    }),
  ]);
  const movie = await videoFixture(context, 300);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Importar archivos locales', exact: true }).click(),
  ]);
  await chooser.setFiles({ name: 'Referencia.webm', mimeType: 'video/webm', buffer: movie });
  await expect(page.locator('.material.video .video-play')).toBeEnabled();
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  const video = w.nodes.find((n) => n.data.kind === 'video')!;
  video.x = 690;
  video.y = 170;
  w.links = [
    {
      id: 'copy-link',
      from: 'note-copy',
      to: 'shape-copy',
      fromAnchor: 'east',
      toAnchor: 'west',
      label: 'fundamenta',
    },
  ];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);
  await select(page, ['note-copy', 'shape-copy', video.id]);
  await page.locator('[data-node="note-copy"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Crear conjunto', exact: true }).click();
  const originals = structuredClone((await world(page)).nodes);
  await page.locator('[data-node="note-copy"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Duplicar selección', exact: true }).click();
  let current = await world(page);
  expect(current.nodes.length).toBe(6);
  expect(current.nodes.slice(0, 3)).toEqual(originals);
  const copies = current.nodes.slice(-3);
  expect(current.canvasGroups!.at(-1)!.nodes).toEqual(copies.map((n) => n.id));
  expect(current.links.at(-1)!.from).toBe(copies[0]!.id);
  expect(current.links.at(-1)!.to).toBe(copies[1]!.id);
  expect(
    copies[2]!.data.kind === 'video' &&
      originals[2]!.data.kind === 'video' &&
      copies[2]!.data.asset === originals[2]!.data.asset,
  ).toBe(true);
  await page.keyboard.press('Control+z');
  expect((await world(page)).nodes).toEqual(originals);
  await page.keyboard.press('Control+Shift+z');
  expect((await world(page)).nodes.slice(-3)).toEqual(copies);
  await select(
    page,
    copies.map((n) => n.id),
  );
  await page.keyboard.press('Control+d');
  expect((await world(page)).nodes.length).toBe(9);
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);
  current = await world(page);
  expect(current.nodes.length).toBe(9);
  expect(current.nodes.slice(0, 3)).toEqual(originals);
  await capture(page, info, 'copias-mixtas-con-grupos');
});

test('C08-B121: copia local de Docs, Code y Board se edita, persiste y se vincula a un elemento nuevo explícitamente', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  const original = await world(page);
  const source = { docs: original.docs, files: original.files, tasks: original.tasks };
  await fixture(page, [
    note('doc-copy', 60, { kind: 'reference', ref: { kind: 'document', id: source.docs[0]!.id } }),
    note('file-copy', 360, { kind: 'reference', ref: { kind: 'file', id: source.files[0]!.id } }),
    note('task-copy', 660, { kind: 'reference', ref: { kind: 'task', id: source.tasks[0]!.id } }),
  ]);
  await select(page, ['doc-copy', 'file-copy', 'task-copy']);
  await page.keyboard.press('Control+d');
  let current = await world(page);
  const copies = current.nodes.slice(-3);
  expect(copies.every((n) => n.data.kind === 'local')).toBe(true);
  expect({ docs: current.docs, files: current.files, tasks: current.tasks }).toEqual(source);
  for (const [index, surface, field, text, name] of [
    [0, 'Docs', 'Contenido de la copia', 'Alternativa de documento', 'Documento alternativo'],
    [1, 'Code', 'Código de la copia', 'const alternative = true;', 'alternativa.ts'],
    [2, 'Board', 'Descripción de la copia', 'Trabajo alternativo', 'Tarea alternativa'],
  ] as const) {
    const id = copies[index]!.id;
    await page.locator(`[data-node="${id}"]`).dblclick();
    await page.getByRole('textbox', { name: field, exact: true }).fill(text);
    await page.getByRole('textbox', { name: 'Nombre de la copia', exact: true }).fill(name);
    if (surface === 'Board')
      await page.getByLabel('Estado de la copia', { exact: true }).selectOption('review');
    await page.reload();
    await expect(page.getByRole('textbox', { name: field, exact: true })).toHaveValue(text);
    current = await world(page);
    expect({ docs: current.docs, files: current.files, tasks: current.tasks }).toEqual(source);
    await page.getByRole('button', { name: `Crear en ${surface}…`, exact: true }).click();
    await page.keyboard.press('Escape');
    expect((await world(page)).nodes.find((n) => n.id === id)!.data.kind).toBe('local');
    await page.getByRole('button', { name: `Crear en ${surface}…`, exact: true }).click();
    await page.getByRole('button', { name: `Crear en ${surface}`, exact: true }).click();
    await expect(page.locator(`[data-node="${id}"]`)).toBeVisible();
    expect((await world(page)).nodes.find((n) => n.id === id)!.data.kind).toBe('reference');
    const latest = await world(page);
    const published = latest.nodes.find((n) => n.id === id)!;
    expect(published.data.kind).toBe('reference');
    if (published.data.kind === 'reference') {
      const ref = published.data.ref;
      if (ref.kind === 'document')
        expect(latest.docs.find((d) => d.id === ref.id)?.body).toBe(text);
      else if (ref.kind === 'file')
        expect(latest.files.find((f) => f.id === ref.id)?.text).toBe(text);
      else if (ref.kind === 'task') {
        expect(latest.tasks.find((t) => t.id === ref.id)?.description).toBe(text);
        expect(latest.tasks.find((t) => t.id === ref.id)?.status).toBe('review');
      }
    }
    await page.keyboard.press('Control+z');
    await expect
      .poll(async () => (await world(page)).nodes.find((n) => n.id === id)?.data.kind)
      .toBe('local');
    expect({
      docs: (await world(page)).docs,
      files: (await world(page)).files,
      tasks: (await world(page)).tasks,
    }).toEqual(source);
    await page.keyboard.press('Control+Shift+z');
    await expect
      .poll(async () => (await world(page)).nodes.find((n) => n.id === id)?.data)
      .toEqual(published.data);
    expect(latest.docs.slice(0, source.docs.length)).toEqual(source.docs);
    expect(latest.files.slice(0, source.files.length)).toEqual(source.files);
    expect(latest.tasks.slice(0, source.tasks.length)).toEqual(source.tasks);
    source.docs = latest.docs;
    source.files = latest.files;
    source.tasks = latest.tasks;
  }
  await capture(page, info, 'copias-incorporadas-explicitamente');
});

test('C08-B122: Ctrl+C y Ctrl+V copian materiales, respetan texto y rechazan lotes inválidos sin cambios parciales', async ({
  page,
  context,
}, info) => {
  test.setTimeout(60000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await start(page);
  await fixture(page, [
    note('copy-native', 90, {
      kind: 'note',
      title: 'Nota copiada',
      text: 'Contenido nativo',
      color: '#ddd',
    }),
    note('copy-shape', 480, {
      kind: 'shape',
      title: 'Triángulo',
      shape: 'triangle',
      color: '#c0a3df',
    }),
  ]);
  await select(page, ['copy-native', 'copy-shape']);
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect.poll(async () => (await world(page)).nodes.length).toBe(4);
  const copied = (await world(page)).nodes.slice(-2);
  expect(copied[0]!.data.kind === 'note' && copied[0]!.data.text).toBe('Contenido nativo');
  await page.locator(`[data-node="${copied[0]!.id}"]`).dblclick();
  const editor = page.getByRole('textbox').filter({ visible: true }).last();
  await editor.fill('Texto del editor');
  await editor.selectText();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  expect((await world(page)).nodes.length).toBe(4);
  await page.keyboard.press('Escape');
  await page.evaluate(() => navigator.clipboard.writeText('https://example.org/nueva-referencia'));
  await page.locator('[data-node="copy-native"]').click();
  await page.keyboard.press('Control+v');
  await expect.poll(async () => (await world(page)).nodes.length).toBe(5);
  const before = (await world(page)).nodes;
  await page.evaluate(async () =>
    navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob(['<div data-everett-canvas="{}">Inválido</div>'], {
          type: 'text/html',
        }),
      }),
    ]),
  );
  await page.keyboard.press('Control+v');
  await expect(
    page.getByText('No se reconoce esta versión de los materiales copiados.', { exact: true }),
  ).toBeVisible();
  expect((await world(page)).nodes).toEqual(before);
  await capture(page, info, 'portapapeles-materiales-y-error');
});

test('C08-B123: la identificación seleccionada y en hover evita la etiqueta del cable al alejar y acercar', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [
    note('left', 100, { kind: 'note', title: 'Origen', text: '', color: '#ddd' }),
    note('right', 900, { kind: 'note', title: 'Destino', text: '', color: '#ddd' }),
    {
      ...note('identified', 500, {
        kind: 'reference',
        ref: { kind: 'document', id: w.docs[0]!.id },
      }),
      y: 280,
    },
  ];
  w.links = [
    {
      id: 'label-obstacle',
      from: 'left',
      to: 'right',
      fromAnchor: 'east',
      toAnchor: 'west',
      label: 'Relación de arquitectura',
    },
  ];
  input.state.camera = { x: 100, y: 150, z: 0.4 };
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);
  const originals = (await world(page)).nodes;
  const card = page.locator('[data-node=identified]');
  const check = async () => {
    await expect(card.locator('.material-identification')).toBeVisible();
    const collision = await card.evaluate((node) => {
      const label = node.querySelector('.material-identification')!.getBoundingClientRect();
      return [...document.querySelectorAll('.cable-label')]
        .filter((el) => {
          const cable = el.getBoundingClientRect();
          return (
            label.left < cable.right &&
            label.right > cable.left &&
            label.top < cable.bottom &&
            label.bottom > cable.top
          );
        })
        .map((el) => ({
          label: label.toJSON(),
          cable: el.getBoundingClientRect().toJSON(),
          style: node.querySelector('.material-identification')!.getAttribute('style'),
        }));
    });
    expect(collision).toEqual([]);
    expect((await world(page)).nodes).toEqual(originals);
  };
  await card.click();
  await check();
  await capture(page, info, 'identificacion-sin-solapamiento-40');
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -200);
  await expect.poll(async () => (await snapshot(page)).camera.z).toBeGreaterThan(0.5);
  await check();
  await page.mouse.click(60, 110);
  await card.hover();
  await expect(card).toHaveClass(/identified/);
  await check();
});

test('C08-B124: incorporación en ventana estrecha conserva el borrador y explica ruta duplicada o inválida', async ({
  page,
}, info) => {
  await start(page);
  const original = await world(page);
  await fixture(page, [
    note('file-source', 100, {
      kind: 'reference',
      ref: { kind: 'file', id: original.files[0]!.id },
    }),
  ]);
  await select(page, ['file-source']);
  await page.keyboard.press('Control+d');
  const copy = (await world(page)).nodes.at(-1)!;
  await page.locator(`[data-node="${copy.id}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Crear en Code…', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  const beforeWheel = (await snapshot(page)).camera;
  const contextDialog = page.getByRole('dialog', { name: 'Crear en Code', exact: true });
  await contextDialog.locator('form').hover();
  await page.mouse.wheel(0, 240);
  await expect
    .poll(() => contextDialog.locator('form').evaluate((form) => form.scrollTop))
    .toBeGreaterThan(0);
  expect((await snapshot(page)).camera).toEqual(beforeWheel);
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, 120);
  await page.keyboard.up('Alt');
  expect((await snapshot(page)).state.route.kind).toBe('surface');
  expect((await snapshot(page)).camera).toEqual(beforeWheel);
  await contextDialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => (document.documentElement.style.fontSize = ''));
  await page.locator(`[data-node="${copy.id}"]`).dblclick();
  const content = page.getByRole('textbox', { name: 'Código de la copia', exact: true });
  await content.fill('const preserved = true;');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  await page.getByRole('button', { name: 'Crear en Code…', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear en Code', exact: true });
  const name = dialog.getByRole('textbox');
  for (const [value, message] of [
    [original.files[0]!.name, 'Ya existe un archivo'],
    ['../escape.ts', 'Usá una ruta relativa válida'],
  ] as const) {
    await name.fill(value);
    await dialog.getByRole('button', { name: 'Crear en Code', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(message);
    await expect(name).toHaveValue(value);
    expect((await world(page)).files).toEqual(original.files);
  }
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await expect(dialog.getByRole('button', { name: 'Cerrar', exact: true })).toBeInViewport();
  await capture(page, info, 'incorporacion-error-320-texto-ampliado');
  await page.keyboard.press('Escape');
  await expect(content).toHaveValue('const preserved = true;');
  await expect(content).toBeVisible();
  expect((await world(page)).nodes.find((n) => n.id === copy.id)!.data.kind).toBe('local');
});

test('C08-B125: archivos de portapapeles ausentes no insertan un lote parcial y permiso denegado permite pegar materiales manualmente', async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await start(page);
  await fixture(page, [
    note('fallback-source', 100, {
      kind: 'note',
      title: 'Alternativa',
      text: 'Contenido recuperable',
      color: '#ddd',
    }),
  ]);
  const before = (await world(page)).nodes;
  await page.evaluate(async () => {
    const payload = JSON.stringify({
      format: 'everett-canvas',
      version: 1,
      nodes: [
        {
          id: 'text',
          x: 0,
          y: 0,
          width: 200,
          height: 150,
          owner: null,
          data: {
            kind: 'note',
            title: 'Texto del lote',
            text: 'No insertar parcialmente',
            color: '#ddd',
          },
        },
        {
          id: 'missing',
          x: 250,
          y: 0,
          width: 200,
          height: 150,
          owner: null,
          data: {
            kind: 'image',
            title: 'Imagen sin sus bytes',
            asset: 'missing-copy-asset',
            mime: 'image/png',
            ratio: 1,
          },
        },
      ],
      links: [],
      groups: [],
    });
    const carrier = document.createElement('div');
    carrier.setAttribute('data-everett-canvas', payload);
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': new Blob([carrier.outerHTML], { type: 'text/html' }) }),
    ]);
  });
  await select(page, ['fallback-source']);
  await page.keyboard.press('Control+v');
  await expect(
    page.getByText('No se pudieron recuperar los archivos copiados.', { exact: false }),
  ).toBeVisible();
  expect((await world(page)).nodes).toEqual(before);
  await page.keyboard.press('Control+c');
  await page.evaluate(() => {
    navigator.clipboard.read = () => Promise.reject(new DOMException('Denied', 'NotAllowedError'));
  });
  await page.locator('.canvas-stage').click({ button: 'right', position: { x: 30, y: 30 } });
  await page.getByRole('menuitem', { name: 'Pegar', exact: false }).click();
  await page.getByLabel('Pegá una imagen o enlace').focus();
  await page.keyboard.press('Control+v');
  await expect.poll(async () => (await world(page)).nodes.length).toBe(2);
  const after = (await world(page)).nodes;
  expect(after[0]).toEqual(before[0]);
  expect(after[1]!.data).toMatchObject({ kind: 'note', text: 'Contenido recuperable' });
  await expect(page.getByRole('dialog', { name: 'Pegar en Canvas', exact: true })).toHaveCount(0);
  await capture(page, info, 'portapapeles-recuperado');
});
