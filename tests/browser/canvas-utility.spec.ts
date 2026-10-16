import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';
import { storedFixture } from './canvas-fixtures';

const snapshot = (page: Page) => page.evaluate(() => window.EverettDebug!.snapshot());
const world = async (page: Page) =>
  (await snapshot(page)).state.worlds.find((item) => item.id === 'scout')!;

async function start(page: Page): Promise<void> {
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

async function capture(page: Page, info: TestInfo, name: string): Promise<void> {
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

async function moveMaterial(page: Page, id: string, x: number, y: number): Promise<void> {
  const box = (await page.locator(`[data-node="${id}"]`).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
}

async function reference(
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

async function connect(page: Page, from: string, to: string, label: string): Promise<void> {
  await page.getByRole('button', { name: 'Conectar · L', exact: true }).click();
  await page.locator(`[data-anchor-node="${from}"][data-anchor=east]`).click();
  await page.locator(`[data-anchor-node="${to}"][data-anchor=west]`).click();
  await page.getByRole('button', { name: 'Conectar · L', exact: true }).click();
  const link = (await world(page)).links.at(-1)!;
  const path = page.locator(`[data-link="${link.id}"] .link-hit`);
  await path.focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Etiqueta de conexión', { exact: true }).fill(label);
  await page
    .locator(`[data-label="${link.id}"]`)
    .getByRole('button', { name: 'Guardar', exact: true })
    .click();
  await expect(page.locator(`[data-link="${link.id}"] text`)).toHaveText(label);
}

test('C08-B47: el estilo acompaña el dock durante el arrastre y conserva dimensiones al cambiar de posición', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await start(page);
  const samples: unknown[] = [];
  for (const mode of ['drawing', 'shape'] as const) {
    await page.getByRole('button', { name: 'Seleccionar · V', exact: true }).click();
    if (mode === 'drawing')
      await page.getByRole('button', { name: 'Dibujar', exact: true }).click();
    else {
      await page.getByRole('button', { name: 'Formas', exact: true }).click();
      await page.getByRole('button', { name: 'Rectángulo', exact: true }).click();
    }
    const initial = (await page.locator('.canvas-style').boundingBox())!;
    for (const [index, destination] of [
      { x: 350, y: 260 },
      { x: 1120, y: 700 },
    ].entries()) {
      const grip = (await page.locator('.dock-grip').boundingBox())!;
      await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
      await page.mouse.down();
      await page.mouse.move(destination.x, destination.y, { steps: 10 });
      const trigger = (await page
        .getByRole('button', { name: mode === 'drawing' ? 'Dibujar' : 'Formas', exact: true })
        .boundingBox())!;
      const panel = (await page.locator('.canvas-style').boundingBox())!;
      const gapX = Math.max(
        trigger.x - panel.x - panel.width,
        panel.x - trigger.x - trigger.width,
        0,
      );
      const gapY = Math.max(
        trigger.y - panel.y - panel.height,
        panel.y - trigger.y - trigger.height,
        0,
      );
      samples.push({ mode, index, phase: 'drag', trigger, panel, gap: Math.hypot(gapX, gapY) });
      await capture(page, info, `estilo-${mode}-${index}-durante-arrastre`);
      expect
        .soft(
          Math.hypot(gapX, gapY),
          'El panel debe acompañar al disparador durante todo el arrastre',
        )
        .toBeLessThanOrEqual(20);
      await page.mouse.up();
      const settled = (await page.locator('.canvas-style').boundingBox())!;
      const settledTrigger = (await page
        .getByRole('button', { name: mode === 'drawing' ? 'Dibujar' : 'Formas', exact: true })
        .boundingBox())!;
      const releasedGap = Math.hypot(
        Math.max(
          settledTrigger.x - settled.x - settled.width,
          settled.x - settledTrigger.x - settledTrigger.width,
          0,
        ),
        Math.max(
          settledTrigger.y - settled.y - settled.height,
          settled.y - settledTrigger.y - settledTrigger.height,
          0,
        ),
      );
      samples.push({ mode, index, phase: 'released', panel: settled, gap: releasedGap });
      expect
        .soft(releasedGap, 'El estilo también debe quedar junto al disparador al soltar')
        .toBeLessThanOrEqual(20);
      expect
        .soft(settled.width, 'Mover el dock no debe cambiar el ancho del mismo panel')
        .toBeCloseTo(initial.width, 1);
      expect
        .soft(settled.height, 'Mover el dock no debe cambiar la altura del mismo panel')
        .toBeCloseTo(initial.height, 1);
    }
  }
  await page.setViewportSize({ width: 704, height: 668 });
  const sizes: { width: number; height: number }[] = [];
  for (const [index, destination] of [
    { x: 20, y: 540 },
    { x: 680, y: 300 },
  ].entries()) {
    await page.getByRole('button', { name: 'Seleccionar · V', exact: true }).click();
    const grip = (await page.locator('.dock-grip').boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(destination.x, destination.y, { steps: 10 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Formas', exact: true }).click();
    await page.getByRole('button', { name: 'Rectángulo', exact: true }).click();
    const panel = (await page.locator('.canvas-style').boundingBox())!;
    const origin = (await page.getByRole('button', { name: 'Formas', exact: true }).boundingBox())!;
    const gap = Math.hypot(
      Math.max(origin.x - panel.x - panel.width, panel.x - origin.x - origin.width, 0),
      Math.max(origin.y - panel.y - panel.height, panel.y - origin.y - origin.height, 0),
    );
    expect
      .soft(gap, 'El estilo debe quedar unido al botón al abrirse cerca de un borde')
      .toBeLessThanOrEqual(20);
    sizes.push({ width: panel.width, height: panel.height });
    const centers = await page.locator('.canvas-style > label').evaluateAll((labels) =>
      labels.map((label) => {
        const box = label.getBoundingClientRect();
        return box.y + box.height / 2;
      }),
    );
    samples.push({ viewport: 704, index, panel, gap, labelCenters: centers });
    await capture(page, info, `estilo-formas-704-posicion-${index}`);
    expect
      .soft(
        Math.max(...centers) - Math.min(...centers),
        'A 704 px hay espacio para conservar los controles de estilo en la misma fila',
      )
      .toBeLessThanOrEqual(2);
  }
  expect
    .soft(sizes[1]!.width, 'Cambiar de borde a igual ventana debe conservar el ancho')
    .toBeCloseTo(sizes[0]!.width, 1);
  expect
    .soft(sizes[1]!.height, 'Cambiar de borde a igual ventana debe conservar la altura')
    .toBeCloseTo(sizes[0]!.height, 1);
  await info.attach('geometria-de-estilo', {
    body: JSON.stringify(samples, null, 2),
    contentType: 'application/json',
  });
});

test('C08-B48: recorrido manual de documentos, código, tarea, decisión, relaciones, movimiento y regreso con persistencia', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await start(page);
  const initial = await world(page);
  const document = initial.docs[0]!;
  const file = initial.files[0]!;
  const task = initial.tasks[0]!;
  const docNode = await reference(page, 'document', document.id, 350, 240);
  const codeNode = await reference(page, 'file', file.id, 900, 240);
  const taskNode = await reference(page, 'task', task.id, 900, 550);
  await page.getByRole('button', { name: 'Crear nota · N', exact: true }).click();
  await page.mouse.click(220, 470);
  const note = (await world(page)).nodes.at(-1)!;
  await page.locator(`[data-node="${note.id}"]`).dblclick();
  await page.getByLabel('Título de la nota', { exact: true }).fill('Decisión: guardado local');
  await page
    .getByLabel('Contenido de la nota', { exact: true })
    .fill(
      'Conservar materiales e identidad al volver al proyecto.\nRelacionar esta decisión con su implementación y prueba.',
    );
  await page.getByRole('button', { name: 'Volver al Canvas', exact: true }).click();
  await capture(page, info, '01-reunir-documento-codigo-tarea-decision');
  await connect(page, docNode, codeNode, 'Se implementa en');
  await connect(page, note.id, taskNode, 'Se verifica con');
  await connect(page, codeNode, taskNode, 'Se comprueba mediante');
  await capture(page, info, '02-relaciones-con-significado');

  const beforeMove = await world(page);
  await page.locator(`[data-node="${docNode}"]`).click();
  await page.locator(`[data-node="${codeNode}"]`).click({ modifiers: ['Shift'] });
  const box = (await page.locator(`[data-node="${docNode}"]`).boundingBox())!;
  await moveMaterial(page, docNode, box.x + box.width / 2 + 60, box.y + box.height / 2 + 35);
  const afterMove = await world(page);
  for (const id of [docNode, codeNode]) {
    const before = beforeMove.nodes.find((node) => node.id === id)!;
    const after = afterMove.nodes.find((node) => node.id === id)!;
    expect(after.x - before.x).toBeCloseTo(60, 1);
    expect(after.y - before.y).toBeCloseTo(35, 1);
  }
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect((await world(page)).nodes).toEqual(beforeMove.nodes);
  await page.getByRole('button', { name: 'Rehacer · Ctrl+Shift+Z', exact: true }).click();
  expect((await world(page)).nodes).toEqual(afterMove.nodes);
  expect((await world(page)).links).toEqual(beforeMove.links);
  await capture(page, info, '03-reorganizar-sin-perder-vinculos');

  const camera = (await snapshot(page)).camera;
  const editedBody = document.body + '\n\nDecisión vinculada desde el mapa de trabajo.';
  await page.locator(`[data-node="${docNode}"]`).dblclick();
  await expect(page.getByLabel('Contenido del documento', { exact: true })).toHaveValue(
    document.body,
  );
  await page.getByLabel('Contenido del documento', { exact: true }).fill(editedBody);
  await capture(page, info, '04-editar-el-documento-original');
  await page.keyboard.press('Escape');
  await expect(page.locator(`[data-node="${docNode}"]`)).toContainText(
    'Decisión vinculada desde el mapa',
  );
  expect((await snapshot(page)).camera).toEqual(camera);

  await page.locator(`[data-node="${codeNode}"]`).dblclick();
  const editor = page.getByRole('textbox', { name: `Editar ${file.name}`, exact: true });
  await expect(editor).toHaveValue(file.text);
  const editedCode = file.text + '\n// Vinculado a la decisión de guardado local.\n';
  await editor.fill(editedCode);
  await editor.press('Control+s');
  await capture(page, info, '05-editar-el-archivo-original');
  await page.keyboard.press('Escape');
  await expect(page.locator(`[data-node="${codeNode}"]`)).toContainText('Vinculado a la decisión');
  expect((await snapshot(page)).camera).toEqual(camera);

  await page.locator(`[data-node="${taskNode}"]`).dblclick();
  const description = page.getByLabel(`Descripción de ${task.title}`, { exact: true });
  await expect(description).toHaveValue(task.description);
  await description.fill('Verificar el guardado y el regreso al mismo mapa de trabajo.');
  await description.press('Tab');
  await capture(page, info, '06-editar-la-tarea-original');
  await page.keyboard.press('Escape');
  await expect(page.locator(`[data-node="${taskNode}"]`)).toContainText('Verificar el guardado');
  expect((await snapshot(page)).camera).toEqual(camera);
  const durable = await world(page);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  const recovered = await world(page);
  expect(recovered.nodes).toEqual(durable.nodes);
  expect(recovered.links).toEqual(durable.links);
  expect(recovered.docs.find((item) => item.id === document.id)!.body).toBe(editedBody);
  expect(recovered.files.find((item) => item.id === file.id)!.saved).toBe(editedCode);
  expect(recovered.assignments).toHaveLength(0);
  await capture(page, info, '07-retomar-el-mapa-despues-de-recargar');

  // La búsqueda se observa sin convertir una capacidad aún por definir en un falso contrato aprobado.
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Buscar en Everett', exact: true })
    .fill('Decisión: guardado local');
  const results = await page.locator('#global-results button').allTextContents();
  await capture(page, info, '08-buscar-una-decision-que-existe-en-canvas');
  await info.attach('resultado-de-busqueda', {
    body: JSON.stringify(
      {
        query: 'Decisión: guardado local',
        results,
        noteId: note.id,
        noteExists: recovered.nodes.some((item) => item.id === note.id),
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await info.attach('mapa-recuperado', {
    body: JSON.stringify(await snapshot(page), null, 2),
    contentType: 'application/json',
  });
});

test('C08-B49: panorama de veinte materiales, selección conjunta y organización manual sin agentes', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await start(page);
  const input = await snapshot(page);
  const project = input.state.worlds.find((item) => item.id === 'scout')!;
  const prototypeDoc = project.docs[0]!;
  const prototypeFile = project.files[0]!;
  const prototypeTask = project.tasks[0]!;
  for (let row = 0; row < 4; row++) {
    const doc = {
      ...prototypeDoc,
      id: `utility-doc-${row}`,
      title: ['Arquitectura', 'Diseño', 'Persistencia', 'Validación'][row]!,
      body: `Criterios y decisiones del área ${row + 1}.\nEste documento conserva su identidad al abrirlo desde Canvas.`,
    };
    const file = {
      ...prototypeFile,
      id: `utility-file-${row}`,
      name: `src/area-${row + 1}.ts`,
      text: `export const area = ${row + 1};`,
      saved: `export const area = ${row + 1};`,
    };
    const task = {
      ...prototypeTask,
      id: `utility-task-${row}`,
      title: `Comprobar el área ${row + 1}`,
      description: 'Verificar la implementación contra los criterios y decisiones.',
    };
    project.docs.push(doc);
    project.files.push(file);
    project.tasks.push(task);
    const values = [
      { kind: 'reference' as const, ref: { kind: 'document' as const, id: doc.id } },
      { kind: 'reference' as const, ref: { kind: 'file' as const, id: file.id } },
      { kind: 'reference' as const, ref: { kind: 'task' as const, id: task.id } },
      {
        kind: 'note' as const,
        title: `Decisión del área ${row + 1}`,
        text: 'Conservar el vínculo entre intención, implementación y comprobación.',
        color: '#e4efdf',
      },
      {
        kind: 'shape' as const,
        shape: 'rectangle' as const,
        title: `Componente ${row + 1}`,
        color: '#d8c7f1',
        fill: false,
        stroke: '#d8c7f1',
        thickness: 2,
      },
    ];
    for (const [col, data] of values.entries()) {
      const id = `utility-node-${row}-${col}`;
      project.nodes.push({
        id,
        x: -650 + col * 280,
        y: -300 + row * 190,
        width: 220,
        height: 140,
        owner: null,
        data,
      });
      if (col)
        project.links.push({
          id: `utility-link-${row}-${col}`,
          from: `utility-node-${row}-${col - 1}`,
          to: id,
          fromAnchor: 'east',
          toAnchor: 'west',
          label: ['Documenta', 'Se comprueba con', 'Justifica', 'Describe'][col - 1]!,
        });
    }
  }
  input.state.camera = { x: 0, y: -60, z: 0.8 };
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await expect(page.locator('.material[data-node]')).toHaveCount(20);
  await capture(page, info, '09-panorama-de-veinte-materiales');
  const reading = await page.locator('[data-link]').evaluateAll((links) =>
    links.map((link) => {
      const text = link.querySelector('text');
      const line = link.querySelector<SVGPathElement>('.link-line');
      const title = text?.textContent ?? '';
      const bounds = text?.getBoundingClientRect();
      const materialBounds = [...document.querySelectorAll('[data-node]')].map((material) => ({
        id: (material as HTMLElement).dataset.node,
        bounds: material.getBoundingClientRect(),
      }));
      const intersections = bounds
        ? materialBounds
            .filter(
              (material) =>
                Math.min(bounds.right, material.bounds.right) >
                  Math.max(bounds.left, material.bounds.left) &&
                Math.min(bounds.bottom, material.bounds.bottom) >
                  Math.max(bounds.top, material.bounds.top),
            )
            .map((material) => material.id)
        : [];
      return {
        id: (link as SVGElement).dataset.link,
        title,
        text: bounds?.toJSON(),
        pathLength: line?.getTotalLength(),
        intersectedMaterials: intersections,
      };
    }),
  );
  await info.attach('lectura-de-relaciones', {
    body: JSON.stringify(reading, null, 2),
    contentType: 'application/json',
  });
  const ids = Array.from({ length: 5 }, (_, col) => `utility-node-0-${col}`);
  const boxes = await Promise.all(
    ids.map((id) => page.locator(`[data-node="${id}"]`).boundingBox()),
  );
  await page.mouse.move(
    Math.min(...boxes.map((box) => box!.x)) - 12,
    Math.min(...boxes.map((box) => box!.y)) - 18,
  );
  await page.mouse.down();
  await page.mouse.move(
    Math.max(...boxes.map((box) => box!.x + box!.width)) + 12,
    Math.max(...boxes.map((box) => box!.y + box!.height)) + 18,
    { steps: 10 },
  );
  await page.mouse.up();
  expect((await snapshot(page)).ui.canvas.selections.sort()).toEqual([...ids].sort());
  await capture(page, info, '10-seleccion-conjunta-de-un-area');
  await page.mouse.click(50, 400);
  await page.locator('[data-node=utility-node-0-0]').click();
  const afterSingleClick = (await snapshot(page)).ui.canvas.selections;
  expect(afterSingleClick).toEqual(['utility-node-0-0']);
  await page.getByRole('button', { name: 'Dibujar zona', exact: true }).click();
  await page.mouse.move(80, 100);
  await page.mouse.down();
  await page.mouse.move(370, 320, { steps: 10 });
  await page.mouse.up();
  await page.getByLabel('Nombre de la zona', { exact: true }).fill('Organización manual');
  await page.getByLabel('Nombre de la zona', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'Cerrar panel de zona', exact: true }).click();
  await moveMaterial(page, 'utility-node-0-0', 220, 220);
  const current = await world(page);
  expect(current.assignments).toHaveLength(0);
  expect(current.nodes.every((node) => !node.owner)).toBe(true);
  await capture(page, info, '11-zona-sin-agente-y-material-superpuesto');
  const zone = page.getByRole('group', { name: 'Zona Organización manual', exact: true });
  await info.attach('limites-de-organizacion-manual', {
    body: JSON.stringify(
      {
        materials: current.nodes.length,
        links: current.links.length,
        selectionAfterSingleClick: afterSingleClick,
        zone: current.zones.at(-1),
        zoneMaterialsSections: await zone.locator('.zone-materials').count(),
        assignments: current.assignments.length,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  await page.mouse.move(100, 400);
  await page.mouse.wheel(0, -Math.log(0.4 / (await snapshot(page)).camera.z) / 0.00165);
  await expect.poll(async () => (await snapshot(page)).camera.z).toBeCloseTo(0.4, 2);
  await capture(page, info, '12-panorama-general-a-zoom-alejado');
  const camera = (await snapshot(page)).camera;
  await page.locator('[data-node=utility-node-0-0]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Título del documento', { exact: true })).toHaveText('Arquitectura');
  await page.keyboard.press('Escape');
  expect((await snapshot(page)).camera).toEqual(camera);
  await expect(page.locator('.material[data-node]')).toHaveCount(20);
  await capture(page, info, '13-regreso-al-panorama-de-trabajo');
});
