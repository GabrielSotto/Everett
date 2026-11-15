import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { addLibrary } from './sketch-library-helpers';
import { storedFixture } from './canvas-fixtures';
import { newCanvasText } from '../../src/domain/canvas-text';

test('C08-B226: componer una pantalla, moverla desde el título y conservar una anotación independiente', async ({
  page,
}, info) => {
  await start(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('#canvas-file-import').setInputFiles('tests/fixtures/link-cover.png');
  await expect(page.locator('.material.image img')).toBeVisible();
  const [background] = await addLibrary(page, 'frame');
  const input = await snapshot(page);
  const project = input.state.worlds.find((w) => w.id === 'scout')!;
  const frame = project.canvasGroups!.find((g) => g.nodes.includes(background!.id))!;
  expect(frame.structure!.root.frame).toBe(true);
  const photo = project.nodes.find((n) => n.data.kind === 'image')!;
  Object.assign(photo, {
    x: background!.x + 16,
    y: background!.y + 16,
    height: (photo.height * 120) / photo.width,
    width: 120,
  });
  const position = { x: background!.x + 166, y: background!.y + 84, width: 169, height: 70 };
  project.nodes.push(
    {
      id: 'member',
      x: background!.x + 16,
      y: background!.y + 110,
      width: 148,
      height: 36,
      owner: null,
      data: {
        ...newCanvasText('wrap'),
        title: 'Prisma DJ Set',
        text: 'Prisma DJ Set',
        size: 20,
        color: '#24272a',
      },
    },
    {
      ...position,
      id: 'outside',
      owner: null,
      data: {
        kind: 'note',
        title: 'Anotación externa',
        text: 'Anotación externa',
        color: '#ffeecc',
      },
    },
  );
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  const header = page.locator(`.group-heading[data-group="${frame.id}"]`);
  await header.focus();
  await header.getByRole('button', { name: /Editar marco/ }).click();
  const panel = page.locator('.component-inspector');
  await panel.locator('summary').filter({ hasText: 'Incorporar o sustituir' }).click();
  await panel.locator('[data-adopt]').selectOption(photo.id);
  await panel.getByRole('button', { name: 'Incorporar al contenedor' }).click();
  await panel.locator('[data-adopt]').selectOption('member');
  await panel.getByRole('button', { name: 'Incorporar al contenedor' }).click();
  await expect(panel.locator('[data-part]').filter({ hasText: 'Prisma DJ Set' })).toBeVisible();
  await capture(page, info, 'marco-con-material-propio');
  await panel.getByRole('button', { name: 'Terminar edición' }).click();
  await header.focus();
  const title = header.getByRole('button', { name: /Mover marco/ });
  const box = (await title.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 112, y + 64, { steps: 9 });
  await page.mouse.up();
  const positions = async () => (await world(page)).nodes;
  const after = await positions();
  const back = after.find((n) => n.id === background!.id)!;
  expect(back.width).toBeCloseTo(background!.width);
  expect(back.height).toBeCloseTo(background!.height);
  const member = after.find((n) => n.id === 'member')!;
  expect(Math.hypot(back.x - background!.x, back.y - background!.y)).toBeGreaterThan(40);
  expect(member.x - back.x).toBeCloseTo(16);
  expect(member.y - back.y).toBeCloseTo(110);
  const movedPhoto = after.find((n) => n.id === photo.id)!;
  expect(movedPhoto.x - back.x).toBeCloseTo(16);
  expect(movedPhoto.y - back.y).toBeCloseTo(16);
  expect(movedPhoto.data).toEqual(photo.data);
  expect(after.find((n) => n.id === 'outside')).toMatchObject(position);
  await page.keyboard.press('Control+z');
  await expect
    .poll(async () => (await positions()).find((n) => n.id === 'member')!.x)
    .toBeCloseTo(background!.x + 16);
  await page.reload();
  expect((await world(page)).canvasGroups!.find((g) => g.id === frame.id)!.nodes).toEqual([
    background!.id,
    photo.id,
    'member',
  ]);
});

test('C08-B227: convertir una pantalla existente, incorporar por arrastre y mover solo el fondo', async ({
  page,
}) => {
  await start(page);
  const input = await snapshot(page);
  const project = input.state.worlds.find((w) => w.id === 'scout')!;
  project.nodes.push({
    id: 'floating',
    x: -370,
    y: 0,
    width: 120,
    height: 76,
    owner: null,
    data: { kind: 'note', title: 'Horario', text: 'Apertura', color: '#ffeecc' },
  });
  project.nodes.push({
    id: 'scene',
    x: -150,
    y: -110,
    width: 300,
    height: 220,
    owner: null,
    data: { kind: 'wireframe', title: 'Explorar', content: { type: 'screen', text: '' } },
  });
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  const screen = page.locator('[data-node="scene"]');
  await screen.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Usar como marco' }).click();
  const panel = page.locator('.component-inspector');
  await panel.getByRole('button', { name: 'Terminar edición' }).click();
  const freeBox = (await page.locator('[data-node="floating"]').boundingBox())!;
  const screenBox = (await screen.boundingBox())!;
  await page.mouse.move(freeBox.x + 50, freeBox.y + 35);
  await page.mouse.down();
  await page.mouse.move(screenBox.x + 70, screenBox.y + 72, { steps: 14 });
  await expect(page.locator('.group-drop-message')).toBeVisible();
  await page.mouse.up();
  const frame = (await world(page)).canvasGroups![0]!;
  expect(frame.nodes).toEqual(['scene', 'floating']);
  const child = (await world(page)).nodes.find((n) => n.id === 'floating')!;
  const front = await page.locator('[data-node="floating"]').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return document
      .elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      ?.closest('[data-node]')
      ?.getAttribute('data-node');
  });
  expect(front).toBe('floating');
  await page.locator(`.group-heading[data-group="${frame.id}"]`).focus();
  await page.getByRole('button', { name: 'Editar marco Explorar' }).click();
  await panel.locator('[data-part]').filter({ hasText: 'Fondo' }).click();
  await panel.getByLabel('Fondo del contenedor').uncheck();
  const px = screenBox.x + screenBox.width - 55,
    py = screenBox.y + screenBox.height - 55;
  await page.mouse.move(px, py);
  await page.mouse.down();
  await page.mouse.move(px + 45, py + 35, { steps: 8 });
  await page.mouse.up();
  const updated = await world(page);
  expect(updated.nodes.find((n) => n.id === 'scene')!.x).toBeGreaterThan(-130);
  expect(updated.nodes.find((n) => n.id === 'floating')).toMatchObject({ x: child.x, y: child.y });
  expect(updated.canvasGroups![0]!.structure!.origin).toEqual(frame.structure!.origin);
});
