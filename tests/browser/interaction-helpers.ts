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

/** Alcanzar destinos espaciales mediante el paneo disponible al usuario. */
export async function reachSurface(page: Page, name: string): Promise<void> {
  const label = page
    .getByRole('main')
    .getByRole('button', { name, exact: true })
    .locator('.surface-label');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Falta el tamaño del viewport');
  for (let attempt = 0; attempt < 8; attempt++) {
    const bounds = await label.boundingBox();
    if (!bounds) throw new Error(`No se puede medir ${name}`);
    const x = bounds.x + bounds.width / 2,
      y = bounds.y + bounds.height / 2;
    const dx = Math.max(100, Math.min(viewport.width - 100, x)) - x;
    const dy = Math.max(100, Math.min(viewport.height - 100, y)) - y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) break;
    const travel = (delta: number): number =>
      delta ? Math.sign(delta) * Math.min(300, Math.max(140, Math.abs(delta) + 80)) : 0;
    const start = { x: viewport.width / 2, y: viewport.height / 2 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + travel(dx), start.y + travel(dy), { steps: 12 });
    await page.mouse.up();
    let previous: { x: number; y: number } | null = null,
      settled = 0;
    await expect
      .poll(
        async () => {
          const current = await label.boundingBox();
          settled =
            current && previous && Math.hypot(current.x - previous.x, current.y - previous.y) < 0.25
              ? settled + 1
              : 0;
          previous = current;
          return settled;
        },
        { intervals: [100] },
      )
      .toBeGreaterThanOrEqual(3);
  }
  // La razón de intersección redondea 1 a 0.999999 en elementos transformados.
  // Comprobar sus bordes reales conserva la exigencia de inclusión completa.
  await expect
    .poll(async () => {
      const bounds = await label.boundingBox();
      return (
        !!bounds &&
        bounds.x >= 0 &&
        bounds.y >= 59 &&
        bounds.x + bounds.width <= viewport.width &&
        bounds.y + bounds.height <= viewport.height
      );
    })
    .toBe(true);
  expect(
    await page.locator('#space').evaluate((space) => [space.scrollLeft, space.scrollTop]),
  ).toEqual([0, 0]);
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
