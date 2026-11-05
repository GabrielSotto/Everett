import type { Page } from '@playwright/test';
import { expect } from './fixtures';
import { world, snapshot } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { wireframeMaterial, type WireframeKind } from '../../src/domain/wireframes';
import { entries } from '../../design/wireframe-library/samples.js';

export async function openLibrary(page: Page) {
  const panel = page.getByRole('dialog', { name: 'Biblioteca de bosquejos' });
  if (!(await panel.isVisible()))
    await page.getByRole('button', { name: 'Bosquejos', exact: true }).click();
  await expect(panel).toBeVisible();
  return panel;
}
export async function libraryTile(page: Page, id: string) {
  const panel = await openLibrary(page);
  await panel.getByRole('searchbox').fill(entries.find((item) => item.id === id)!.name);
  const tile = panel.locator(`[data-library-add="${id}"]`);
  await expect(tile).toBeVisible();
  return tile;
}
export async function addLibrary(page: Page, id: string) {
  const before = new Set((await world(page)).nodes.map((node) => node.id));
  await (await libraryTile(page, id)).click();
  await expect.poll(async () => (await world(page)).nodes.length).toBeGreaterThan(before.size);
  const panel = page.getByRole('dialog', { name: 'Biblioteca de bosquejos' });
  if (await panel.isVisible())
    await panel.getByRole('button', { name: 'Cerrar biblioteca' }).click();
  return (await world(page)).nodes.filter((node) => !before.has(node.id));
}
export async function dragLibrary(page: Page, id: string, x: number, y: number) {
  const before = new Set((await world(page)).nodes.map((node) => node.id));
  const tile = await libraryTile(page, id);
  const box = (await tile.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
  await expect(page.locator('.library-drag-preview')).toBeVisible();
  expect(
    await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.canvas-stage'), {
      x,
      y,
    }),
    'La suelta debe apuntar al Canvas, no a una superficie superpuesta',
  ).toBe(true);
  await page.mouse.up();
  await expect.poll(async () => (await world(page)).nodes.length).toBeGreaterThan(before.size);
  await expect(page.locator('.library-drag-preview')).toHaveCount(0);
  const close = page.getByRole('button', { name: 'Cerrar biblioteca' });
  if (await close.isVisible()) await close.click();
  return (await world(page)).nodes.filter((node) => !before.has(node.id));
}

/** Compatibilidad de materiales guardados: el catálogo retirado ya no es una entrada de UI. */
export async function legacyWireframe(page: Page, kind: WireframeKind) {
  const input = await snapshot(page);
  const project = input.state.worlds.find((item) => item.id === 'scout')!;
  const node = wireframeMaterial(kind, `legacy-${kind}-${project.nodes.length}`, { x: 0, y: 0 });
  project.nodes.push(node);
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await expect(page.locator(`[data-node="${node.id}"]`)).toBeVisible();
  return node;
}
