import { test, expect } from './fixtures';
import { start, world, snapshot, capture, moveMaterial } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { googleFontFiles } from './google-font-files';
import { newCanvasText } from '../../src/domain/canvas-text';

test('C08-B201: editar contenido y tipografía después de guardar, sin confundir nombre ni crear otra pieza', async ({
  page,
}, info) => {
  await start(page);
  await page.setViewportSize({ width: 390, height: 720 });
  await page.keyboard.press('t');
  await page.mouse.click(220, 345);
  const editor = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await editor.fill('Idea');
  await editor.press('Escape');
  const id = (await world(page)).nodes[0]!.id,
    node = page.locator(`[data-node="${id}"]`),
    ink = node.locator('.canvas-text-run');
  await page.reload();
  await ink.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Editar texto', exact: true }).click();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue('Idea');
  await editor.fill('Un mapa de ideas');
  const picker = page.getByRole('combobox', { name: 'Tipografía', exact: true });
  await picker.fill('Monoespaciada');
  await page.locator('[data-action=font-select][data-font=mono]').click();
  await page.getByLabel('Peso', { exact: true }).selectOption('700');
  await editor.press('Escape');
  await page.reload();
  await ink.click({ button: 'right' });
  await page.getByRole('menuitem', { name: /^Renombrar/ }).click();
  const name = page.getByRole('textbox', { name: 'Nombre del material' });
  await name.fill('Sur');
  const small = (await name.boundingBox())!;
  await expect(node.locator('.material-identification button')).toBeHidden();
  expect(small.width).toBeLessThan(170);
  await name.fill(
    'Un nombre largo que se puede seguir editando completo cerca del borde de la ventana',
  );
  const large = (await name.boundingBox())!;
  expect(large.x + large.width).toBeLessThanOrEqual(390);
  expect(large.width).toBeLessThan(225);
  await name.fill('Sur');
  await capture(page, info, 'renombrar-texto');
  await name.press('Enter');
  await page.keyboard.press('t');
  await ink.click();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue('Un mapa de ideas');
  await expect(page.getByLabel('Peso', { exact: true })).toHaveValue('700');
  await editor.fill('El mapa final');
  await editor.press('Escape');
  await page.reload();
  const nodes = (await world(page)).nodes;
  expect(nodes).toHaveLength(1);
  expect(nodes[0]).toMatchObject({
    id,
    data: { title: 'Sur', text: 'El mapa final', font: 'mono', weight: 700 },
  });
});

test('C08-B199: esperar otra pestaña y recuperar el mismo texto sin recargar ni borrar el mundo', async ({
  page,
}) => {
  await start(page);
  await page.keyboard.press('t');
  await page.mouse.click(360, 310);
  const editor = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await editor.fill('El trabajo sigue acá');
  await editor.press('Escape');
  const original = (await world(page)).nodes[0]!;
  const holder = await page.context().newPage();
  try {
    // Página inerte del mismo origen: solo retiene la transacción, nunca guarda
    // una segunda sesión de Everett sobre el mundo que queremos restaurar.
    await holder.route('**/retener-guardado', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }),
    );
    await holder.goto(new URL('/retener-guardado', page.url()).href);
    await holder.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((ok, fail) => {
        const req = indexedDB.open('everett-canvas', 1);
        req.onsuccess = () => ok(req.result);
        req.onerror = () => fail(req.error);
      });
      await new Promise<void>((ready, fail) => {
        const tx = db.transaction('worlds', 'readwrite'),
          store = tx.objectStore('worlds');
        tx.onabort = () => fail(tx.error);
        const hold = () => {
          const read = store.getKey('shared');
          read.onsuccess = () => {
            ready();
            hold();
          };
        };
        hold();
      });
    });
    await page.reload();
    await expect(page.locator('#app')).toContainText('Esperando el guardado local', {
      timeout: 12000,
    });
    await holder.close();
    const saved = page.locator('.material.text .canvas-text-run');
    await expect(saved).toHaveText('El trabajo sigue acá');
    expect((await world(page)).nodes[0]).toEqual(original);
    await saved.dblclick();
    await expect(editor).toHaveValue('El trabajo sigue acá');
  } finally {
    if (!holder.isClosed()) await holder.close();
  }
});

test('C08-B198: restaurar párrafos de ancho fraccionario o menor que una letra no bloquea el dock', async ({
  page,
}) => {
  await start(page);
  await googleFontFiles(page);
  const saved = await snapshot(page);
  const w = saved.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [173.4375, 4].map((width, i) => ({
    id: 'restored-' + i,
    x: i * 180 - 250,
    y: -160,
    width,
    height: 32,
    owner: null,
    data: {
      ...newCanvasText('wrap'),
      font: 'google:Lora',
      size: 36,
      text: i ? 'W' : 'Explicar con imágenes',
    },
  }));
  await storedFixture(page, saved.state, saved.ui);
  // Fusible de prueba: ante un ciclo de microtareas el navegador no podría ni
  // exportar el diagnóstico. Solo se interviene si ya se repintó 24 veces sin un gesto.
  await page.addInitScript(() => {
    let renders = 0,
      previous: Element | null = null;
    new MutationObserver(() => {
      const paper = document.querySelector('[data-node="restored-0"]');
      if (!paper || paper === previous) return;
      previous = paper;
      if (++renders > 24) {
        document.documentElement.dataset.renderLoop = 'true';
        document.querySelectorAll('.material.text').forEach((n) => n.remove());
      }
    }).observe(document, { subtree: true, childList: true });
  });
  for (let visit = 0; visit < 2; visit++) {
    await page.reload();
    await expect(
      page.locator('[data-node="restored-1"][data-font-state="ready"], html[data-render-loop]'),
    ).toHaveCount(1);
    await expect(page.locator('html')).not.toHaveAttribute('data-render-loop', 'true', {
      timeout: 300,
    });
    const nodes = (await world(page)).nodes;
    expect(nodes[0]!.width).toBe(173.4375);
    expect(nodes[1]!.width).toBeGreaterThan(20);
    await page.getByRole('button', { name: 'Texto · T', exact: true }).click();
    await page.mouse.click(420, 420 + visit * 90);
    const editor = page.getByRole('textbox', { name: 'Texto en Canvas' });
    await editor.fill('Una comparación visual');
    await editor.press('Escape');
    await expect(
      page.locator('.material.text .canvas-text-run').filter({ hasText: 'Una comparación visual' }),
    ).toHaveCount(visit + 1);
    expect(
      (await world(page)).nodes.filter(
        (n) => n.data.kind === 'text' && n.data.text === 'Una comparación visual',
      ),
    ).toHaveLength(visit + 1);
  }
});

test('C08-B192: T escribe sobre la escena, conserva saltos, edición y copias independientes', async ({
  page,
}, info) => {
  await start(page);
  await page.keyboard.press('t');
  await page.keyboard.press('Escape');
  await expect(page.locator('.canvas-tools [data-tool=select]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('t');
  await page.mouse.click(420, 285);
  const field = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await expect(field).toBeFocused();
  await field.pressSequentially('Dia 3');
  await field.press('Enter');
  await field.pressSequentially('Salida del camion');
  await field.press('Escape');
  const material = page.locator('.material.text');
  await expect(material).toHaveCount(1);
  await expect(material.locator('.canvas-text-run')).toHaveText('Dia 3\nSalida del camion');
  await expect(material).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const original = (await world(page)).nodes[0]!;
  await expect(material).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('Dia 3\nSalida del camion');
  await field.fill('Día 4 · Tránsito');
  await field.press('Escape');
  await page.keyboard.press('Control+z');
  await expect(material.locator('.canvas-text-run')).toHaveText('Dia 3\nSalida del camion');
  await page.keyboard.press('Control+Shift+z');
  await expect(material.locator('.canvas-text-run')).toHaveText('Día 4 · Tránsito');
  await moveMaterial(page, original.id, 700, 430);
  expect((await world(page)).nodes[0]!.x).not.toBe(original.x);
  await page.keyboard.press('Control+d');
  await expect(material).toHaveCount(2);
  await material.last().dblclick();
  await field.fill('Terminal de llegada');
  await field.press('Escape');
  await page.reload();
  await expect(material.first().locator('.canvas-text-run')).toHaveText('Día 4 · Tránsito');
  await expect(material.last().locator('.canvas-text-run')).toHaveText('Terminal de llegada');
  await capture(page, info, 'texto-en-canvas');
});

test('C08-B193: el arrastre define ancho; el formato, el ancho y las líneas viajan con el texto', async ({
  page,
}, info) => {
  await start(page);
  await page.getByRole('button', { name: /^Texto · T$/ }).click();
  await page.mouse.click(400, 240);
  const field = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await field.press('Escape');
  expect((await world(page)).nodes).toHaveLength(0);
  await page.keyboard.press('t');
  await page.mouse.move(580, 300);
  await page.mouse.down();
  await page.mouse.move(400, 314, { steps: 6 });
  await page.mouse.up();
  await expect(field).toBeFocused();
  await field.fill('Del depósito al punto de entrega. Revisar la carga antes de salir.');
  const size = page.getByRole('spinbutton', { name: 'Tamaño del texto en píxeles' });
  await size.fill('30');
  await page.getByRole('button', { name: 'Centrar texto' }).click();
  await page.getByLabel('Peso', { exact: true }).selectOption('700');
  await expect(field).toHaveCSS('font-size', '30px');
  await capture(page, info, 'texto-ajustado-edicion');
  await field.press('Escape');
  const n = (await world(page)).nodes[0]!;
  expect(n.width).toBeCloseTo(180, 0);
  expect(n.height).toBeGreaterThan(75);
  expect(n.data).toMatchObject({
    kind: 'text',
    sizing: 'wrap',
    size: 30,
    weight: 700,
    align: 'center',
  });
  const run = page.locator('.material.text .canvas-text-run');
  await expect(run).toHaveCSS('font-weight', '700');
  await expect(run).toHaveCSS('text-align', 'center');
  const handle = page.locator('.material.text .resize-handle.e');
  await handle.focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press('Shift+ArrowRight');
  expect((await world(page)).nodes[0]!.height).toBeLessThan(n.height);
  await page.keyboard.press('t');
  await page.mouse.click(250, 430);
  await field.fill('Guardar al salir');
  await page.reload();
  await expect(page.locator('.material.text')).toHaveCount(2);
  await expect(page.locator('.material.text').last().locator('.canvas-text-run')).toHaveText(
    'Guardar al salir',
  );
});

test('C08-B194: texto sobre una forma clara y atajos existentes en un mundo previo', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes.push({
    id: 'paper',
    x: -290,
    y: -210,
    width: 500,
    height: 230,
    owner: null,
    data: { kind: 'shape', shape: 'rectangle', title: 'Ruta', color: '#fff', fill: true },
  });
  delete input.ui.shortcuts.text;
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await snapshot(page);
  await page.keyboard.press('t');
  await page.locator('[data-node=paper]').click({ position: { x: 25, y: 35 } });
  const field = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await field.fill('Día 7 · Llegada');
  await page.mouse.click(180, 600);
  const run = page.locator('.material.text .canvas-text-run');
  await expect(run).toHaveText('Día 7 · Llegada');
  await expect(run).toHaveCSS('color', 'rgb(38, 50, 60)');
  await capture(page, info, 'rotulo-sobre-forma');
});

test('C08-B195: formato a 320 px; una fuente que llega tras cerrar ajusta el rótulo sin otro paso de Deshacer', async ({
  page,
}, info) => {
  await start(page);
  await page.setViewportSize({ width: 320, height: 640 });
  let release!: () => void;
  await googleFontFiles(
    page,
    new Promise<void>((r) => {
      release = r;
    }),
  );
  await page.route('**/api/google-fonts', (route) =>
    route.fulfill({
      json: {
        families: [{ family: 'Lora', category: 'serif', weights: [400, 700], italic: false }],
      },
    }),
  );
  await page.keyboard.press('t');
  await page.mouse.click(60, 280);
  const field = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await field.fill('Salida del camión');
  await page.getByRole('combobox', { name: 'Tipografía', exact: true }).fill('Lora');
  await page.locator('[data-action=font-select][data-font="google:Lora"]').click();
  const toolbar = page.getByRole('group', { name: 'Formato del texto' });
  const box = (await toolbar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  for (const control of await toolbar.locator('input,select').all())
    await expect(control).toBeInViewport();
  await capture(page, info, 'formato-texto-320');
  await field.press('Escape');
  release();
  const material = page.locator('.material.text');
  await expect(material).toHaveAttribute('data-font-state', 'ready');
  const metrics = await material.evaluate((el) => {
    const run = el.querySelector('.canvas-text-run')!,
      range = document.createRange();
    range.selectNodeContents(run);
    return { body: el.getBoundingClientRect().width, ink: range.getBoundingClientRect().width };
  });
  expect(metrics.body - metrics.ink).toBeGreaterThanOrEqual(0);
  expect(metrics.body - metrics.ink).toBeLessThanOrEqual(2);
  await page.keyboard.press('Control+z');
  await expect(material).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(material).toHaveCount(1);
  await expect(material).toHaveAttribute('data-font-state', 'ready');
});
