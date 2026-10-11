import { test, expect } from './fixtures';
import { enterWorld, openSurface, assignMaterial } from './interaction-helpers';

test('UI-CANVAS-01: el doble clic abre la nota, conserva la edición y regresa al origen', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const note = page.locator('.material.note').filter({
    has: page.getByRole('heading', {
      name: 'Recuperar evidencia útil para una tarea',
      exact: true,
    }),
  });
  const id = await note.getAttribute('data-node');
  const origin = await note.boundingBox();
  const count = await page.locator('.material').count();
  await note.dblclick();
  await expect(page.getByRole('textbox', { name: 'Título de la nota', exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Título de la nota', exact: true })
    .fill('Observación comprobada');
  const text = 'Primera observación\n\nSegunda observación';
  await page.getByRole('textbox', { name: 'Contenido de la nota', exact: true }).fill(text);
  await page.keyboard.press('Escape');
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  const returned = page.locator(`.material[data-node="${id}"]`);
  await expect(returned.getByRole('heading')).toHaveText('Observación comprobada');
  await expect(returned.locator('p')).toHaveText(text);
  await expect(page.locator('.material')).toHaveCount(count);
  const position = await returned.boundingBox();
  expect(position?.x).toBeCloseTo(origin!.x, 1);
  expect(position?.y).toBeCloseTo(origin!.y, 1);
  await returned.dblclick();
  await expect(
    page.getByRole('textbox', { name: 'Contenido de la nota', exact: true }),
  ).toHaveValue(text);
});

test('UI-CANVAS-02: arrastrar una nota permite deshacer y rehacer su posición con teclado', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const note = page.locator('.material[data-node="note-b"]');
  const before = (await note.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 90, before.y + before.height / 2 + 60, {
    steps: 8,
  });
  await page.mouse.up();
  const moved = (await note.boundingBox())!;
  expect(moved.x - before.x).toBeCloseTo(90, 0);
  expect(moved.y - before.y).toBeCloseTo(60, 0);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await note.boundingBox())?.x).toBeCloseTo(before.x, 0);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(async () => (await note.boundingBox())?.x).toBeCloseTo(moved.x, 0);
  await expect(page.getByRole('textbox', { name: 'Título de la nota', exact: true })).toHaveCount(
    0,
  );
});

test('UI-CANVAS-03: rechazar una propuesta devuelve la nota y sus conexiones sin modificarla', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const note = page.locator('.material[data-node="note-a"]');
  const before = await note.locator('p').innerText();
  const position = (await note.boundingBox())!;
  const connections = await page.locator('.canvas-links [data-link]').count();
  await assignMaterial(page, 'note-a', 'Resumir');
  await expect(note).toHaveCount(0);
  const assigned = page.locator('[data-assigned-id="note-a"]');
  await expect(assigned).toContainText(before);
  await expect(page.getByRole('button', { name: 'Rechazar propuesta', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Cambios solicitados', exact: true })
    .fill('Borrador sin enviar');
  await page.getByRole('button', { name: 'Cancelar pedido de cambios', exact: true }).click();
  await expect(assigned).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aceptar propuesta', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rechazar propuesta', exact: true }).click();
  await expect(note.locator('p')).toHaveText(before);
  await expect(assigned).toHaveCount(0);
  await expect(page.locator('.proposal')).toHaveCount(0);
  await expect(page.locator('.canvas-links [data-link]')).toHaveCount(connections);
  const returned = (await note.boundingBox())!;
  expect(returned.x).toBeCloseTo(position.x, 1);
  expect(returned.y).toBeCloseTo(position.y, 1);
});

test('UI-CANVAS-04: una referencia abre el mismo documento y vuelve con su contenido actualizado', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const reference = page.locator('.material.reference').filter({
    has: page.getByRole('heading', { name: 'Resource Scout · visión', exact: true }),
  });
  const before = (await reference.boundingBox())!;
  await reference.dblclick();
  const body = page.getByRole('textbox', { name: 'Contenido del documento', exact: true });
  await expect(body).toBeVisible();
  await body.fill('Contenido compartido\n\nActualizado desde Canvas.');
  await page.keyboard.press('Escape');
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await expect(reference.locator('p')).toHaveText(
    'Contenido compartido\n\nActualizado desde Canvas.',
  );
  expect((await reference.boundingBox())!.x).toBeCloseTo(before.x, 1);
  await openSurface(page, 'Docs');
  await page.getByRole('button', { name: 'Resource Scout · visión', exact: true }).click();
  await expect(body).toHaveValue('Contenido compartido\n\nActualizado desde Canvas.');
});

test('UI-CANVAS-05: redimensionar y conectar conserva los anclajes y admite historial', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const first = page.locator('.material[data-node="note-a"]');
  const second = page.locator('.material[data-node="note-b"]');
  await second.click();
  const before = (await second.boundingBox())!;
  const handle = (await second
    .getByRole('button', { name: 'Redimensionar se', exact: true })
    .boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 40, handle.y + handle.height / 2 + 30, {
    steps: 8,
  });
  await page.mouse.up();
  expect((await second.boundingBox())!.width - before.width).toBeCloseTo(40, 0);
  expect((await second.boundingBox())!.height - before.height).toBeCloseTo(30, 0);
  await page.getByRole('button', { name: 'Conectar · L', exact: true }).click();
  const count = await page.locator('.canvas-links [data-link]').count();
  const source = (await first
    .getByRole('button', { name: 'Anclaje south', exact: true })
    .boundingBox())!;
  const destination = (await second
    .getByRole('button', { name: 'Anclaje north', exact: true })
    .boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.locator('.canvas-links [data-link]')).toHaveCount(count + 1);
  const connection = page.locator('.canvas-links [data-link] .link-line').last();
  const path = await connection.getAttribute('d');
  expect(path).toMatch(/^M/);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.canvas-links [data-link]')).toHaveCount(count);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.canvas-links [data-link]')).toHaveCount(count + 1);
  await expect(page.locator('.canvas-links [data-link] .link-line').last()).toHaveAttribute(
    'd',
    path!,
  );
});
