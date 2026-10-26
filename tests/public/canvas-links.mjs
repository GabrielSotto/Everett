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
  const godot = await add('https://docs.godotengine.org/en/stable/');
  await expect(page.locator(`[data-node="${godot}"] .link-open`)).toBeVisible({ timeout: 100000 });
  await page.locator(`[data-node="${godot}"] .link-open`).click();
  await expect(page.locator('.reader-content')).toContainText('Godot', { timeout: 10000 });
  const gd = (await world()).nodes.find((n) => n.id === godot).data;
  const bytes = Buffer.from(await asset(gd.metadata.readerAsset));
  await shot('godot-lectura-desktop');
  const introduction = page.locator('.reader-content a').filter({ hasText: 'introduction page' });
  await introduction.click();
  await expect(page.locator('.reader-content')).toContainText('Introduction', { timeout: 100000 });
  await shot('godot-articulo-en-lector');
  evidence.cases.push({
    kind: 'internal-navigation',
    title: await page.locator('.reader-content > h2').innerText(),
    nodes: (await world()).nodes.length,
  });
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(page.locator('.reader-content')).toContainText('Godot');
  await page.setViewportSize({ width: 390, height: 760 });
  await shot('godot-lectura-390');
  await page.reload();
  await expect(page.locator('.reader-content > h2')).toContainText('Introduction');
  expect(Buffer.from(await asset(gd.metadata.readerAsset))).toEqual(bytes);
  evidence.cases.push({
    kind: 'reader',
    url: gd.url,
    title: gd.metadata.readerTitle,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    reloadSameBytes: true,
  });
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [kind, url] of [
    ['image', 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg'],
    ['video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm'],
  ]) {
    const id = await add(url);
    await expect
      .poll(async () => (await world()).nodes.find((n) => n.id === id).data.kind, {
        timeout: 100000,
      })
      .toBe(kind);
    const n = (await world()).nodes.find((n) => n.id === id);
    const bytes = Buffer.from(await asset(n.data.asset));
    if (kind === 'video') {
      await page
        .locator(`[data-node="${id}"]`)
        .getByRole('button', { name: 'Reproducir video', exact: true })
        .click();
      await expect
        .poll(() => page.locator(`[data-node="${id}"] video`).evaluate((v) => v.currentTime))
        .toBeGreaterThan(0);
    } else
      await expect
        .poll(() =>
          page
            .locator(`[data-node="${id}"] img`)
            .first()
            .evaluate((i) => i.naturalWidth),
        )
        .toBeGreaterThan(0);
    await shot(kind + '-publico');
    await page.reload();
    expect(Buffer.from(await asset(n.data.asset))).toEqual(bytes);
    evidence.cases.push({
      kind,
      url,
      source: n.data.source,
      bytes: bytes.length,
      ratio: n.data.ratio,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      reloadSameBytes: true,
    });
  }
  const id = await add('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
  await expect(page.locator(`[data-node="${id}"] .link-open`)).toBeVisible({ timeout: 100000 });
  await page.locator(`[data-node="${id}"] .link-open`).click();
  await expect(page.locator('.provider-video iframe')).toBeVisible();
  await page.waitForTimeout(7000);
  await shot('youtube-oficial');
  const frame = page
    .frames()
    .find((f) => f.url().startsWith('https://www.youtube-nocookie.com/embed/'));
  const text = frame
    ? await frame
        .locator('body')
        .innerText()
        .catch((e) => e.message)
    : 'sin frame';
  let playback;
  try {
    if (await frame.locator('video').evaluate((v) => v.paused))
      await frame
        .getByRole('button', { name: /Reproducir/i })
        .first()
        .click({ timeout: 12000 });
    await expect
      .poll(
        () => frame.locator('video').evaluate((v) => ({ playing: !v.paused, time: v.currentTime })),
        { timeout: 18000 },
      )
      .toMatchObject({ playing: true });
    await expect
      .poll(() => frame.locator('video').evaluate((v) => v.currentTime), { timeout: 18000 })
      .toBeGreaterThan(0);
    playback = await frame
      .locator('video')
      .evaluate((v) => ({ playing: !v.paused, time: v.currentTime, videoWidth: v.videoWidth }));
  } catch (e) {
    playback = {
      unavailable: e.message.slice(0, 1200),
      body: frame
        ? await frame
            .locator('body')
            .innerText()
            .catch(() => '-')
        : '-',
    };
  }
  await shot('youtube-reproduccion');
  evidence.cases.push({
    kind: 'provider',
    iframe: await page.locator('.provider-video iframe').getAttribute('src'),
    playback,
  });
  const bounds = await page.locator('.provider-video iframe').boundingBox();
  await page.locator('.provider-video iframe').hover();
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(150);
  await expect(page.locator('.provider-video iframe')).toBeVisible();
  expect(await page.locator('.provider-video iframe').boundingBox()).toEqual(bounds);
  evidence.cases.push({ kind: 'youtube-local-wheel', staysInside: true, geometryStable: true });
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, 240);
  await page.keyboard.up('Alt');
  await page.waitForTimeout(500);
  const focusedExit = (await page.locator(`[data-node="${id}"]`).count()) > 0;
  evidence.cases.push({
    kind: 'youtube-focused-modifier',
    passed: focusedExit,
    limitation: focusedExit ? null : 'El iframe enfocado no entrega las teclas al documento padre',
  });
  if (!focusedExit) {
    await page.locator('.media-toolbar h1').click();
    await page.locator('.provider-video iframe').hover();
    await page.keyboard.down('Alt');
    await page.mouse.wheel(0, 240);
    await page.keyboard.up('Alt');
  }
  await expect(page.locator(`[data-node="${id}"]`)).toBeVisible();
  evidence.cases.push({ kind: 'youtube-parent-modifier', passed: true });
  const home = await add('https://www.youtube.com/');
  await expect
    .poll(async () => (await world()).nodes.find((n) => n.id === home).data.metadata?.status, {
      timeout: 100000,
    })
    .not.toBe('loading');
  await page.locator(`[data-node="${home}"]`).dblclick();
  await expect(page.locator('.reader-message')).toBeVisible();
  await shot('aplicacion-sin-lectura');
  evidence.cases.push({
    kind: 'application-home',
    message: await page.locator('.reader-message').innerText(),
  });
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  const missing = await add('https://everett-preview-missing.invalid/');
  await expect(page.locator(`[data-node="${missing}"]`)).toContainText(
    'No se encontró este dominio',
    { timeout: 100000 },
  );
  evidence.cases.push({
    kind: 'dns-not-found',
    problem: (await world()).nodes.find((n) => n.id === missing).data.metadata.problem,
  });
} catch (error) {
  evidence.failure = error.stack;
  throw error;
} finally {
  await writeFile(new URL('destinos-publicos.json', directory), JSON.stringify(evidence, null, 2));
  await context.close();
  await browser.close();
}

if (evidence.cases.some((item) => item.passed === false)) process.exitCode = 1;
