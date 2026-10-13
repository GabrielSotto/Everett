import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';

test('UI-HARNESS-01: el comparador visual detecta la desaparición deliberada de controles', async ({
  page,
}, testInfo) => {
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.mouse.move(10, 70);
  await expect(page.getByRole('tooltip')).toHaveText('');
  const panel = page.locator('.profile-pop');
  const baseline = await panel.screenshot({ animations: 'disabled' });
  const name = 'control-del-comparador.png';
  const path = testInfo.snapshotPath(name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, baseline);
  await testInfo.attach('control-visible', { body: baseline, contentType: 'image/png' });
  expect(await panel.screenshot({ animations: 'disabled' })).toMatchSnapshot(name, {
    maxDiffPixels: 0,
  });
  const fault = await page.addStyleTag({
    content: '.profile-field { visibility: hidden !important; }',
  });
  try {
    const hidden = await panel.screenshot({ animations: 'disabled' });
    await testInfo.attach('controles-ocultos-intencionalmente', {
      body: hidden,
      contentType: 'image/png',
    });
    expect(hidden).not.toMatchSnapshot(name, { maxDiffPixels: 0 });
  } finally {
    await fault.evaluate((element: HTMLStyleElement) => element.remove());
  }
  expect(await panel.screenshot({ animations: 'disabled' })).toMatchSnapshot(name, {
    maxDiffPixels: 0,
  });
});

test('UI-HARNESS-03: la observación distingue clics programáticos, controles ocultos y activación real por mouse o teclado', async ({
  page,
  controls,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const uses = () => controls.filter((item) => item.action === 'references');
  const button = page.getByRole('button', { name: 'Incorporar materiales', exact: true });
  await button.evaluate((el) => (el as HTMLElement).click());
  await expect.poll(() => uses().length).toBe(1);
  expect(uses()[0]).toEqual({ action: 'references', trusted: false, visible: true });
  await button.evaluate((el) => {
    const control = el as HTMLElement;
    control.style.visibility = 'hidden';
    control.click();
  });
  await expect.poll(() => uses().length).toBe(2);
  expect(uses()[1]).toEqual({ action: 'references', trusted: false, visible: false });
  await button.evaluate((el) => (el as HTMLElement).style.removeProperty('visibility'));
  await button.evaluate((el) => {
    const control = el as HTMLElement;
    control.style.opacity = '0';
    control.click();
  });
  await expect.poll(() => uses().length).toBe(3);
  expect(uses()[2]).toEqual({ action: 'references', trusted: false, visible: false });
  await button.evaluate((el) => (el as HTMLElement).style.removeProperty('opacity'));
  await button.click();
  await expect.poll(() => uses().length).toBe(4);
  expect(uses()[3]).toEqual({ action: 'references', trusted: true, visible: true });
  await button.press('Enter');
  await expect.poll(() => uses().length).toBe(5);
  expect(uses()[4]).toEqual({ action: 'references', trusted: true, visible: true });
});
