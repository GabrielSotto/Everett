import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { enterWorld, openSurface, assignMaterial } from './interaction-helpers';
import { pdfFixture, videoFixture, storedFixture } from './canvas-fixtures';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

const snapshot = (page: Page) => page.evaluate(() => window.EverettDebug!.snapshot());
async function canvas(page: Page): Promise<void> {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
}
async function reload(page: Page): Promise<void> {
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
}
async function contextAction(page: Page, id: string, name: string): Promise<void> {
  await page.locator(`.material[data-node="${id}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name, exact: true }).click();
}

test('C08-B01: nombre alcanzable, identidad Docs, copia independiente y retirada con Undo/Redo', async ({
  page,
}) => {
  await canvas(page);
  const state = await snapshot(page),
    world = state.state.worlds.find((w) => w.id === 'scout')!;
  const original = world.docs[0]!;
  const ref = world.nodes.find(
    (n) => n.data.kind === 'reference' && n.data.ref.id === original.id,
  )!;
  const material = page.locator(`[data-node="${ref.id}"]`);
  await material.hover();
  await expect(material.locator('.material-identification')).toBeVisible();
  await material.locator('[data-action=material-rename]').click();
  await expect(material.locator('.material-identification')).toBeVisible();
  await page
    .getByLabel('Nombre del material', { exact: true })
    .fill('Nombre común largo de documento');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  let current = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
  expect(current.docs.find((d) => d.id === original.id)!.body).toBe(original.body);
  await material.dblclick();
  await expect(page.getByLabel('Título del documento', { exact: true })).toHaveText(
    'Nombre común largo de documento',
  );
  await page.getByLabel('Título del documento', { exact: true }).fill('Nombre desde Docs');
  await page
    .getByLabel('Contenido del documento', { exact: true })
    .fill('Contenido común\nSegundo párrafo');
  await page.keyboard.press('Escape');
  await expect(material.locator('h3')).toHaveText('Nombre desde Docs');
  await contextAction(page, ref.id, 'Duplicar');
  current = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
  const copy = current.nodes.at(-1)!;
  expect(copy.data.kind).toBe('reference');
  if (copy.data.kind !== 'reference') throw new Error('Falta la copia');
  const copyId = copy.data.ref.id;
  await page.locator(`[data-node="${copy.id}"]`).dblclick();
  await page.getByLabel('Título del documento', { exact: true }).fill('Copia independiente');
  await page.getByLabel('Contenido del documento', { exact: true }).fill('Solo esta copia');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+z');
  await expect(page.locator(`[data-node="${copy.id}"]`)).toHaveCount(0);
  current = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
  expect(current.docs.some((d) => d.id === copyId)).toBe(false);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator(`[data-node="${copy.id}"]`)).toBeVisible();
  current = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
  expect(current.docs.find((d) => d.id === copyId)!.title).toBe('Copia independiente');
  expect(current.docs.find((d) => d.id === copyId)!.body).toBe('Solo esta copia');
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await page.getByRole('button', { name: 'Anclar chat', exact: true }).click();
  const chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
  await expect
    .poll(() =>
      chat.evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length),
    )
    .toBe(0);
  const copyBox = (await page.locator(`[data-node="${copy.id}"]`).boundingBox())!;
  await page.mouse.move(copyBox.x + copyBox.width / 2, copyBox.y + copyBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(180, 300, { steps: 12 });
  await page.mouse.up();
  await expect(chat.locator('.chat-reference-list')).toContainText('Copia independiente');
  await chat
    .getByRole('textbox', { name: 'Escribí un mensaje…', exact: true })
    .fill('Revisar este material');
  await chat.getByRole('button', { name: 'Enviar', exact: true }).click();
  await contextAction(page, copy.id, 'Quitar del Canvas');
  current = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
  expect(current.docs.find((d) => d.id === copyId)!.body).toBe('Solo esta copia');
  expect(current.docs.find((d) => d.id === original.id)!.body).toBe(
    'Contenido común\nSegundo párrafo',
  );
  await reload(page);
  await expect(page.locator(`[data-node="${copy.id}"]`)).toHaveCount(0);
  await chat.getByRole('button', { name: 'Copia independiente', exact: true }).click();
  await expect(page.getByLabel('Contenido del documento', { exact: true })).toHaveValue(
    'Solo esta copia',
  );
  await page.getByLabel('Título del documento', { exact: true }).fill('');
  await page.keyboard.press('Escape');
  await chat.getByRole('button', { name: 'Sin título', exact: true }).click();
  await expect(page.getByLabel('Contenido del documento', { exact: true })).toHaveValue(
    'Solo esta copia',
  );
  await page.getByLabel('Título del documento', { exact: true }).fill('Nombre conservado en Docs');
  await page.keyboard.press('Escape');
  await expect(
    chat.getByRole('button', { name: 'Nombre conservado en Docs', exact: true }),
  ).toBeVisible();
  await openSurface(page, 'Session');
  await page.getByRole('button', { name: 'Nombre conservado en Docs', exact: true }).click();
  await expect(page.getByLabel('Contenido del documento', { exact: true })).toHaveValue(
    'Solo esta copia',
  );
  await page.keyboard.press('Escape');
  await openSurface(page, 'Canvas');
  // La recarga reinicia el historial de gestos; recuperar la retirada que ahora verificamos.
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page
    .locator('.reference-menu')
    .getByRole('button', { name: 'Nombre conservado en Docs', exact: true })
    .click();
  const renewed = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.nodes.at(-1)!;
  await contextAction(page, renewed.id, 'Quitar del Canvas');
  await page.keyboard.press('Control+z');
  await expect(page.locator(`[data-node="${renewed.id}"]`)).toBeVisible();
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator(`[data-node="${renewed.id}"]`)).toHaveCount(0);
  await expect(page.locator('.material-actions')).toHaveCount(0);
});

test('C08-B08: PDF real multipágina y video importado recuperan bytes y permiten navegación con Alt', async ({
  page,
  context,
}) => {
  await canvas(page);
  const video = await videoFixture(context);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('#canvas-file-import').setInputFiles({
    name: 'Documento con páginas.pdf',
    mimeType: 'application/pdf',
    buffer: pdfFixture(),
  });
  const pdf = page.locator('.material.pdf');
  await expect(pdf.locator('img')).toBeVisible();
  await pdf.dblclick();
  await expect(page.locator('.pdf-reader [role=status]')).toHaveText('Página 1 de 2');
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.locator('.pdf-reader [role=status]')).toHaveText('Página 2 de 2');
  const rect = (await page.locator('.pdf-reader canvas').boundingBox())!;
  await page.mouse.move(rect.x + 20, rect.y + 20);
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, 240);
  await page.keyboard.up('Alt');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'scout/canvas/');
  await page
    .locator('#canvas-file-import')
    .setInputFiles({ name: 'Video libre.webm', mimeType: 'video/webm', buffer: video });
  const material = page.locator('.material.video');
  await expect
    .poll(() => material.locator('video').evaluate((el) => (el as HTMLVideoElement).videoWidth))
    .toBe(160);
  await reload(page);
  await expect
    .poll(() => material.locator('video').evaluate((el) => (el as HTMLVideoElement).videoWidth))
    .toBe(160);
  await material.getByRole('button', { name: 'Reproducir video', exact: true }).click();
  await expect
    .poll(() => material.locator('video').evaluate((el) => (el as HTMLVideoElement).controls))
    .toBe(true);
  expect(await material.locator('video').evaluate((el) => getComputedStyle(el).objectFit)).toBe(
    'contain',
  );
  const canvasPlayer = (await material.locator('video').elementHandle())!;
  await assignMaterial(page, 'note-a', 'Analizar');
  expect(await canvasPlayer.evaluate((el) => el.isConnected)).toBe(true);
  await material.press('Enter');
  await expect(page.locator('.transition-ghost video')).toHaveCount(0);
  const player = await page.locator('.media-view video').elementHandle();
  if (!player) throw Error('Falta el visor del video');
  await expect
    .poll(
      async () =>
        (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.assignments[0]?.phase,
    )
    .toBe('ready');
  expect(await player.evaluate((el) => el.isConnected)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(material).toBeVisible();
});

test('C08-B09: dibujo libre y formas conservan gesto, estilo e independencia al duplicar', async ({
  page,
}) => {
  await canvas(page);
  await page.getByRole('button', { name: 'Dibujar', exact: true }).click();
  await page.locator('#draw-thickness').selectOption('4');
  await page.mouse.move(550, 180);
  await page.mouse.down();
  await page.mouse.move(580, 220, { steps: 4 });
  await page.mouse.move(690, 240, { steps: 6 });
  await page.mouse.up();
  const drawing = page.locator('.material.drawing');
  await expect(drawing.locator('polyline')).toHaveAttribute('stroke-width', '4');
  const id = await drawing.getAttribute('data-node');
  await contextAction(page, id!, 'Duplicar');
  await expect(page.locator('.material.drawing')).toHaveCount(2);
  await page.getByRole('button', { name: 'Formas', exact: true }).click();
  await page.getByRole('button', { name: 'Triángulo', exact: true }).click();
  await page.locator('#shape-fill').uncheck();
  await page.mouse.move(620, 130);
  await page.mouse.down();
  await page.mouse.move(510, 270, { steps: 10 });
  await page.mouse.up();
  const shape = page.locator('.material.shape-material');
  await expect(shape.locator('svg')).toHaveAttribute('fill', 'none');
  const state = await snapshot(page),
    node = state.state.worlds.find((w) => w.id === 'scout')!.nodes.at(-1)!;
  expect(node.width).toBeCloseTo(110 / state.camera.z, 0);
  expect(node.height).toBeCloseTo(140 / state.camera.z, 0);
  await page.keyboard.press('Control+z');
  await expect(shape).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(shape).toHaveCount(1);
  await page.getByRole('button', { name: 'Dibujar', exact: true }).click();
  await page.mouse.click(580, 100);
  await expect(page.locator('.material.drawing').last().locator('circle')).toHaveAttribute(
    'r',
    '2',
  );
  expect(
    await page
      .locator('.material.drawing')
      .last()
      .locator('svg')
      .evaluate((el) => getComputedStyle(el).overflow),
  ).toBe('visible');
});

test('C08-B10: una interrupción confirmada ofrece Reintentar y conserva trabajo y efectos', async ({
  page,
}) => {
  await canvas(page);
  await assignMaterial(page, 'note-a', 'Analizar');
  const state = await snapshot(page),
    world = state.state.worlds.find((w) => w.id === 'scout')!,
    job = world.assignments[0]!;
  const run = world.runs.find((r) => r.id === job.runId)!;
  run.status = 'failed';
  run.finishedAt = run.startedAt + 1;
  run.error = { message: 'Interrupción confirmada de fixture', stack: '', code: 'fixture' };
  await storedFixture(page, state.state, state.ui);
  await reload(page);
  await expect(page.getByText('Interrumpido', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Aceptar propuesta', exact: true })).toBeVisible();
  const restored = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
  expect(restored.assignments[0]!.id).toBe(job.id);
  expect(restored.assignments[0]!.input).toBe(job.input);
  expect(restored.nodes.length).toBe(world.nodes.length);
  await page.getByRole('button', { name: 'Rechazar propuesta', exact: true }).click();
  await expect(page.locator('[data-node="note-a"]')).toBeVisible();
});

test('C08-B11: listas extensas, nombres largos y datos corruptos no producen una recuperación vacía', async ({
  page,
}) => {
  await canvas(page);
  const state = await snapshot(page),
    world = state.state.worlds.find((w) => w.id === 'scout')!;
  for (let index = 0; index < 120; index++)
    world.conversations.push({
      id: 'stress-' + index,
      name: 'Conversación ' + index + ' — ' + 'nombre completo '.repeat(12),
      origin: 'canvas',
      participants: ['Gabi', 'Eve'],
      messages: [],
    });
  state.ui.chat.chatMode = 'docked';
  await storedFixture(page, state.state, state.ui);
  await reload(page);
  await page.getByRole('button', { name: 'Historial de conversaciones', exact: true }).click();
  await page.getByLabel('Buscar conversación', { exact: true }).fill('Conversación 119');
  const row = page.locator('.history-results [data-action=conversation-select]');
  await expect(row).toHaveCount(1);
  expect(await row.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('nowrap');
  expect(await row.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
  await row.click();
  await expect(page.locator('[data-action=conversation-name]')).toHaveAttribute(
    'title',
    world.conversations.at(-1)!.name,
  );
  // Corromper el registro de entrada, conservar la copia válida y reparar por la misma frontera.
  const valid = await snapshot(page);
  const broken = structuredClone(valid);
  broken.state.worlds.find((w) => w.id === 'scout')!.nodes[0]!.width = -1;
  await storedFixture(page, broken.state, broken.ui);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Reintentar recuperación', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#app')).toContainText('Tus datos guardados se conservaron');
  await storedFixture(page, valid.state, valid.ui);
  await page.getByRole('button', { name: 'Reintentar recuperación', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  expect(
    (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.conversations.length,
  ).toBe(121);
});

test('C08-B12: hover cancelable, comentario sin fondo ni múltiples destinatarios y propuesta reducida', async ({
  page,
}) => {
  await canvas(page);
  const first = page.locator('[data-node="note-a"]'),
    second = page.locator('[data-node="note-b"]');
  const box = (await second.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.move(600, 90);
  await page.waitForTimeout(350);
  await expect(second).not.toHaveClass(/identified/);
  await first.click();
  await second.click({ modifiers: ['Shift'] });
  await page.keyboard.press('c');
  await page.mouse.click(600, 90);
  await expect(page.getByLabel('Nuevo comentario', { exact: true })).toHaveCount(0);
  await second.click();
  await expect(page.getByLabel('Nuevo comentario', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await assignMaterial(page, 'note-a', 'Analizar');
  await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
  const cancel = (await page
      .getByRole('button', { name: 'Cancelar pedido de cambios', exact: true })
      .boundingBox())!,
    send = (await page.getByRole('button', { name: 'Enviar cambios', exact: true }).boundingBox())!;
  expect(cancel.x).toBeLessThan(send.x);
  expect(cancel.width).toBeCloseTo(send.width, 1);
  expect(cancel.height).toBeCloseTo(send.height, 1);
  expect(cancel.y).toBeCloseTo(send.y, 1);
});

test('C08-B02: historial compacto, participantes propios y continuidad Canvas ↔ Sessions con borrador', async ({
  page,
}) => {
  await canvas(page);
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await page.getByRole('button', { name: 'Anclar chat', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar personas', exact: true }).click();
  await page.getByLabel('Nombre del participante', { exact: true }).fill('Persona invitada');
  await page.getByRole('button', { name: 'Agregar persona', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Participantes', exact: true })).toContainText(
    'Persona invitada',
  );
  await page.locator('[data-action=conversation-name]').click();
  const longName =
    'Conversación original con un nombre muy largo que debe quedar en una línea y conservar su identidad';
  await page.getByLabel('Nombre de conversación', { exact: true }).fill(longName);
  await page.getByRole('button', { name: 'Historial de conversaciones', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Historial de conversaciones', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Historial de conversaciones', exact: true }).click();
  await page.getByLabel('Escribí un mensaje…', { exact: true }).fill('Borrador original N C L');
  const first = (await snapshot(page)).ui.conversations.scout;
  await page.getByRole('button', { name: 'Nueva conversación', exact: true }).click();
  let state = await snapshot(page),
    w = state.state.worlds.find((w) => w.id === 'scout')!;
  const second = w.conversations.at(-1)!;
  expect(second.participants).toEqual(['Gabi', 'Eve']);
  expect(second.messages).toEqual([]);
  await page.getByLabel('Escribí un mensaje…', { exact: true }).fill('Borrador de la nueva');
  await page.getByRole('button', { name: 'Historial de conversaciones', exact: true }).click();
  await expect(page.locator('[data-action=conversation-new]')).toHaveCount(1);
  await page.getByLabel('Buscar conversación', { exact: true }).fill('sin coincidencias 4321');
  await expect(page.getByText('Sin resultados', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Escribí un mensaje…', { exact: true })).toHaveValue(
    'Borrador de la nueva',
  );
  await page.getByRole('button', { name: 'Limpiar búsqueda', exact: true }).click();
  await page.getByRole('button', { name: longName, exact: true }).click();
  await expect(page.getByLabel('Escribí un mensaje…', { exact: true })).toHaveValue(
    'Borrador original N C L',
  );
  await openSurface(page, 'Session');
  await expect(page.getByRole('group', { name: 'Participantes', exact: true })).toContainText(
    'Persona invitada',
  );
  await expect(page.getByLabel('Escribí lo que tenés en mente…', { exact: true })).toHaveValue(
    'Borrador original N C L',
  );
  await expect(page.locator('[data-action=conversation-name]')).toBeInViewport();
  expect((await page.locator('[data-action=conversation-name]').boundingBox())!.y).toBeLessThan(
    120,
  );
  expect(
    (await page.locator('[data-action=conversation-name]').boundingBox())!.width,
  ).toBeGreaterThan(80);
  await page
    .getByLabel('Escribí lo que tenés en mente…', { exact: true })
    .fill('@Eve Mensaje común');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(page.locator('.message.user')).toContainText('Mensaje común');
  await openSurface(page, 'Canvas');
  await expect(page.locator('.chat-message.user')).toContainText('Mensaje común');
  await reload(page);
  state = await snapshot(page);
  w = state.state.worlds.find((w) => w.id === 'scout')!;
  expect(state.ui.conversations.scout).toBe(first);
  expect(w.conversations.find((c) => c.id === first)!.participants).toContain('Persona invitada');
  expect(w.conversations.length).toBe(2);
  await expect(page.getByRole('button', { name: 'Room', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.getByLabel('Nombre de perfil', { exact: true }).fill('Eve');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Nueva conversación', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Participantes', exact: true })).toHaveText(
    'Eve (iniciador) · Eve (agente)',
  );
  await page.getByRole('button', { name: 'Agregar personas', exact: true }).click();
  await page.getByLabel('Nombre del participante', { exact: true }).fill('Ada');
  await page.getByRole('button', { name: 'Agregar persona', exact: true }).click();
  await page.getByLabel('Escribí un mensaje…', { exact: true }).fill('Mensaje sin invocación');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  state = await snapshot(page);
  const matchingNames = state.state.worlds
    .find((world) => world.id === 'scout')!
    .conversations.at(-1)!;
  expect(matchingNames.participants).toEqual(['Eve', 'Eve', 'Ada']);
  expect(matchingNames.messages).toHaveLength(1);
  await page.getByLabel('Escribí un mensaje…', { exact: true }).fill('@Eve revisá esta idea');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await snapshot(page)).state.worlds
          .find((world) => world.id === 'scout')!
          .conversations.at(-1)!
          .messages.filter((message) => message.role === 'agent').length,
    )
    .toBe(1);
  await openSurface(page, 'Session');
  await expect(page.getByRole('group', { name: 'Participantes', exact: true })).toHaveText(
    'Eve (iniciador) · Eve (agente) · Ada',
  );
});

test('C08-B03: comentarios privados recuperables, publicación única y conflictos de atajos', async ({
  page,
}) => {
  await canvas(page);
  await page.locator('[data-node="note-b"]').click();
  await page.keyboard.press('c');
  await page.getByLabel('Nuevo comentario', { exact: true }).fill('N C L — borrador privado');
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Nuevo comentario', { exact: true })).toHaveCount(0);
  await reload(page);
  await page.keyboard.press('c');
  await expect(page.getByLabel('Nuevo comentario', { exact: true })).toHaveValue(
    'N C L — borrador privado',
  );
  const before = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.comments.length;
  await page.getByRole('button', { name: 'Publicar comentario', exact: true }).click();
  expect((await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.comments.length).toBe(
    before + 1,
  );
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await page.getByRole('button', { name: 'Atajos', exact: true }).click();
  await page.getByRole('button', { name: 'Canvas', exact: true }).click();
  const rename = page.getByLabel('Atajo de Renombrar', { exact: true });
  await expect(rename).toHaveValue('');
  await rename.press('n');
  await expect(page.getByRole('alert')).toContainText('ya está asignado');
  await page.getByRole('button', { name: 'Reasignar y quitar el anterior', exact: true }).click();
  await expect(rename).toHaveValue('N');
  await page.getByRole('button', { name: 'Restaurar todos', exact: true }).click();
  await expect(rename).toHaveValue('');
  await page.keyboard.press('Escape');
  await page.locator('[data-node="note-b"]').dblclick();
  await page.getByLabel('Contenido de la nota', { exact: true }).fill('N C L');
  await page.getByLabel('Contenido de la nota', { exact: true }).press('c');
  expect((await snapshot(page)).ui.canvas.tool).toBe('select');
});

test('C08-B04: trabajo pendiente sobrevive recarga, pedido conserva contexto y aceptar es explícito', async ({
  page,
}) => {
  await canvas(page);
  await assignMaterial(page, 'note-a', 'Analizar');
  const job = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.assignments[0]!;
  await reload(page);
  await expect(page.getByRole('button', { name: 'Aceptar propuesta', exact: true })).toBeVisible();
  let state = await snapshot(page),
    current = state.state.worlds.find((w) => w.id === 'scout')!.assignments[0]!;
  expect(current.id).toBe(job.id);
  expect(current.runId).toBe(job.runId);
  await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
  const field = page.getByLabel('Cambios solicitados', { exact: true });
  expect(await field.evaluate((el) => getComputedStyle(el).resize)).toBe('none');
  await expect(page.locator('.revision-suggestions button')).toHaveCount(4);
  await field.fill('Mi pedido sin enviar');
  await reload(page);
  await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
  await expect(field).toHaveValue('Mi pedido sin enviar');
  await page.getByRole('button', { name: 'Cancelar pedido de cambios', exact: true }).click();
  await expect(page.locator('.proposal')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
  await page.getByRole('button', { name: 'Más breve', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar cambios', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Aceptar propuesta', exact: true })).toBeVisible();
  state = await snapshot(page);
  current = state.state.worlds.find((w) => w.id === 'scout')!.assignments[0]!;
  expect(current.id).toBe(job.id);
  expect(current.instruction).toBe('Analizar');
  expect(current.input).toBe(job.input);
  expect(current.revision).toBe(2);
  expect(
    state.state.worlds.find((w) => w.id === 'scout')!.nodes.find((n) => n.id === 'note-a')!.owner,
  ).not.toBeNull();
  await page.getByRole('button', { name: 'Aceptar propuesta', exact: true }).click();
  await expect(page.locator('.proposal')).toHaveCount(0);
  await expect(page.locator('[data-node="note-a"]')).toBeVisible();
});

test('C08-B05: importar conserva bytes, contenido libre, proporción y navegación tras recargar', async ({
  page,
}) => {
  await canvas(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('#canvas-file-import').setInputFiles({
    name: 'imagen completa.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" fill="#6675bf"/><circle cx="160" cy="80" r="60" fill="#e8d89f"/></svg>',
    ),
  });
  const media = page.locator('.material.image');
  await expect(media.locator('img')).toBeVisible();
  await expect
    .poll(() => media.locator('img').evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBe(320);
  const id = await media.getAttribute('data-node');
  expect(await media.evaluate((el) => getComputedStyle(el).padding)).toBe('0px');
  expect(await media.evaluate((el) => getComputedStyle(el).borderWidth)).toBe('0px');
  await reload(page);
  await expect
    .poll(() => media.locator('img').evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBe(320);
  await media.click();
  const handle = await media.locator('.resize-handle.se').boundingBox();
  if (!handle) throw Error('Falta tirador');
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 70, handle.y + 50, { steps: 8 });
  await page.mouse.up();
  const node = (await snapshot(page)).state.worlds
    .find((w) => w.id === 'scout')!
    .nodes.find((n) => n.id === id)!;
  expect(node.width / node.height).toBeCloseTo(2, 4);
  await media.dblclick();
  await expect(page.locator('.media-view img')).toBeVisible();
  const exitFrame = await page.evaluateHandle(() => {
    const proof = { pixel: null as number[] | null, blobImages: -1 };
    const capture = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      document.removeEventListener('keydown', capture);
      requestAnimationFrame(() => {
        const ghost = document.querySelector('.transition-ghost');
        proof.blobImages = ghost?.querySelectorAll('img[src^="blob:"]').length ?? -1;
        const frame = ghost?.querySelector<HTMLCanvasElement>('.image-snapshot');
        if (frame)
          proof.pixel = Array.from(frame.getContext('2d')!.getImageData(160, 80, 1, 1).data);
      });
    };
    document.addEventListener('keydown', capture);
    return proof;
  });
  await page.keyboard.press('Escape');
  await expect.poll(() => exitFrame.evaluate((proof) => proof.pixel)).toEqual([232, 216, 159, 255]);
  expect(await exitFrame.evaluate((proof) => proof.blobImages)).toBe(0);
  await exitFrame.dispose();
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await expect(media).toBeVisible();
});

test('C08-B06: cable con etiqueta integrada, área estable, movimiento, edición y Undo/Redo', async ({
  page,
}) => {
  await canvas(page);
  const cable = page.locator('.connection').first();
  const path = await cable.locator('.link-line').getAttribute('d');
  const hit = cable.locator('.link-hit');
  for (const delta of [240, -480, 240]) {
    const zoom = (await snapshot(page)).camera.z;
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, delta);
    await expect
      .poll(async () => (await snapshot(page)).camera.z)
      .toBeCloseTo(zoom * Math.exp(-delta * 0.00165), 3);
    const point = await hit.evaluate((element) => {
      const line = element as SVGPathElement,
        distance = line.getTotalLength() / 2,
        a = line.getPointAtLength(distance),
        b = line.getPointAtLength(distance + 1),
        matrix = line.getScreenCTM()!;
      const center = new DOMPoint(a.x, a.y).matrixTransform(matrix),
        tangent = new DOMPoint(b.x, b.y).matrixTransform(matrix),
        length = Math.hypot(tangent.x - center.x, tangent.y - center.y);
      return {
        x: center.x - ((tangent.y - center.y) * 5) / length,
        y: center.y + ((tangent.x - center.x) * 5) / length,
      };
    });
    // Clic fuera del trazo visible, antes del hover, en distintos niveles de zoom.
    await page.mouse.click(point.x, point.y);
    await expect(page.getByLabel('Etiqueta de conexión', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await hit.press('Enter');
  await expect(page.getByLabel('Etiqueta de conexión', { exact: true })).toBeVisible();
  await page.getByLabel('Etiqueta de conexión', { exact: true }).fill('Depende del contexto');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(cable.locator('text')).toHaveText('Depende del contexto');
  await expect(cable.locator('.link-line')).toHaveAttribute('mask', /url/);
  const cut = cable.locator('.label-cut');
  expect(Number(await cut.getAttribute('width'))).toBeGreaterThan(30);
  expect(await hit.evaluate((el) => getComputedStyle(el).vectorEffect)).toBe('non-scaling-stroke');
  const material = page.locator('[data-node="note-a"]'),
    box = (await material.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 90, { steps: 8 });
  await page.mouse.up();
  expect(await cable.locator('.link-line').getAttribute('d')).not.toBe(path);
  await page.keyboard.press('Control+z');
  await expect(cable.locator('.link-line')).toHaveAttribute('d', path!);
  await expect(cable.locator('text')).toHaveText('Depende del contexto');
  await page.keyboard.press('Control+z');
  await expect(cable.locator('text')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(cable.locator('text')).toHaveText('Depende del contexto');
  await material.press('Space');
  await material
    .getByRole('button', { name: 'Redimensionar se', exact: true })
    .press('Shift+ArrowRight');
  const resizedPath = await cable.locator('.link-line').getAttribute('d');
  expect(resizedPath).not.toBe(path);
  await expect(cable.locator('text')).toHaveText('Depende del contexto');
  await page.keyboard.press('Control+z');
  await expect(cable.locator('.link-line')).toHaveAttribute('d', path!);
  await page.keyboard.press('Control+Shift+z');
  await expect(cable.locator('.link-line')).toHaveAttribute('d', resizedPath!);
  await expect(cable.locator('text')).toHaveText('Depende del contexto');
});

test('C08-B07: enlace sin preview, tarjeta Board compartida y dock alcanzable en ventana estrecha', async ({
  page,
}) => {
  await canvas(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
  await page
    .getByLabel('Dirección del enlace', { exact: true })
    .fill('https://example.com/ruta-disponible');
  await page
    .locator('#canvas-new-link')
    .getByRole('button', { name: 'Agregar enlace', exact: true })
    .click();
  await expect(page.locator('.material.link')).toContainText('example.com/ruta-disponible');
  await expect(page.locator('.material.link img')).toHaveCount(0);
  const state = await snapshot(page),
    world = state.state.worlds.find((w) => w.id === 'scout')!;
  const taskRef = world.nodes.find(
    (n) => n.data.kind === 'reference' && n.data.ref.kind === 'task',
  )!;
  if (taskRef.data.kind !== 'reference') throw Error('Falta tarea');
  const taskId = taskRef.data.ref.id;
  const task = world.tasks.find((t) => t.id === taskId)!;
  const taskMaterial = page.locator(`[data-node="${taskRef.id}"]`);
  await expect(taskMaterial.locator('h3')).toHaveText(task.title);
  await expect(taskMaterial.locator('.task-material-meta')).toContainText(task.assignee);
  await taskMaterial.click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Duplicar', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 760 });
  const toolbar = page.getByRole('toolbar', { name: 'Herramientas de Canvas', exact: true });
  // Resize reemplaza el dock; medir el control recuperado, no el nodo que se desmonta.
  await expect
    .poll(async () => (await toolbar.boundingBox())?.height ?? Infinity)
    .toBeLessThanOrEqual(60);
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await page.getByRole('button', { name: 'Anclar chat', exact: true }).click();
  await expect
    .poll(async () => {
      const dock = await toolbar.boundingBox();
      return !!dock && dock.x >= 0 && dock.x + dock.width <= 390;
    })
    .toBe(true);
  for (const button of await page.locator('.canvas-tools button').all())
    expect((await button.boundingBox())!.width).toBeGreaterThanOrEqual(34);
});

test('C08-B13: el HTML autónomo abierto como archivo permite PDF, recarga y vuelta espacial', async ({
  page,
}) => {
  const manifest = JSON.parse(await readFile('dist/build-manifest.json', 'utf8')) as {
    artifact: string;
    buildId: string;
  };
  await page.goto(pathToFileURL(resolve('dist', manifest.artifact)).href);
  await expect(page.locator('meta[name="everett-build"]')).toHaveAttribute(
    'content',
    manifest.buildId,
  );
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await canvas(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page
    .locator('#canvas-file-import')
    .setInputFiles({ name: 'Autónomo.pdf', mimeType: 'application/pdf', buffer: pdfFixture() });
  await expect(page.locator('.material.pdf img')).toBeVisible();
  await reload(page);
  await page.locator('.material.pdf').dblclick();
  await expect(page.locator('.pdf-reader [role=status]')).toHaveText('Página 1 de 2');
  await page.keyboard.press('Escape');
  await expect(page.locator('.material.pdf')).toBeVisible();
});

test('C08-B14: fallo de cuota y asset ausente ofrecen recuperación y copia con bytes', async ({
  page,
}) => {
  await canvas(page);
  const bytes = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#6675bf"/></svg>',
  );
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page
    .locator('#canvas-file-import')
    .setInputFiles({ name: 'Respaldo.svg', mimeType: 'image/svg+xml', buffer: bytes });
  await expect(page.locator('.material.image img')).toBeVisible();
  await page.evaluate(() => {
    const native = IDBObjectStore.prototype.put;
    Object.defineProperty(window, '__restorePut', {
      configurable: true,
      value: () => {
        IDBObjectStore.prototype.put = native;
      },
    });
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'worlds') throw new DOMException('Cuota simulada', 'QuotaExceededError');
      return native.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await page
    .getByLabel('Escribí un mensaje…', { exact: true })
    .fill('Contenido en memoria ante cuota');
  await expect(page.locator('#notification')).toContainText('No se pudo guardar');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar copia', exact: true }).click();
  const download = await downloadPromise;
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8')) as {
    assets: { data: string }[];
    ui: { chat: { chatDrafts: Record<string, { text: string }> } };
  };
  expect(Buffer.from(backup.assets[0]!.data.split(',')[1]!, 'base64')).toEqual(bytes);
  expect(
    Object.values(backup.ui.chat.chatDrafts).some(
      (d) => d.text === 'Contenido en memoria ante cuota',
    ),
  ).toBe(true);
  await page.evaluate(() => {
    (window as unknown as { __restorePut: () => void }).__restorePut();
  });
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.locator('#notification')).toHaveText('Guardado local recuperado.');
  await reload(page);
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await expect(page.getByLabel('Escribí un mensaje…', { exact: true })).toHaveValue(
    'Contenido en memoria ante cuota',
  );
  const state = await snapshot(page),
    material = state.state.worlds
      .find((w) => w.id === 'scout')!
      .nodes.find((n) => n.data.kind === 'image')!;
  if (!('asset' in material.data)) throw Error('Falta archivo');
  const asset = material.data.asset;
  await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('everett-canvas', 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction('assets', 'readwrite');
      tx.objectStore('assets').delete(id);
      tx.oncomplete = () => resolve();
    });
    db.close();
  }, asset);
  await reload(page);
  await expect(page.locator('.asset-error')).toContainText('No se pudo recuperar el archivo');
  await page.evaluate(
    async ({ id, bytes }) => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const r = indexedDB.open('everett-canvas', 1);
        r.onsuccess = () => resolve(r.result);
      });
      await new Promise<void>((resolve) => {
        const tx = db.transaction('assets', 'readwrite');
        tx.objectStore('assets').put(
          new Blob([new Uint8Array(bytes)], { type: 'image/svg+xml' }),
          id,
        );
        tx.oncomplete = () => resolve();
      });
      db.close();
    },
    { id: asset, bytes: [...bytes] },
  );
  await page
    .locator('.asset-error')
    .getByRole('button', { name: 'Reintentar', exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator('.material.image img').evaluate((el) => (el as HTMLImageElement).naturalWidth),
    )
    .toBe(200);
});

test('C08-B15: transferencia real y propuesta de documento requieren aceptación y conservan la fuente', async ({
  page,
}) => {
  await canvas(page);
  const initial = await snapshot(page),
    world = initial.state.worlds.find((w) => w.id === 'scout')!,
    doc = world.docs[0]!,
    node = world.nodes.find(
      (n) =>
        n.data.kind === 'reference' && n.data.ref.kind === 'document' && n.data.ref.id === doc.id,
    )!;
  const material = page.locator(`[data-node="${node.id}"]`),
    start = (await material.boundingBox())!,
    zone = (await page.locator('[data-zone]').first().boundingBox())!;
  await page.mouse.move(start.x + 40, start.y + 45);
  await page.mouse.down();
  await page.mouse.move(zone.x + 60, zone.y + 60, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator(`[data-assigned-id="${node.id}"]`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aceptar propuesta', exact: true })).toBeVisible();
  let current = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
  expect(current.docs[0]!.body).toBe(doc.body);
  expect(current.nodes.find((n) => n.id === node.id)!.owner).not.toBeNull();
  await page
    .locator('[data-zone]')
    .first()
    .click({ position: { x: 10, y: 10 } });
  await page.setViewportSize({ width: 390, height: 760 });
  await page.getByRole('button', { name: 'Revisar propuesta', exact: true }).click();
  const proposal = (await page.locator('.proposal').boundingBox())!;
  expect(proposal.x).toBeGreaterThanOrEqual(0);
  expect(proposal.x + proposal.width).toBeLessThanOrEqual(390);
  await expect(
    page.getByRole('complementary', { name: 'Inspector de zona', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
  await page.getByLabel('Cambios solicitados', { exact: true }).fill('N C L sin mover la página');
  expect(await page.locator('#canvas-stage').evaluate((el) => el.scrollTop)).toBe(0);
  expect((await page.locator('.shell').boundingBox())!.y).toBe(0);
  await page.getByRole('button', { name: 'Cancelar pedido de cambios', exact: true }).click();
  await page.getByRole('button', { name: 'Aceptar propuesta', exact: true }).click();
  current = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;
  expect(current.docs[0]!.id).toBe(doc.id);
  expect(current.docs[0]!.body).not.toBe(doc.body);
  expect(current.nodes.find((n) => n.id === node.id)!.owner).toBeNull();
});

test('C08-B16: teclado opera materiales, tiradores, zonas y anclajes sin activar herramientas al escribir', async ({
  page,
}) => {
  await canvas(page);
  const note = page.locator('[data-node="note-b"]');
  await note.press('Space');
  const initial = (await snapshot(page)).state.worlds
    .find((w) => w.id === 'scout')!
    .nodes.find((n) => n.id === 'note-b')!;
  await note
    .getByRole('button', { name: 'Redimensionar se', exact: true })
    .press('Shift+ArrowRight');
  const resized = (await snapshot(page)).state.worlds
    .find((w) => w.id === 'scout')!
    .nodes.find((n) => n.id === 'note-b')!;
  expect(resized.width).toBe(initial.width + 10);
  expect(resized.data).toEqual(initial.data);
  await note.press('Enter');
  await expect(page.getByLabel('Contenido de la nota', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('l');
  await note.getByRole('button', { name: 'Anclaje north', exact: true }).press('Enter');
  await page
    .locator('[data-node="note-a"]')
    .getByRole('button', { name: 'Anclaje south', exact: true })
    .press('Enter');
  const link = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.links.at(-1)!;
  expect(link.from).toBe('note-b');
  expect(link.fromAnchor).toBe('north');
  expect(link.toAnchor).toBe('south');
  await page.keyboard.press('v');
  await page.getByRole('group', { name: 'Zona Eve', exact: true }).press('Enter');
  await expect(
    page.getByRole('complementary', { name: 'Inspector de zona', exact: true }),
  ).toBeVisible();
});
