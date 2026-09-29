import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';

for (const [surface, prompt, trigger] of [
  ['Code', 'Pedile un cambio a Milo…', 'Hablar con Milo'],
  ['Docs', 'Trabajá sobre este documento…', 'Asistente de escritura'],
  ['Session', 'Escribí lo que tenés en mente…', null],
  ['Agents', 'Conversá con Eve…', 'Hablar con Eve'],
] as const) {
  test(`UI-DRAFT-01 ${surface}: salir conserva el borrador y enviar lo consume una sola vez`, async ({
    page,
  }) => {
    const open = async () => {
      await openSurface(page, surface);
      if (surface === 'Agents') {
        await page.locator('[data-action="agent-open"][data-id="eve"]').click();
        await expect(page.locator('.transition-ghost')).toHaveCount(0);
      }
      if (trigger) await page.getByRole('button', { name: trigger, exact: true }).click();
    };
    await enterWorld(page);
    await open();
    const field = page.getByRole('textbox', { name: prompt, exact: true });
    const draft = 'Resumir el contexto\n\nConservar este borrador';
    await field.fill(draft);
    await openSurface(page, 'Board');
    await open();
    await expect(field).toHaveValue(draft);
    await field.fill('Resumir');
    await field.press('Enter');
    await expect(field).toHaveValue('');
    await openSurface(page, 'Board');
    await open();
    await expect(field).toHaveValue('');
  });
}

test('UI-DRAFT-02: cambiar de documento o Mundo mantiene borradores independientes', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Docs');
  const trigger = page.getByRole('button', { name: 'Asistente de escritura', exact: true });
  const input = page.getByRole('textbox', { name: 'Trabajá sobre este documento…', exact: true });
  await trigger.click();
  await input.fill('Borrador del documento original');
  const original = await page
    .locator('.docs-list [data-action="doc-open"].selected')
    .getAttribute('data-id');
  await page.getByRole('button', { name: 'Crear documento', exact: true }).click();
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await trigger.click();
  await expect(input).toHaveValue('');
  await input.fill('Borrador del segundo documento');
  await page.locator(`.docs-list [data-id="${original}"]`).click();
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await expect(input).toHaveValue('Borrador del documento original');
  await page.getByRole('button', { name: 'Everett', exact: true }).click();
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Buscar en Everett', exact: true })
    .fill('Laboratorio de captura');
  const other = page
    .getByRole('main')
    .getByRole('button', { name: 'Laboratorio de captura', exact: true });
  await expect(other).toBeInViewport();
  await page.getByRole('button', { name: 'Cerrar búsqueda', exact: true }).click();
  await other.click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await openSurface(page, 'Docs');
  await trigger.click();
  await expect(input).toHaveValue('');
  await input.fill('Borrador de otro Mundo');
  await page.getByRole('button', { name: 'Everett', exact: true }).click();
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await enterWorld(page);
  await openSurface(page, 'Docs');
  await trigger.click();
  await expect(input).toHaveValue('Borrador del documento original');
});
