import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';

test('UI-CHAT-01: conserva conversación, borrador y participantes entre Quick Chat, anclaje y Sessions', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  const chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
  const composer = chat.getByRole('textbox', { name: 'Escribí un mensaje…', exact: true });
  await composer.fill('Mensaje de continuidad');
  await chat.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(chat.locator('.chat-message.user').last()).toContainText('Mensaje de continuidad');
  await composer.fill('Borrador todavía sin enviar');
  await expect(composer).toHaveValue('Borrador todavía sin enviar');
  await chat.getByRole('button', { name: 'Anclar chat', exact: true }).click();
  await chat.getByRole('button', { name: 'Agregar personas', exact: true }).click();
  await chat.getByRole('textbox', { name: 'Nombre del participante', exact: true }).fill('Ada');
  await chat.getByRole('button', { name: 'Agregar persona', exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        window.EverettDebug!.snapshot().state.worlds.find((w) => w.id === 'scout')!
          .conversations[0]!.participants,
    ),
  ).toContain('Ada');
  await chat.getByRole('button', { name: 'Desacoplar chat', exact: true }).click();
  await expect(chat).toHaveClass(/quick/);
  await expect(composer).toHaveValue('Borrador todavía sin enviar');
  await openSurface(page, 'Session');
  await expect(page.getByLabel('Escribí lo que tenés en mente…', { exact: true })).toHaveValue(
    'Borrador todavía sin enviar',
  );
  await expect(page.locator('.message.user')).toContainText('Mensaje de continuidad');
  await openSurface(page, 'Canvas');
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await expect(composer).toHaveValue('Borrador todavía sin enviar');
  expect(
    await page.evaluate(
      () =>
        window.EverettDebug!.snapshot().state.worlds.find((w) => w.id === 'scout')!
          .conversations[0]!.participants,
    ),
  ).toContain('Ada');
  await expect(chat.locator('.chat-message.user')).toHaveCount(1);
});

test('UI-CHAT-02: arrastrar al chat referencia el material conservando propiedad y posición', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const note = page.locator('.material[data-node="note-b"]');
  const before = (await note.boundingBox())!;
  const content = await note.locator('p').innerText();
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await page.getByRole('button', { name: 'Anclar chat', exact: true }).click();
  const chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
  await expect
    .poll(() =>
      chat.evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length),
    )
    .toBe(0);
  const start = (await note.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(180, 300, { steps: 12 });
  await page.mouse.up();
  await expect(chat.locator('.chat-reference-list')).toContainText(
    'Recuperar evidencia útil para una tarea',
  );
  await expect(note.locator('p')).toHaveText(content);
  expect((await note.boundingBox())!.x).toBeCloseTo(before.x, 1);
  expect((await note.boundingBox())!.y).toBeCloseTo(before.y, 1);
  await chat.getByRole('button', { name: 'Desacoplar chat', exact: true }).click();
  await expect(chat.locator('.chat-reference-list')).toContainText(
    'Recuperar evidencia útil para una tarea',
  );
  await chat.getByRole('button', { name: 'Anclar chat', exact: true }).click();
  await expect(chat.locator('.chat-reference-list')).toContainText(
    'Recuperar evidencia útil para una tarea',
  );
  await expect(page.locator('[data-assigned-id="note-b"]')).toHaveCount(0);
});

test('UI-CHAT-03: responder, resolver y reabrir conserva el comentario asociado al material', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await page.getByRole('button', { name: 'Anclar chat', exact: true }).click();
  await page.getByRole('button', { name: 'Comentarios', exact: true }).click();
  const thread = page.locator('.comment-thread').first();
  const text = await thread.locator('p').first().innerText();
  await thread
    .getByRole('textbox', { name: 'Responder comentario', exact: true })
    .fill('Revisado en contexto');
  await thread.getByRole('button', { name: 'Enviar respuesta', exact: true }).click();
  await expect(thread.locator('.reply')).toHaveText('Revisado en contexto');
  await thread.getByRole('button', { name: 'Resolver comentario', exact: true }).click();
  await expect(thread).toHaveClass(/resolved/);
  await expect(page.locator('.material[data-node="note-a"] .comment-marker')).toHaveCount(0);
  await thread.getByRole('button', { name: 'Reabrir comentario', exact: true }).click();
  await expect(thread).not.toHaveClass(/resolved/);
  await expect(thread.locator('p').first()).toHaveText(text);
  await expect(thread.locator('.reply')).toHaveText('Revisado en contexto');
  await expect(page.locator('.material[data-node="note-a"] .comment-marker')).toHaveCount(1);
});
