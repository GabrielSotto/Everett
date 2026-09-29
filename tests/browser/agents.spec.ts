import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';

test('UI-AGENTS-01: crear un agente, fijar memoria y pausar conserva el estado al regresar', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Agents');
  await page.getByRole('button', { name: 'Crear agente', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nombre del agente', exact: true })
    .fill('Revisión de continuidad');
  await page.getByRole('button', { name: 'Confirmar creación del agente', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Revisión de continuidad', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Memoria', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Fijar contexto', exact: true })
    .fill('Conservar identidad y contenido al cambiar de superficie.');
  await page.getByRole('button', { name: 'Guardar nota', exact: true }).click();
  await expect(page.locator('.memory-note')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pausar agente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Activar agente', exact: true })).toBeVisible();
  await openSurface(page, 'Canvas');
  await openSurface(page, 'Agents');
  await page.getByRole('button', { name: /Revisión de continuidad/ }).click();
  await expect(page.getByRole('button', { name: 'Activar agente', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Memoria', exact: true }).click();
  await expect(page.locator('.memory-note')).toContainText(
    'Conservar identidad y contenido al cambiar de superficie.',
  );
  await page.getByRole('button', { name: 'Quitar nota', exact: true }).click();
  await expect(page.locator('.memory-note')).toHaveCount(0);
  await page.getByRole('button', { name: 'Activar agente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar agente', exact: true })).toBeVisible();
});
