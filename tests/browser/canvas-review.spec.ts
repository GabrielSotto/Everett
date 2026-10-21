import { dockChat } from './interaction-helpers';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  enterWorld,
  openSurface,
  assignMaterial,
  openPeople,
  undockChat,
} from './interaction-helpers';
import { storedFixture } from './canvas-fixtures';
import { proposalSize } from '../../src/domain/proposal-layout';

const png = createRequire(import.meta.url)(
  resolve('node_modules/playwright-core/lib/utilsBundle.js'),
).PNG as {
  sync: { read(buffer: Buffer): { width: number; height: number; data: Buffer } };
};
const snapshot = (page: Page) => page.evaluate(() => window.EverettDebug!.snapshot());
async function canvas(page: Page): Promise<void> {
  await enterWorld(page);
  await openSurface(page, 'Canvas');
}
async function ready(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
}

test('C08-B22: etiquetar conserva los píxeles del cable y un editor compacto sin caja de foco', async ({
  page,
}, testInfo) => {
  await canvas(page);
  const input = await snapshot(page),
    world = input.state.worlds.find((w) => w.id === 'scout')!;
  world.nodes = world.nodes.filter((node) => ['note-a', 'note-b'].includes(node.id));
  Object.assign(world.nodes[0]!, { x: -480, y: -200, width: 150, height: 110, owner: null });
  Object.assign(world.nodes[1]!, { x: 200, y: 120, width: 150, height: 110, owner: null });
  world.zones = [];
  world.assignments = [];
  world.links = [
    { id: 'review-link', from: 'note-a', to: 'note-b', fromAnchor: 'east', toAnchor: 'west' },
  ];
  input.ui.canvas.selection = null;
  input.ui.canvas.selections = [];
  input.ui.canvas.zoneSelection = null;
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await ready(page);
  const cable = page.locator('[data-link=review-link]');
  const midpoint = await cable.locator('.link-hit').evaluate((el) => {
    const path = el as SVGPathElement,
      point = path
        .getPointAtLength(path.getTotalLength() / 2)
        .matrixTransform(path.getScreenCTM()!);
    return { x: point.x, y: point.y };
  });
  await page.mouse.dblclick(midpoint.x, midpoint.y);
  const editor = page.locator('[data-label=review-link]');
  const bounds = (await editor.boundingBox())!;
  expect(bounds.width).toBeLessThanOrEqual(280);
  expect(bounds.height).toBeLessThanOrEqual(48);
  const actions = await editor
    .locator('button')
    .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().toJSON()));
  expect(actions).toHaveLength(0);
  await expect(page.locator('.link-actions')).toHaveCount(0);
  await page.getByLabel('Etiqueta de conexión', { exact: true }).fill('Juan');
  await editor.getByRole('textbox', { name: 'Etiqueta de conexión', exact: true }).press('Enter');
  await expect(cable.locator('text')).toHaveText('Juan');
  expect(await cable.locator('.link-hit').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    'none',
  );
  expect(await cable.locator('text').getAttribute('transform')).toBeNull();
  const samples = async () =>
    cable.locator('.link-line').evaluate((element) => {
      const path = element as SVGPathElement,
        matrix = path.getScreenCTM()!;
      return {
        color: getComputedStyle(path).stroke.match(/\d+/g)!.map(Number),
        points: [0.2, 0.8].map((fraction) => {
          const point = path.getPointAtLength(path.getTotalLength() * fraction);
          const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
          return { x: screen.x, y: screen.y };
        }),
      };
    });
  const visible = async () => {
    const measurement = await samples(),
      bitmap = png.sync.read(await page.screenshot());
    const scale = bitmap.width / page.viewportSize()!.width;
    return measurement.points.map((point) => {
      for (let dx = -3; dx <= 3; dx++)
        for (let dy = -3; dy <= 3; dy++) {
          const x = Math.round(point.x * scale) + dx,
            y = Math.round(point.y * scale) + dy;
          if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) continue;
          const offset = (y * bitmap.width + x) * 4;
          if (
            measurement.color.reduce(
              (sum, color, index) => sum + Math.abs(color - bitmap.data[offset + index]!),
              0,
            ) < 90
          )
            return true;
        }
      return false;
    });
  };
  expect(await visible()).toEqual([true, true]);
  await testInfo.attach('cable-etiquetado-visible', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  // Contraejemplo del fallo observado: la región SVG vuelve a los valores predeterminados.
  const region = await cable
    .locator('mask')
    .evaluate((el) => ['x', 'y', 'width', 'height'].map((name) => [name, el.getAttribute(name)]));
  await cable
    .locator('mask')
    .evaluate((el) => ['x', 'y', 'width', 'height'].forEach((name) => el.removeAttribute(name)));
  try {
    expect(await visible()).toEqual([false, false]);
  } finally {
    await cable
      .locator('mask')
      .evaluate(
        (el, values) => values.forEach(([name, value]) => el.setAttribute(name!, value!)),
        region,
      );
  }
  const middle = await cable.locator('.link-line').evaluate((el) => {
    const path = el as SVGPathElement;
    const p = path.getPointAtLength(path.getTotalLength() / 2);
    const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!);
    return { x: screen.x, y: screen.y - 30 };
  });
  await page.mouse.move(middle.x, middle.y);
  await page.mouse.wheel(0, -220);
  await expect.poll(() => snapshot(page).then((state) => state.camera.z)).toBeGreaterThan(1);
  expect(await visible()).toEqual([true, true]);
  await page.keyboard.press('Control+z');
  await expect(cable.locator('text')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(cable.locator('text')).toHaveText('Juan');
});

test('C08-B23: propuestas separadas de resultados, contraste de controles y expansión reversible', async ({
  page,
}, testInfo) => {
  await canvas(page);
  await assignMaterial(page, 'note-b', 'Analizar');
  await expect(page.locator('.proposal')).toBeVisible();
  const first = (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.assignments[0]!;
  await page.getByRole('button', { name: 'Aceptar propuesta', exact: true }).click();
  await assignMaterial(page, 'note-b', 'Analizar');
  await expect(page.locator('.proposal')).toBeVisible();
  const state = await snapshot(page),
    w = state.state.worlds.find((w) => w.id === 'scout')!,
    job = w.assignments[0]!;
  const result = w.nodes.find(
    (node) =>
      node.data.kind === 'note' && node.x === first.position.x && node.y === first.position.y,
  )!;
  expect(
    job.position.x + proposalSize.width + 16 <= result.x ||
      job.position.x >= result.x + result.width + 16 ||
      job.position.y + proposalSize.height + 16 <= result.y ||
      job.position.y >= result.y + result.height + 16,
  ).toBe(true);
  await page.locator('[data-zone=zone-eve]').click();
  await page.getByRole('button', { name: 'Revisar propuesta', exact: true }).click();
  const proposal = page.locator('.proposal');
  const measureMotion = async (action: string, direction: 1 | -1, duration: number) => {
    const sampling = proposal.evaluate(async () => {
      const frames: {
        height: number;
        width: number;
        rows: number;
        count: number;
        durations: number[];
      }[] = [];
      for (let i = 0; i < 40; i++) {
        await new Promise(requestAnimationFrame);
        const el = document.querySelector<HTMLElement>('.proposal-decision')!;
        frames.push({
          height: el.getBoundingClientRect().height,
          width: el.getBoundingClientRect().width,
          rows: new Set(
            Array.from(el.querySelectorAll('.revision-suggestions button'), (button) =>
              Math.round(button.getBoundingClientRect().top),
            ),
          ).size,
          count: document.querySelectorAll('.proposal').length,
          durations: el
            .getAnimations()
            .map((animation) => Number(animation.effect!.getTiming().duration)),
        });
      }
      return frames;
    });
    await page.getByRole('button', { name: action, exact: true }).click();
    const frames = await sampling;
    expect(frames.every((frame) => frame.count === 1)).toBe(true);
    expect(frames.every((frame) => frame.rows <= 1)).toBe(true);
    expect(
      Math.max(...frames.map((frame) => frame.width)) -
        Math.min(...frames.map((frame) => frame.width)),
    ).toBeLessThan(1);
    expect(frames.some((frame) => frame.durations.includes(duration))).toBe(true);
    expect(new Set(frames.map((frame) => Math.round(frame.height))).size).toBeGreaterThan(3);
    for (let i = 1; i < frames.length; i++)
      expect((frames[i]!.height - frames[i - 1]!.height) * direction).toBeGreaterThanOrEqual(-1);
    await testInfo.attach(`propuesta-movimiento-${direction === 1 ? 'abrir' : 'cerrar'}`, {
      body: JSON.stringify(frames),
      contentType: 'application/json',
    });
  };
  await expect
    .poll(() =>
      proposal.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 59 && r.right <= innerWidth && r.bottom <= innerHeight - 70;
      }),
    )
    .toBe(true);
  await expect.poll(() => snapshot(page).then((state) => state.camera.z)).toBeCloseTo(1, 4);
  await measureMotion('Pedir cambios', 1, 250);
  const expanded = (await proposal.boundingBox())!;
  expect(expanded.height).toBeLessThanOrEqual(proposalSize.height);
  for (const material of await page.locator('[data-node]').all()) {
    const rect = (await material.boundingBox())!;
    expect(
      expanded.x + expanded.width <= rect.x ||
        expanded.x >= rect.x + rect.width ||
        expanded.y + expanded.height <= rect.y ||
        expanded.y >= rect.y + rect.height,
    ).toBe(true);
  }
  await page
    .getByLabel('Cambios solicitados', { exact: true })
    .fill('Conservar contexto y ajustar el enfoque');
  await expect
    .poll(() =>
      proposal.evaluate(
        (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
      ),
    )
    .toBe(0);
  const colors = await proposal.locator('.proposal-decision').evaluate((el) => {
    const parent = getComputedStyle(el).backgroundColor;
    const components = [
      el.querySelector('p')!,

      ...el.querySelectorAll('button'),
      el.querySelector('textarea')!,
    ];
    return {
      parent,
      pairs: components.map((item) => ({
        color: getComputedStyle(item).color,
        background: getComputedStyle(item).backgroundColor,
      })),
    };
  });
  const numbers = (color: string) => color.match(/[\d.]+/g)!.map(Number);
  const luminance = (values: number[]) =>
    values
      .slice(0, 3)
      .map((value) => {
        const n = value / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i]!, 0);
  for (const pair of colors.pairs) {
    const bg = numbers(pair.background),
      parent = numbers(colors.parent),
      alpha = bg[3] ?? 1;
    const background = bg.slice(0, 3).map((n, i) => n * alpha + parent[i]! * (1 - alpha));
    const levels = [luminance(numbers(pair.color)), luminance(background)].sort((a, b) => b - a);
    expect((levels[0]! + 0.05) / (levels[1]! + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
  await testInfo.attach('propuesta-panel-legible', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await measureMotion('Cancelar pedido de cambios', -1, 150);
  await expect(page.getByLabel('Cambios solicitados', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
  await expect(page.getByLabel('Cambios solicitados', { exact: true })).toHaveValue(
    'Conservar contexto y ajustar el enfoque',
  );
  expect(
    (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!.assignments[0]!.phase,
  ).toBe('ready');
});

test('C08-B24: herramientas se desactivan, cursor propio, grosor visual y formas mantienen su modo', async ({
  page,
}, testInfo) => {
  await canvas(page);
  const draw = page.getByRole('button', { name: 'Dibujar', exact: true });
  await draw.click();
  await draw.click();
  expect((await snapshot(page)).ui.canvas.tool).toBe('select');
  await draw.click();
  expect(
    await page.locator('.canvas-stage').evaluate((el) => getComputedStyle(el).cursor),
  ).toContain('data:image/svg+xml');
  await page.getByRole('button', { name: 'Grosor 4 px', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Grosor 4 px', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.mouse.move(80, 170);
  await page.mouse.down();
  await page.mouse.move(130, 230, { steps: 5 });
  await page.mouse.move(250, 190, { steps: 5 });
  await page.mouse.up();
  const state = await snapshot(page),
    drawing = state.state.worlds
      .find((w) => w.id === 'scout')!
      .nodes.find((node) => node.data.kind === 'drawing')!;
  expect(drawing.data.kind === 'drawing' && drawing.data.title).toBe('Sin nombre');
  expect(state.ui.canvas.tool).toBe('drawing');
  await expect(draw).toHaveAttribute('aria-pressed', 'true');
  await draw.click();
  expect((await snapshot(page)).ui.canvas.tool).toBe('select');
  const comment = page.getByRole('button', { name: 'Comentar · C', exact: true });
  await comment.click();
  expect(
    await page.locator('.canvas-stage').evaluate((el) => getComputedStyle(el).cursor),
  ).toContain('data:image/svg+xml');
  await comment.click();
  expect((await snapshot(page)).ui.canvas.tool).toBe('select');
  const shapes = page.getByRole('button', { name: 'Formas', exact: true });
  await shapes.click();
  await page.getByRole('button', { name: 'Estrella', exact: true }).click();
  await page.mouse.move(100, 300);
  await page.mouse.down();
  await page.mouse.move(250, 420, { steps: 6 });
  await page.mouse.up();
  await expect(shapes).toHaveAttribute('aria-pressed', 'true');
  expect((await snapshot(page)).ui.canvas.tool).toBe('star');
  const shape = (await snapshot(page)).state.worlds
    .find((world) => world.id === 'scout')!
    .nodes.at(-1)!;
  expect(shape.data.kind === 'shape' && shape.data.title).toBe('Sin nombre');
  const style = page.getByLabel('Estilo de dibujo y formas', { exact: true });
  await expect(style).toBeVisible();
  expect(await style.evaluate((el) => getComputedStyle(el, '::after').content)).not.toBe('none');
  await testInfo.attach('estilo-formas-activo', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await shapes.click();
  expect((await snapshot(page)).ui.canvas.tool).toBe('select');
  const connect = page.getByRole('button', { name: 'Conectar · L', exact: true });
  await connect.click();
  const material = page.locator(`[data-node="${drawing.id}"]`);
  const positions = await material.locator('.connection-port').evaluateAll((elements) =>
    elements.map((el) => ({
      anchor: (el as HTMLElement).dataset.anchor,
      left: parseFloat((el as HTMLElement).style.left),
      top: parseFloat((el as HTMLElement).style.top),
    })),
  );
  expect(positions).toHaveLength(4);
  if (drawing.data.kind !== 'drawing') throw Error('Falta dibujo');
  for (const port of positions)
    expect(
      drawing.data.points.some(
        (point) => Math.abs(point.x - port.left) < 0.01 && Math.abs(point.y - port.top) < 0.01,
      ),
    ).toBe(true);
  await connect.click();
  expect((await snapshot(page)).ui.canvas.tool).toBe('select');
  await testInfo.attach('herramientas-dibujo-formas', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('C08-B25: chat no desplaza el dock sin colisión y conserva la posición después de apartarlo', async ({
  page,
}) => {
  await canvas(page);
  const dock = page.getByRole('toolbar', { name: 'Herramientas de Canvas', exact: true });
  const before = (await dock.boundingBox())!;
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await dockChat(page);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Contraer chat', exact: true }).click();
    await page.getByRole('button', { name: 'Desplegar chat', exact: true }).click();
    const current = (await dock.boundingBox())!;
    expect(current.x).toBeCloseTo(before.x, 0);
    expect(current.y).toBeCloseTo(before.y, 0);
  }
  await page.getByRole('button', { name: 'Contraer chat', exact: true }).click();
  const grip = (await dock.locator('.dock-grip').boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(90, 350, { steps: 8 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Desplegar chat', exact: true }).click();
  await expect
    .poll(() =>
      dock.evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length),
    )
    .toBe(0);
  const moved = (await dock.boundingBox())!;
  expect(moved.x).toBeGreaterThanOrEqual(322);
  await page.getByRole('button', { name: 'Contraer chat', exact: true }).click();
  const collapsed = (await dock.boundingBox())!;
  expect(collapsed.x).toBeCloseTo(moved.x, 0);
  expect(collapsed.y).toBeCloseTo(moved.y, 0);
});

test('C08-B26: menú del composer agrupa acciones reales, conserva el campo y distingue comentarios', async ({
  page,
}) => {
  await canvas(page);
  await page.locator('[data-node=note-a]').click();
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await dockChat(page);
  const chat = page.getByRole('region', { name: 'Chat del Canvas', exact: true });
  await expect(
    chat.locator('.chat-handle').getByRole('button', { name: 'Agregar personas', exact: true }),
  ).toHaveCount(0);
  const field = page.getByLabel('Escribí un mensaje…', { exact: true });
  await field.fill('Borrador compartido');
  const input = (await field.elementHandle())!;
  await page.getByRole('button', { name: 'Más acciones de conversación', exact: true }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Ver en Sessions', exact: true }),
  ).toBeInViewport();
  expect(await input.evaluate((el) => el.isConnected)).toBe(true);
  await page.getByRole('menuitem', { name: 'Mencionar', exact: true }).click();
  await expect(field).toHaveValue('Borrador compartido@');
  await field.fill('Borrador compartido');
  await page.getByRole('button', { name: 'Más acciones de conversación', exact: true }).click();
  await page
    .getByRole('menuitem', { name: 'Referenciar material seleccionado', exact: true })
    .click();
  await expect(chat.locator('.chat-reference-list')).toContainText('Reducir la fricción');
  await openPeople(page);
  await page.getByLabel('Nombre del participante', { exact: true }).fill('Ada');
  await page.getByRole('button', { name: 'Agregar persona', exact: true }).click();
  await expect(chat.getByRole('group', { name: 'Participantes', exact: true })).toContainText(
    'Ada',
  );
  const conversation = await chat
    .getByRole('button', { name: 'Conversación', exact: true })
    .locator('svg')
    .innerHTML();
  const comments = await chat
    .getByRole('button', { name: 'Comentarios', exact: true })
    .locator('svg')
    .innerHTML();
  expect(comments).not.toBe(conversation);
  await page.getByRole('button', { name: 'Más acciones de conversación', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Ver en Sessions', exact: true }).click();
  await expect(page.getByLabel('Escribí lo que tenés en mente…', { exact: true })).toHaveValue(
    'Borrador compartido',
  );
  await openSurface(page, 'Canvas');
  await undockChat(page);
  await page.getByRole('button', { name: 'Más acciones de conversación', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Agregar personas', exact: true })).toHaveCount(
    0,
  );
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Más acciones de conversación', exact: true }),
  ).toBeFocused();
});

test('C08-B27: configuración de atajos permite regresar, quitar y restaurar sin acciones repetidas', async ({
  page,
}, testInfo) => {
  await canvas(page);
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await page.getByRole('button', { name: 'Atajos', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Atajos de Canvas', exact: true })).toBeVisible();
  const key = page.getByLabel('Atajo de Crear nota', { exact: true });
  await expect(key).toHaveValue('N');
  const renameKey = page.getByLabel('Atajo de Renombrar', { exact: true });
  await renameKey.press('Control+Shift+R');
  await expect(renameKey).toHaveValue('Ctrl+Shift+R');
  const keySpace = await renameKey.evaluate((el) => {
    const input = el as HTMLInputElement;
    const style = getComputedStyle(input);
    const measure = document.createElement('canvas').getContext('2d')!;
    measure.font = style.font;
    return {
      available: input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      text: measure.measureText(input.value).width,
    };
  });
  expect(keySpace.available).toBeGreaterThanOrEqual(keySpace.text);
  await page.getByRole('button', { name: 'Quitar atajo de Renombrar', exact: true }).click();
  expect(
    await renameKey.evaluate((el) => {
      const input = el as HTMLInputElement;
      const style = getComputedStyle(input);
      const measure = document.createElement('canvas').getContext('2d')!;
      measure.font = style.font;
      return (
        input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) >=
        measure.measureText(input.placeholder).width
      );
    }),
  ).toBe(true);
  await page.getByRole('button', { name: 'Quitar atajo de Crear nota', exact: true }).click();
  await expect(key).toHaveValue('');
  await page.getByRole('button', { name: 'Restaurar atajo de Crear nota', exact: true }).click();
  await expect(key).toHaveValue('N');
  await page.getByRole('button', { name: 'Volver a Configuración', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atajos', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Atajos', exact: true }).click();
  await expect(key).toHaveValue('N');
  const rows = await page.locator('.shortcut-row').evaluateAll((rows) =>
    rows.map((row) => ({
      text: row.textContent,
      bounds: row.getBoundingClientRect().toJSON(),
      buttons: [...row.querySelectorAll('button')].map((button) =>
        button.getBoundingClientRect().toJSON(),
      ),
    })),
  );
  for (const row of rows) {
    expect(row.text).not.toContain('Quitar');
    expect(row.text).not.toContain('Restaurar');
    for (const button of row.buttons) {
      expect(button.width).toBeLessThanOrEqual(32);
      expect(button.bottom).toBeLessThanOrEqual(row.bounds.bottom);
    }
  }
  await testInfo.attach('configuracion-atajos-regreso', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.setViewportSize({ width: 300, height: 500 });
  const reset = page.getByRole('button', { name: 'Restaurar todos', exact: true });
  await reset.scrollIntoViewIfNeeded();
  const resetBounds = (await reset.boundingBox())!;
  expect(resetBounds.y).toBeGreaterThanOrEqual(59);
  expect(resetBounds.y + resetBounds.height).toBeLessThanOrEqual(500);
  expect((await page.locator('.shell').boundingBox())!.y).toBe(0);
  await reset.click();
  await page.getByRole('button', { name: 'Volver a Configuración', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atajos', exact: true })).toBeInViewport();
});

test('C08-B28: nombre de zona independiente del agente y estado de Canvas muestra trabajo real', async ({
  page,
}) => {
  await canvas(page);
  await page.getByRole('button', { name: 'Estado', exact: true }).click();
  await expect(
    page.locator('.status-pop dt').filter({ hasText: 'Agentes trabajando' }).locator('+ dd'),
  ).toHaveText('0');
  await page.getByRole('button', { name: 'Estado', exact: true }).click();
  await page.getByRole('button', { name: 'Dibujar zona', exact: true }).click();
  await page.mouse.move(80, 160);
  await page.mouse.down();
  await page.mouse.move(270, 290, { steps: 6 });
  await page.mouse.up();
  const inspector = page.getByRole('complementary', { name: 'Inspector de zona', exact: true });
  await expect(inspector).toBeVisible();
  const name = inspector.getByLabel('Nombre de la zona', { exact: true });
  await name.fill('Investigación visual');
  await name.press('Tab');
  await inspector.getByLabel('Agente de la zona', { exact: true }).selectOption('milo');
  await expect(name).toHaveValue('Investigación visual');
  const zone = page.getByRole('group', { name: 'Zona Investigación visual', exact: true });
  await expect(zone).toBeVisible();
  await inspector.getByRole('button', { name: 'Cerrar panel de zona', exact: true }).click();
  await zone.click({ button: 'right' });
  await expect(inspector).toBeVisible();
  await expect(page.getByRole('menu', { name: 'Acciones del material', exact: true })).toHaveCount(
    0,
  );
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole('group', { name: 'Zona Investigación visual', exact: true }),
  ).toBeVisible();
});

test('C08-B29: ejemplos multimedia son archivos reales, operables y recuperables después de recargar', async ({
  page,
}, testInfo) => {
  await canvas(page);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.getByRole('button', { name: 'Cargar ejemplos multimedia', exact: true }).click();
  const image = page.locator('.material.image'),
    video = page.locator('.material.video'),
    pdf = page.locator('.material.pdf');
  await expect(image).toHaveCount(1);
  await expect(video).toHaveCount(1);
  await expect(pdf.locator('img')).toBeVisible();
  await expect
    .poll(() => video.locator('video').evaluate((el) => (el as HTMLVideoElement).videoWidth))
    .toBe(640);
  await expect(image).toBeInViewport();
  await expect(video).toBeInViewport();
  await expect(pdf).toBeInViewport();
  const ids = (await snapshot(page)).state.worlds
    .find((w) => w.id === 'scout')!
    .nodes.filter((node) => ['image', 'video', 'pdf'].includes(node.data.kind))
    .map((node) => node.id);
  await testInfo.attach('ejemplos-multimedia', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.reload();
  await ready(page);
  expect(
    (await snapshot(page)).state.worlds
      .find((w) => w.id === 'scout')!
      .nodes.filter((node) => ['image', 'video', 'pdf'].includes(node.data.kind))
      .map((node) => node.id),
  ).toEqual(ids);
  await expect
    .poll(() => image.locator('img').evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBe(640);
  await video.getByRole('button', { name: 'Reproducir video', exact: true }).click();
  await expect
    .poll(() => video.locator('video').evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0);
  await pdf.dblclick();
  await expect(page.locator('.pdf-reader [role=status]')).toHaveText('Página 1 de 1');
});
