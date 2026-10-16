import type { Page, TestInfo } from '@playwright/test';
import { expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';
import { storedFixture } from './canvas-fixtures';

export const snapshot = (page: Page) => page.evaluate(() => window.EverettDebug!.snapshot());
export const world = async (page: Page) =>
  (await snapshot(page)).state.worlds.find((item) => item.id === 'scout')!;

export async function start(page: Page): Promise<void> {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const input = await snapshot(page);
  const project = input.state.worlds.find((item) => item.id === 'scout')!;
  project.nodes = [];
  project.links = [];
  project.zones = [];
  project.assignments = [];
  project.comments = [];
  input.state.camera = { x: 0, y: 0, z: 1 };
  Object.assign(input.ui.canvas, {
    selection: null,
    selections: [],
    zoneSelection: null,
    linkSelection: null,
    tool: 'select',
  });
  input.ui.chat.chatMode = 'closed';
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
}

export async function capture(page: Page, info: TestInfo, name: string): Promise<void> {
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.playState === 'running' &&
                Number.isFinite(animation.effect?.getComputedTiming().iterations ?? 0),
            ).length,
      ),
    )
    .toBe(0);
  const path = info.outputPath(name + '.png');
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}

export async function moveMaterial(page: Page, id: string, x: number, y: number): Promise<void> {
  const box = (await page.locator(`[data-node="${id}"]`).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
}

export async function reference(
  page: Page,
  kind: 'document' | 'file' | 'task',
  id: string,
  x: number,
  y: number,
): Promise<string> {
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator(`[data-action=reference-add][data-kind="${kind}"][data-id="${id}"]`).click();
  const node = (await world(page)).nodes.at(-1)!;
  expect(node.data).toEqual({ kind: 'reference', ref: { kind, id } });
  await moveMaterial(page, node.id, x, y);
  return node.id;
}

export async function connect(page: Page, from: string, to: string, label: string): Promise<void> {
  await page.getByRole('button', { name: 'Conectar · L', exact: true }).click();
  await page.locator(`[data-anchor-node="${from}"][data-anchor=east]`).click();
  await page.locator(`[data-anchor-node="${to}"][data-anchor=west]`).click();
  await page.getByRole('button', { name: 'Conectar · L', exact: true }).click();
  const link = (await world(page)).links.at(-1)!;
  const path = page.locator(`[data-link="${link.id}"] .link-hit`);
  await path.focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Etiqueta de conexión', { exact: true }).fill(label);
  await page.getByLabel('Etiqueta de conexión', { exact: true }).press('Enter');
  await expect(page.locator(`[data-link="${link.id}"] text`)).toHaveText(label);
}
