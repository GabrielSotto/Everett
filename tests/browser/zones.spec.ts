import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';

for (const action of ['Quitar agente y devolver materiales', 'Eliminar zona']) {
  test(`UI-ZONE-01 ${action}: devuelve el material completo y cancela el trabajo`, async ({
    page,
  }) => {
    await enterWorld(page);
    await openSurface(page, 'Canvas');
    const note = page.locator('.material[data-node="note-a"]');
    const original = await note.locator('p').innerText();
    const title = await note.getByRole('heading').innerText();
    const position = (await note.boundingBox())!;
    const links = await page
      .locator('.canvas-links .link-line')
      .evaluateAll((elements) => elements.map((e) => e.getAttribute('d')));
    await note.click();
    await page.getByRole('button', { name: 'Acciones del agente', exact: true }).click();
    await page.getByRole('button', { name: 'Analizar', exact: true }).click();
    const zone = page.locator('.agent-zone');
    await expect(zone.locator('[data-assigned-id="note-a"]')).toBeVisible();
    await zone.click({ position: { x: 12, y: 12 } });
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(note.locator('p')).toHaveText(original);
    await expect(note.getByRole('heading')).toHaveText(title);
    expect((await note.boundingBox())!.x).toBeCloseTo(position.x, 1);
    expect((await note.boundingBox())!.y).toBeCloseTo(position.y, 1);
    expect(
      await page
        .locator('.canvas-links .link-line')
        .evaluateAll((elements) => elements.map((e) => e.getAttribute('d'))),
    ).toEqual(links);
    await openSurface(page, 'Docs');
    await openSurface(page, 'Canvas');
    await expect(page.locator('.proposal,.working-dots,[data-assigned-id]')).toHaveCount(0);
    await expect(note.locator('p')).toHaveText(original);
    await expect(note.getByRole('heading')).toHaveText(title);
  });
}

test('UI-ZONE-02: aceptar crea el resultado y devuelve el original sin reemplazarlo', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const note = page.locator('.material[data-node="note-a"]');
  const original = await note.locator('p').innerText();
  const count = await page.locator('.material').count();
  await note.click();
  await page.getByRole('button', { name: 'Acciones del agente', exact: true }).click();
  await page.getByRole('button', { name: 'Analizar', exact: true }).click();
  const proposal = page.locator('.proposal');
  await expect(proposal).toBeVisible();
  const proposed = await proposal.locator('p').innerText();
  expect(proposed).not.toBe(original);
  await expect(page.locator('.material')).toHaveCount(count - 1);
  await page.getByRole('button', { name: 'Aceptar propuesta', exact: true }).click();
  await expect(note.locator('p')).toHaveText(original);
  await expect(page.locator('.material')).toHaveCount(count + 1);
  await expect(
    page.locator('.material.note').filter({ has: page.locator('p').filter({ hasText: proposed }) }),
  ).toHaveCount(1);
  await expect(proposal).toHaveCount(0);
});

test('UI-ZONE-03: cruza 0, 1, 6, 7, 15 y 16 materiales y vuelve sin perder identidades', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const zone = page.locator('.agent-zone');
  const layout = zone.locator('[data-density]');
  await expect(zone.getByText('Arrastrá un material acá', { exact: true })).toBeVisible();
  const created: string[] = [];
  for (let count = 1; count <= 16; count++) {
    await page.getByRole('button', { name: 'Crear nota · N', exact: true }).click();
    await page.mouse.click(720, 180);
    const note = page.locator('.material.selected');
    created.push((await note.getAttribute('data-node'))!);
    await page.getByRole('button', { name: 'Entrar al material', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Título de la nota', exact: true })
      .fill(`Material ${count}`);
    await page
      .getByRole('textbox', { name: 'Contenido de la nota', exact: true })
      .fill(`Contenido ${count}`);
    await page.keyboard.press('Escape');
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
    await page.locator(`.material[data-node="${created.at(-1)}"]`).click();
    await page.getByRole('button', { name: 'Acciones del agente', exact: true }).click();
    await page.getByRole('button', { name: 'Resumir', exact: true }).click();
    await expect(layout).toHaveAttribute('data-material-count', String(count));
    await expect(page.locator('.proposal')).toHaveCount(count);
    if ([1, 6, 7, 15, 16].includes(count)) {
      await expect(layout).toHaveAttribute(
        'data-density',
        count <= 6 ? 'previews' : count <= 15 ? 'types' : 'summary',
      );
      await testInfo.attach(`densidad-${count}`, {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    }
  }
  await zone.locator('.assigned-summary > summary').click();
  await zone.locator('.assigned-type > summary').click();
  await expect(zone.locator('.assigned-type > div > span')).toHaveText(
    Array.from({ length: 16 }, (_, i) => `Material ${i + 1}`),
  );
  for (let remaining = 15; remaining >= 0; remaining--) {
    await page
      .locator('.proposal')
      .last()
      .getByRole('button', { name: 'Rechazar propuesta', exact: true })
      .click();
    if (remaining) {
      await expect(layout).toHaveAttribute('data-material-count', String(remaining));
      await expect(layout).toHaveAttribute(
        'data-density',
        remaining <= 6 ? 'previews' : remaining <= 15 ? 'types' : 'summary',
      );
    } else await expect(zone.getByText('Arrastrá un material acá', { exact: true })).toBeVisible();
  }
  for (const [index, id] of created.entries()) {
    const note = page.locator(`.material[data-node="${id}"]`);
    await expect(note.getByRole('heading')).toHaveText(`Material ${index + 1}`);
    await expect(note.locator('p')).toHaveText(`Contenido ${index + 1}`);
  }
});
