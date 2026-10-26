import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(
  await readFile(new URL('../../dist/build-manifest.json', import.meta.url), 'utf8'),
);
const directory = new URL('../../output/revision/' + manifest.version + '/', import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'es-AR',
});
const page = await context.newPage();
const evidence = { artifact: manifest.sha256, when: new Date().toISOString(), cases: [] };
const shot = async (name) => {
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (a) =>
                a.playState === 'running' &&
                Number.isFinite(a.effect?.getComputedTiming().iterations ?? 0),
            ).length,
      ),
    )
    .toBe(0);
  await page.screenshot({
    path: new URL(name + '.png', directory).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  });
};
const world = () =>
  page.evaluate(() => window.EverettDebug.snapshot().state.worlds.find((w) => w.id === 'scout'));
async function add(url) {
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('[data-action=canvas-link]').click();
  await page.getByLabel('Dirección del enlace').fill(url);
  await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
  return (await world()).nodes.at(-1).id;
}
async function asset(id) {
  return page.evaluate(async (id) => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('everett-canvas');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      const blob = await new Promise((resolve, reject) => {
        const r = db.transaction('assets').objectStore('assets').get(id);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      return [...new Uint8Array(await blob.arrayBuffer())];
    } finally {
      db.close();
    }
  }, id);
}
try {
  const network = await context.newCDPSession(page);
  await network.send('Network.enable', {
    maxTotalBufferSize: 64 * 1024 * 1024,
    maxResourceBufferSize: 32 * 1024 * 1024,
  });
  let requestId;
  network.on('Network.responseReceived', (e) => {
    if (e.type === 'Document') requestId = e.requestId;
  });
  await page.goto('http://127.0.0.1:4173/?seed=42');
  const body = await network.send('Network.getResponseBody', { requestId });
  expect(
    createHash('sha256')
      .update(Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8'))
      .digest('hex'),
  ).toBe(manifest.sha256);
  await network.detach();
  await page.waitForFunction(() => window.__everettReady);
  const input = await page.evaluate(() => window.EverettDebug.snapshot());
  const w = input.state.worlds.find((w) => w.id === 'scout');
  Object.assign(w, { nodes: [], zones: [], links: [], assignments: [], comments: [] });
  input.state.route = { kind: 'surface', world: 'scout', surface: 'canvas', entity: null };
  input.state.camera = { x: 0, y: 0, z: 1 };
  input.ui.chat.chatMode = 'closed';
  Object.assign(input.ui.canvas, {
    selection: null,
    selections: [],
    zoneSelection: null,
    linkSelection: null,
    tool: 'select',
  });
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })),
  );
  await page.evaluate(
    async ({ state, ui }) => {
      const db = await new Promise((resolve) => {
        const r = indexedDB.open('everett-canvas', 1);
        r.onsuccess = () => resolve(r.result);
      });
      const { worlds, seq, ...personal } = state;
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['worlds', 'personal'], 'readwrite');
        tx.objectStore('worlds').put({ schema: 1, worlds, seq }, 'shared');
        tx.objectStore('personal').put({ schema: 1, state: personal, ui }, 'local-user');
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    },
    { state: input.state, ui: input.ui },
  );
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);

  const id = await add('https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg');
  await expect
    .poll(async () => (await world()).nodes.find((n) => n.id === id).data.kind, { timeout: 100000 })
    .toBe('image');
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar archivos locales', exact: true }).click();
  await (await chooser).setFiles('tests/fixtures/link-cover.png');
  await expect.poll(async () => (await world()).nodes.length).toBe(2);
  const state = await page.evaluate(() => window.EverettDebug.snapshot());
  const project = state.state.worlds.find((w) => w.id === 'scout');
  project.nodes.forEach((n, i) => {
    n.x = -350 + i * 400;
    n.y = -80;
    n.width = 240;
    n.height = 240 / n.data.ratio;
  });
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })),
  );
  await page.evaluate(
    async ({ state, ui }) => {
      const db = await new Promise((resolve) => {
        const r = indexedDB.open('everett-canvas', 1);
        r.onsuccess = () => resolve(r.result);
      });
      const { worlds, seq, ...personal } = state;
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['worlds', 'personal'], 'readwrite');
        tx.objectStore('worlds').put({ schema: 1, worlds, seq }, 'shared');
        tx.objectStore('personal').put({ schema: 1, state: personal, ui }, 'local-user');
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    },
    { state: state.state, ui: state.ui },
  );
  await page.reload();
  await page.waitForFunction(() => window.__everettReady);
  const ids = (await world()).nodes.map((n) => n.id);
  await page.locator(`[data-node="${ids[0]}"]`).click();
  await page.keyboard.down('Shift');
  await page.locator(`[data-node="${ids[1]}"]`).click();
  await page.keyboard.up('Shift');
  await page.locator(`[data-node="${ids[1]}"]`).hover();
  await page.waitForTimeout(500);
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, -240);
  await page.keyboard.up('Alt');
  await expect(page.locator('.image-gallery')).toBeVisible();
  const firstWidth = await page
    .locator('.image-inspector img')
    .evaluate((image) => image.naturalWidth);
  await page.getByRole('button', { name: 'Imagen anterior', exact: true }).click();
  await expect
    .poll(() => page.locator('.image-inspector img').evaluate((image) => image.naturalWidth))
    .not.toBe(firstWidth);
  const secondWidth = await page
    .locator('.image-inspector img')
    .evaluate((image) => image.naturalWidth);
  expect(firstWidth).toBeGreaterThan(0);
  expect(secondWidth).toBeGreaterThan(0);
  evidence.cases.push({
    kind: 'distinct-gallery-content',
    naturalWidths: [firstWidth, secondWidth],
    different: true,
  });
  await shot('galeria-publica-desktop');
  await page.setViewportSize({ width: 320, height: 760 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '26px'));
  for (const element of await page.locator('.image-tools button,.image-gallery button').all()) {
    const box = await element.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(321);
    expect(box.y + box.height).toBeLessThanOrEqual(761);
  }
  await shot('galeria-320-texto-200');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.locator('[data-action=profile]').click();
  await page.locator('[data-action=profile-tab][data-tab=settings]').click();
  await page.getByRole('button', { name: 'Atajos', exact: true }).click();
  await page.getByLabel('Modificador de navegación espacial', { exact: true }).focus();
  await page.keyboard.press('Control');
  const panel = page.locator('.profile-pop');
  expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await shot('atajos-320-texto-200');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.documentElement.style.removeProperty('font-size'));
  await page.setViewportSize({ width: 900, height: 760 });
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('[data-action=canvas-link]').click();
  await page.getByLabel('Dirección del enlace').fill('https://upload');
  await expect(page.locator('.completion-ghost')).not.toBeEmpty();
  await shot('sugerencia-inline');
  await page.getByLabel('Dirección del enlace').press('Tab');
  await expect(page.getByLabel('Dirección del enlace')).toHaveValue(
    'https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg',
  );
  evidence.cases.push(
    { kind: 'visual-selected-gallery', width: 320, textScale: 2, contained: true },
    { kind: 'visual-spatial-shortcut', width: 320, textScale: 2, contained: true },
    { kind: 'inline-completion', acceptedBy: 'Tab' },
  );
} catch (error) {
  evidence.failure = error.stack;
  throw error;
} finally {
  await writeFile(new URL('inspeccion-medios.json', directory), JSON.stringify(evidence, null, 2));
  await context.close();
  await browser.close();
}
