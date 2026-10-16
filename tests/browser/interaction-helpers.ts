import type { Page } from '@playwright/test';
import { expect } from './fixtures';
import { navigationTuning } from '../../src/spatial/tuning';
export async function openPeople(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Más acciones de conversación', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Agregar personas', exact: true }).click();
}

export async function undockChat(page: Page): Promise<void> {
  const chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
  await expect
    .poll(() =>
      chat.evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length),
    )
    .toBe(0);
  const grip = (await chat.locator('.chat-grip').boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + 360, grip.y + 100, { steps: 12 });
  await page.mouse.up();
  await expect(chat).toHaveClass(/quick/);
}

export async function enterWorld(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Buscar en Everett', exact: true })
    .fill('Resource Scout');
  const world = page.getByRole('main').getByRole('button', { name: 'Resource Scout', exact: true });
  await expect(world).toBeInViewport();
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await world.click();
  await page.keyboard.press('Enter');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'world/scout');
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
}

export async function openSurface(page: Page, name: string): Promise<void> {
  const alternate = page.getByRole('button', { name: 'Superficies', exact: true });
  if (await alternate.isVisible()) {
    await alternate.click();
    await page.locator('.surface-menu').getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
    return;
  }
  const route = page.locator('#viewport');
  for (
    let attempt = 0;
    attempt < 12 && (await route.getAttribute('data-route')) !== 'world/scout';
    attempt++
  ) {
    // Esc cierra paneles de trabajo. El zoom de salida conserva chat y borradores.
    await page.waitForTimeout(navigationTuning.cooldownMs);
    const before = await route.getAttribute('data-route');
    const viewport = page.viewportSize()!;
    await page.mouse.move(viewport.width - 30, 90);
    await page.keyboard.down('Alt');
    await page.mouse.wheel(0, 240);
    await page.keyboard.up('Alt');
    await expect(route).not.toHaveAttribute('data-route', before!);
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
  }
  await expect(route).toHaveAttribute('data-route', 'world/scout');
  await reachSurface(page, name);
  const surface = page.getByRole('main').getByRole('button', { name, exact: true });
  await surface.click();
  await page.keyboard.press('Enter');
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
