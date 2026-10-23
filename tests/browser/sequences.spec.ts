import { test, expect } from './fixtures';
import { enterWorld, openSurface, assignMaterial } from './interaction-helpers';
import { seededOrder } from './resource-probe';

for (const [seed, reducedMotion] of [
  [17, 'no-preference'],
  [91, 'no-preference'],
  [2026, 'no-preference'],
  [17, 'reduce'],
] as const) {
  test(`UI-SEQUENCE-01 semilla ${seed}, ${reducedMotion}: alternar superficies, rueda y paneles durante transiciones conserva contexto`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion });
    await enterWorld(page);
    await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
    await page.getByRole('button', { name: 'Configuración', exact: true }).click();
    await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
    await page.getByRole('switch', { name: 'Mostrar botón de Superficies', exact: true }).click();
    await page.keyboard.press('Escape');
    await openSurface(page, 'Docs');
    const text = `Documento protegido en secuencia ${seed}\n\nSegunda línea.`;
    await page.getByRole('textbox', { name: 'Contenido del documento', exact: true }).fill(text);
    const steps: { surface: string; route: string | null }[] = [];
    try {
      for (let round = 0; round < 3; round++) {
        for (const surface of seededOrder(
          ['Canvas', 'Code', 'Docs', 'Agents', 'Session', 'Board'],
          seed + round,
        )) {
          await page.getByRole('button', { name: 'Superficies', exact: true }).click();
          await page
            .locator('.surface-menu')
            .getByRole('button', { name: surface, exact: true })
            .press('Enter');
          // Escape llega durante la entrada; la salida reemplaza una transición todavía activa.
          await page.keyboard.press('Escape');
          await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'world/scout');
          await page.mouse.move(720, 460);
          await page.mouse.wheel(0, -60);
          await page.mouse.wheel(0, 60);
          await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).press('Enter');
          await page.keyboard.press('Escape');
          await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'world/scout');
          await expect(page.locator('.profile-pop:not(.panel-exit)')).toHaveCount(0);
          await expect(page.locator('.transition-ghost')).toHaveCount(0);
          await expect(page.locator('#scene')).toHaveCount(1);
          await expect(page.locator('.surface-object')).toHaveCount(6);
          steps.push({
            surface,
            route: await page.locator('#viewport').getAttribute('data-route'),
          });
        }
      }
      await openSurface(page, 'Docs');
      await expect(
        page.getByRole('textbox', { name: 'Contenido del documento', exact: true }),
      ).toHaveValue(text);
      const state = await page.evaluate(() => {
        const diagnostic = window.EverettDebug!.snapshot();
        return {
          camera: diagnostic.camera,
          worlds: diagnostic.state.worlds.map((w) => w.id),
          errors: window.EverettDebug!.logs().filter((e) => e.level === 'error'),
          interrupted: window
            .EverettDebug!.logs()
            .filter((e) => e.event === 'transition.interrupted').length,
        };
      });
      expect(Object.values(state.camera).every(Number.isFinite)).toBe(true);
      expect(state.camera.z).toBeGreaterThan(0);
      expect(new Set(state.worlds).size).toBe(state.worlds.length);
      expect(state.errors).toEqual([]);
      expect(state.interrupted).toBeGreaterThan(0);
    } finally {
      await testInfo.attach('secuencia-reproducible', {
        body: JSON.stringify({ seed, reducedMotion, steps }),
        contentType: 'application/json',
      });
    }
  });
}

test('UI-SEQUENCE-02: una respuesta pendiente atraviesa otras superficies y la revisión cancelada no reaparece', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const note = page.locator('.material[data-node="note-a"]');
  const original = await note.locator('p').innerText();
  await assignMaterial(page, 'note-a', 'Analizar');
  await expect(page.getByRole('status', { name: 'Agente trabajando', exact: true })).toBeVisible();
  await openSurface(page, 'Docs');
  await page
    .getByRole('textbox', { name: 'Contenido del documento', exact: true })
    .fill('Edición durante el trabajo pendiente');
  await openSurface(page, 'Canvas');
  await expect(page.locator('.proposal')).toHaveCount(1);
  await page.getByRole('group', { name: 'Zona Eve', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Revisar propuesta', exact: true }).click();
  await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
  await page.getByRole('textbox', { name: 'Cambios solicitados', exact: true }).fill('Resumir');
  await page.getByRole('button', { name: 'Enviar cambios', exact: true }).click();
  await page.locator('.agent-zone').click({ position: { x: 12, y: 12 } });
  await page
    .getByRole('button', { name: 'Quitar agente y devolver materiales', exact: true })
    .click();
  await openSurface(page, 'Code');
  await openSurface(page, 'Docs');
  await expect(
    page.getByRole('textbox', { name: 'Contenido del documento', exact: true }),
  ).toHaveValue('Edición durante el trabajo pendiente');
  await openSurface(page, 'Canvas');
  await expect(note.locator('p')).toHaveText(original);
  await expect(page.locator('.proposal,.working-dots,[data-assigned-id]')).toHaveCount(0);
  const runs = await page.evaluate(() =>
    window
      .EverettDebug!.snapshot()
      .state.worlds.find((w) => w.id === 'scout')!
      .runs.filter((r) => r.tools.includes('proposal.prepare')),
  );
  expect(runs.slice(-2).map((r) => r.status)).toEqual(['completed', 'cancelled']);
});
