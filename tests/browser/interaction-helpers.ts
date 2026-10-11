import type { Page } from '@playwright/test';
import { expect } from './fixtures';

export async function enterWorld(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Buscar en Everett', exact: true })
    .fill('Resource Scout');
  const world = page.getByRole('main').getByRole('button', { name: 'Resource Scout', exact: true });
  await expect(world).toBeInViewport();
  await page.getByRole('button', { name: 'Cerrar búsqueda', exact: true }).click();
  await world.click();
  await page.keyboard.press('Enter');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'world/scout');
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
}

export async function openSurface(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Superficies', exact: true }).click();
  await page.locator('.surface-menu').getByRole('button', { name, exact: true }).click();
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
}

export async function assignMaterial(
  page: Page,
  id: string,
  instruction = 'Resumir',
): Promise<void> {
  await page.locator(`.material[data-node="${id}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Asignar a una zona', exact: false }).click();
  await page
    .getByRole('menu', { name: 'Destinos del Mundo', exact: true })
    .getByRole('menuitem', { name: instruction, exact: true })
    .first()
    .click();
}
