import { test, expect } from './fixtures';
import { enterWorld, openSurface, reachSurface } from './interaction-helpers';

test('UI-STABILITY-01: los remontajes de las seis superficies conservan edición y una única interfaz', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await enterWorld(page);
  await openSurface(page, 'Docs');
  const text = 'Edición conservada a través de todos los contextos.\n\nÚltimo párrafo.';
  await page.getByRole('textbox', { name: 'Contenido del documento', exact: true }).fill(text);
  await page.keyboard.press('Escape');
  const durations: number[] = [];
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const name of ['Code', 'Canvas', 'Docs', 'Board', 'Agents', 'Session']) {
      const start = Date.now();
      await expect(page.locator('.surface-object')).toHaveCount(6);
      await reachSurface(page, name);
      await page
        .getByRole('main')
        .getByRole('button', { name, exact: true })
        .locator('.surface-label')
        .click();
      await page.keyboard.press('Enter');
      await expect(page.locator('.transition-ghost')).toHaveCount(0);
      if (name === 'Docs')
        await expect(
          page.getByRole('textbox', { name: 'Contenido del documento', exact: true }),
        ).toHaveValue(text);
      await page.keyboard.press('Escape');
      await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'world/scout');
      await expect(page.locator('.transition-ghost')).toHaveCount(0);
      await expect(page.locator('.surface-object')).toHaveCount(6);
      await expect(page.locator('#shell')).toHaveCount(1);
      durations.push(Date.now() - start);
    }
  }
  const commands = await page.evaluate(() =>
    window.EverettDebug!.logs().filter((entry) => entry.event === 'transition.started'),
  );
  expect(commands.length).toBe(39);
  await testInfo.attach('duraciones-recorridos', {
    body: JSON.stringify(durations),
    contentType: 'application/json',
  });
});

test('UI-A11Y-01: Quick Chat conserva borrador y controles alcanzables al contraerse y estrecharse', async ({
  page,
}, testInfo) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  await page.setViewportSize({ width: 720, height: 640 });
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  const chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
  const composer = chat.getByRole('textbox', { name: 'Escribí un mensaje…', exact: true });
  await composer.fill('Borrador largo\n'.repeat(20));
  await chat.getByRole('button', { name: 'Contraer chat', exact: true }).click();
  await expect(chat).toHaveClass(/compact/);
  await expect(composer).not.toBeInViewport();
  await expect(page.locator('#canvas-chat-composer-input')).toBeHidden();
  await expect(chat.getByRole('textbox')).toHaveCount(0);
  await chat.getByRole('button', { name: 'Contraer chat', exact: true }).click();
  await expect(composer).toHaveValue('Borrador largo\n'.repeat(20));
  await page.setViewportSize({ width: 360, height: 640 });
  await expect
    .poll(async () => {
      const bounds = await chat.boundingBox();
      return !!bounds && bounds.x >= 0 && bounds.x + bounds.width <= 360;
    })
    .toBe(true);
  for (const name of ['Cerrar chat', 'Enviar', 'Anclar chat'])
    await expect(chat.getByRole('button', { name, exact: true })).toBeInViewport();
  await chat.getByRole('button', { name: 'Cerrar chat', exact: true }).press('Enter');
  await expect(chat).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Quick Chat', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(composer).toHaveValue('Borrador largo\n'.repeat(20));
  await composer.press('Escape');
  await expect(chat).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Quick Chat', exact: true })).toBeFocused();
  await testInfo.attach('chat-estrecho', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
