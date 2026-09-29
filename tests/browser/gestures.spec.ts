import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';

type Interruption = 'pointercancel' | 'capture-loss' | 'window-blur';

async function interrupt(page: Page, reason: Interruption): Promise<void> {
  await page.evaluate((reason) => {
    const capture = [...document.querySelectorAll('*')].find((el) => el.hasPointerCapture(1));
    if (!capture) throw new Error('El gesto debe tener captura antes de interrumpirlo');
    if (reason === 'capture-loss') capture.releasePointerCapture(1);
    else if (reason === 'window-blur') window.dispatchEvent(new Event('blur'));
    else capture.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }));
  }, reason);
  await page.mouse.move(710, 310);
}

async function drag(page: Page, target: Locator, dx: number, dy: number): Promise<void> {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 6 });
}

for (const reason of ['pointercancel', 'capture-loss', 'window-blur'] as const) {
  test(`UI-GESTURE-01 ${reason}: interrumpir paneo recupera cámara y cursor`, async ({ page }) => {
    await enterWorld(page);
    for (const surface of ['Mundo', 'Canvas']) {
      if (surface === 'Canvas') {
        await openSurface(page, 'Canvas');
        await page.getByRole('button', { name: 'Panear · H', exact: true }).click();
      }
      await page.mouse.move(720, 430);
      await page.mouse.down();
      await page.mouse.move(780, 470, { steps: 6 });
      await expect(page.locator('#scene')).toHaveCSS('cursor', 'grabbing');
      await interrupt(page, reason);
      await expect(page.locator('#scene')).not.toHaveCSS('cursor', 'grabbing');
      await page.mouse.up();
      await expect
        .poll(() =>
          page.evaluate(() => {
            const animations = document.getAnimations().filter((a) => a.playState === 'running');
            return animations.length;
          }),
        )
        .toBe(0);
      const before = await page.evaluate(() => window.EverettDebug!.snapshot().camera);
      await page.mouse.move(980, 610, { steps: 6 });
      // Dos lecturas separadas permiten detectar un gesto que continúa sin botón pulsado.
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 200)));
      const after = await page.evaluate(() => window.EverettDebug!.snapshot().camera);
      expect(after.x).toBeCloseTo(before.x, 0);
      expect(after.y).toBeCloseTo(before.y, 0);
      await page.mouse.move(720, 430);
      await page.mouse.down();
      await page.mouse.move(750, 450, { steps: 6 });
      await page.mouse.up();
      await expect(page.locator('#scene')).not.toHaveCSS('cursor', 'grabbing');
    }
  });

  test(`UI-GESTURE-02 ${reason}: cancelar arrastre y tamaño conserva el material y sus enlaces`, async ({
    page,
  }) => {
    await enterWorld(page);
    await openSurface(page, 'Canvas');
    const note = page.locator('.material[data-node="note-b"]');
    const original = await note.boundingBox();
    const contents = await note.innerText();
    const links = await page
      .locator('.canvas-links .link-line')
      .evaluateAll((els) => els.map((el) => el.getAttribute('d')));
    for (const operation of ['move', 'resize']) {
      await note.click();
      const target =
        operation === 'move'
          ? note
          : note.getByRole('button', { name: 'Redimensionar se', exact: true });
      await drag(page, target, 80, 40);
      expect(await note.boundingBox()).not.toEqual(original);
      await interrupt(page, reason);
      await page.mouse.up();
      await expect.poll(() => note.boundingBox()).toEqual(original);
      await expect(note).toHaveText(contents, { useInnerText: true });
      expect(
        await page
          .locator('.canvas-links .link-line')
          .evaluateAll((els) => els.map((el) => el.getAttribute('d'))),
      ).toEqual(links);
      await page.mouse.move(950, 600, { steps: 5 });
      expect(await note.boundingBox()).toEqual(original);
    }
    await drag(page, note, 50, 25);
    await page.mouse.up();
    expect((await note.boundingBox())!.x).toBeCloseTo(original!.x + 50, 0);
    await page.keyboard.press('Control+z');
    await expect.poll(() => note.boundingBox()).toEqual(original);
  });

  test(`UI-GESTURE-04 ${reason}: chat y minimapa recuperan el control tras interrumpir su arrastre`, async ({
    page,
  }) => {
    await enterWorld(page);
    await openSurface(page, 'Canvas');
    await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
    const chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
    const composer = chat.getByRole('textbox', { name: 'Escribí un mensaje…', exact: true });
    await composer.fill('Borrador durante el arrastre');
    const original = await chat.boundingBox();
    await drag(page, chat.locator('.chat-grip'), 360, 40);
    await interrupt(page, reason);
    await page.mouse.up();
    await expect(chat).toHaveClass(/quick/);
    await expect.poll(() => chat.boundingBox()).toEqual(original);
    await expect(composer).toHaveValue('Borrador durante el arrastre');
    await page.getByRole('button', { name: 'Cerrar chat', exact: true }).click();
    await page.getByRole('button', { name: 'Everett', exact: true }).click();
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
    const map = page.locator('#minimap');
    await page.keyboard.down('Shift');
    await drag(page, map, 20, 15);
    await interrupt(page, reason);
    await page.mouse.up();
    await page.keyboard.up('Shift');
    const center = await map.getAttribute('data-center');
    const bounds = (await map.boundingBox())!;
    await page.mouse.move(bounds.x + 20, bounds.y + 20, { steps: 5 });
    expect(await map.getAttribute('data-center')).toBe(center);
    await page.keyboard.down('Shift');
    await drag(page, map, -10, -10);
    await page.mouse.up();
    await page.keyboard.up('Shift');
    expect(await map.getAttribute('data-center')).not.toBe(center);
  });
}

test('UI-GESTURE-03: soltar fuera del viewport finaliza el gesto y permite volver a navegar', async ({
  page,
}) => {
  await enterWorld(page);
  await page.mouse.move(720, 420);
  await page.mouse.down();
  await page.mouse.move(-20, 420, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('#scene')).not.toHaveCSS('cursor', 'grabbing');
  await openSurface(page, 'Canvas');
  await expect(page.locator('#canvas-stage')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'world/scout');
});

test('UI-LINK-01: conexiones propias, vacías y canceladas no agregan enlaces y el siguiente gesto funciona', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  await page.getByRole('button', { name: 'Conectar · C', exact: true }).click();
  const first = page.locator('.material[data-node="note-a"]');
  const second = page.locator('.material[data-node="note-b"]');
  const source = first.getByRole('button', { name: 'Anclaje south', exact: true });
  const links = page.locator('.canvas-links [data-link]');
  const count = await links.count();
  for (const destination of ['self', 'empty', 'cancel']) {
    await drag(page, source, 0, 30);
    if (destination === 'self') {
      const box = (await first
        .getByRole('button', { name: 'Anclaje north', exact: true })
        .boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    } else if (destination === 'empty') await page.mouse.move(720, 150);
    else await interrupt(page, 'pointercancel');
    await page.mouse.up();
    await expect(links).toHaveCount(count);
    await expect(page.locator('.pending-link')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.EverettDebug!.snapshot().ui.canvas.linkStart))
      .toBeNull();
  }
  const destination = (await second
    .getByRole('button', { name: 'Anclaje north', exact: true })
    .boundingBox())!;
  await drag(page, source, 0, 30);
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
  );
  await page.mouse.up();
  await expect(links).toHaveCount(count + 1);
  await page.keyboard.press('Control+z');
  await expect(links).toHaveCount(count);
  await source.click();
  await second.getByRole('button', { name: 'Anclaje north', exact: true }).click();
  await expect(links).toHaveCount(count + 1);
});

test('UI-HISTORY-01: el historial de texto y el de Canvas conservan sus contenidos independientes', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const note = page.locator('.material[data-node="note-b"]');
  const origin = (await note.boundingBox())!;
  await drag(page, note, 60, 35);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Escribí un mensaje…', exact: true });
  await input.pressSequentially('Borrador conservado');
  await input.press('Control+z');
  await expect(input).toHaveValue('');
  expect((await note.boundingBox())!.x).toBeCloseTo(origin.x + 60, 0);
  await input.press('Control+Shift+z');
  await expect(input).toHaveValue('Borrador conservado');
  await input.press('Escape');
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await note.boundingBox())!.x).toBeCloseTo(origin.x, 0);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(async () => (await note.boundingBox())!.x).toBeCloseTo(origin.x + 60, 0);
  await openSurface(page, 'Docs');
  const body = page.getByRole('textbox', { name: 'Contenido del documento', exact: true });
  const original = await body.inputValue();
  await body.press('Control+End');
  await body.pressSequentially(' Texto agregado');
  await body.press('Control+z');
  await expect(body).toHaveValue(original);
  await body.press('Control+Shift+z');
  await expect(body).toHaveValue(original + ' Texto agregado');
  await openSurface(page, 'Canvas');
  expect((await note.boundingBox())!.x).toBeCloseTo(origin.x + 60, 0);
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await expect(input).toHaveValue('Borrador conservado');
});
