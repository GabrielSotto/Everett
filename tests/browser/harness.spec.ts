import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';
import { snapshot } from './canvas-utility-helpers';

test('UI-HARNESS-06: leer el estado espera la inicialización y conserva el dato real al publicarse', async ({
  page,
}) => {
  const before = await snapshot(page);
  // Controlar la frontera de disponibilidad sin fabricar un estado del producto.
  await page.evaluate(() => {
    const debug = window.EverettDebug!;
    window.__everettReady = false;
    delete window.EverettDebug;
    window.addEventListener(
      'everett-test-publish-ready',
      () => {
        window.EverettDebug = debug;
        window.__everettReady = true;
      },
      { once: true },
    );
  });
  let settled = false;
  const reading = snapshot(page).then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  void reading.then(() => (settled = true));
  try {
    // La ida y vuelta se procesa después de la primera lectura intentada.
    expect(await page.evaluate(() => window.__everettReady)).toBe(false);
    expect(settled, 'No debe resolver ni fallar antes de que Everett esté disponible').toBe(false);
  } finally {
    await page.evaluate(() => window.dispatchEvent(new Event('everett-test-publish-ready')));
  }
  const result = await reading;
  if ('error' in result) throw result.error;
  expect(result.value.state).toEqual(before.state);
});

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

test('UI-HARNESS-04: observa cables SVG horizontales y verticales y rechaza geometría oculta, vacía y clics sintéticos', async ({
  page,
  controls,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  await page.evaluate(() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'svg-probe';
    svg.setAttribute('width', '220');
    svg.setAttribute('height', '180');
    svg.style.cssText = 'position:fixed;left:100px;top:100px;z-index:100';
    svg.innerHTML =
      '<g><path data-action="probe-horizontal" d="M 10 40 L 180 40" stroke="white" stroke-width="14" fill="none"/><path data-action="probe-vertical" d="M 190 60 L 190 150" stroke="white" stroke-width="14" fill="none"/><path data-action="probe-empty" d="M 10 160" stroke="white" stroke-width="14" fill="none"/></g>';
    document.body.append(svg);
  });
  const uses = () => controls.filter((c) => c.action.startsWith('probe-'));
  await page.mouse.click(160, 140);
  await page.mouse.click(290, 200);
  await expect.poll(() => uses().length).toBe(2);
  expect(uses()).toEqual([
    { action: 'probe-horizontal', trusted: true, visible: true },
    { action: 'probe-vertical', trusted: true, visible: true },
  ]);
  const horizontal = page.locator('#svg-probe [data-action=probe-horizontal]');
  await horizontal.dispatchEvent('click');
  await expect.poll(() => uses().length).toBe(3);
  expect(uses()[2]).toEqual({ action: 'probe-horizontal', trusted: false, visible: true });
  for (const property of ['opacity', 'display'] as const) {
    await horizontal.evaluate((el, property) => {
      (el.parentElement as unknown as SVGElement).style.setProperty(
        property,
        property === 'opacity' ? '0' : 'none',
      );
    }, property);
    await horizontal.dispatchEvent('click');
    await expect.poll(() => uses().length).toBe(property === 'opacity' ? 4 : 5);
    expect(uses().at(-1)!.visible).toBe(false);
    await horizontal.evaluate(
      (el, property) => (el.parentElement as unknown as SVGElement).style.removeProperty(property),
      property,
    );
  }
  await page.locator('#svg-probe [data-action=probe-empty]').dispatchEvent('click');
  await expect.poll(() => uses().length).toBe(6);
  expect(uses().at(-1)!.visible).toBe(false);
  await page.locator('#svg-probe').evaluate((el) => el.remove());
});
