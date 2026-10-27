import { chromium, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

// Navegador aislado: no se conecta al perfil ni a los datos de la revisión del usuario.
const base = process.env.EVERETT_TEST_URL || 'http://127.0.0.1:4173/';
const manifest = JSON.parse(await readFile('dist/build-manifest.json', 'utf8'));
const evidence = { artifact: manifest.sha256, cases: [] };
const browser = await chromium.launch();
try {
  for (const id of ['NIjruQLJQfo', 'DYoSIFn_nac']) {
    for (const mode of ['everett', 'official']) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        locale: 'es-AR',
      });
      try {
        const page = await context.newPage();
        await page.addInitScript(() => {
          window._youtubeErrors = [];
          window.addEventListener('message', (event) => {
            if (
              !['https://www.youtube.com', 'https://www.youtube-nocookie.com'].includes(
                event.origin,
              )
            )
              return;
            try {
              const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (data?.event === 'onError' || data?.event === 'error')
                window._youtubeErrors.push({ origin: event.origin, data });
            } catch {
              /* No todos los mensajes corresponden a la API. */
            }
          });
        });
        if (mode === 'everett') {
          const network = await context.newCDPSession(page);
          await network.send('Network.enable', {
            maxTotalBufferSize: 64 * 1024 * 1024,
            maxResourceBufferSize: 32 * 1024 * 1024,
          });
          let requestId;
          network.on('Network.responseReceived', (event) => {
            if (event.type === 'Document') requestId = event.requestId;
          });
          await page.goto(new URL('?seed=42', base).href);
          const response = await network.send('Network.getResponseBody', { requestId });
          expect(
            createHash('sha256')
              .update(Buffer.from(response.body, response.base64Encoded ? 'base64' : 'utf8'))
              .digest('hex'),
          ).toBe(manifest.sha256);
          await network.detach();
          await page.waitForFunction(() => window.__everettReady);
          const input = await page.evaluate(() => window.EverettDebug.snapshot());
          const world = input.state.worlds.find((world) => world.id === 'scout');
          Object.assign(world, { nodes: [], zones: [], links: [], assignments: [], comments: [] });
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
          await page.evaluate(async ({ state, ui }) => {
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
          }, input);
          await page.reload();
          await page.waitForFunction(() => window.__everettReady);
          await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
          await page.locator('[data-action=canvas-link]').click();
          await page
            .getByLabel('Dirección del enlace')
            .fill(`https://www.youtube.com/watch?v=${id}`);
          await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
          const node = page
            .locator('[data-node]')
            .filter({ has: page.locator('.link-open') })
            .last();
          await node.locator('.link-open').waitFor({ state: 'visible', timeout: 90000 });
          await node.locator('.link-open').click();
        } else {
          await page.route('**/__youtube-comparison', (route) =>
            route.fulfill({
              contentType: 'text/html',
              body: `<!DOCTYPE html><html><body><div id="player"></div><script src="https://www.youtube.com/iframe_api"></script><script>window.onYouTubeIframeAPIReady=()=>{window.player=new YT.Player('player',{width:640,height:390,videoId:'${id}',events:{onReady:()=>{window.ready=true},onError:e=>{window.officialError=e.data},onStateChange:e=>{window.playerState=e.data}}})}</script></body></html>`,
            }),
          );
          await page.goto(new URL('/__youtube-comparison', base).href);
        }
        await page.waitForTimeout(10000);
        const frame = page
          .frames()
          .find((item) => /youtube(?:-nocookie)?\.com\/embed\//.test(item.url()));
        expect(frame).toBeTruthy();
        if (id === 'DYoSIFn_nac') {
          const play = frame.getByRole('button', { name: /Reproducir/i }).first();
          await play.click({ timeout: 12000 });
          await expect
            .poll(
              () =>
                frame.locator('video').evaluate((video) => !video.paused && video.currentTime > 0),
              { timeout: 20000 },
            )
            .toBe(true);
        } else {
          await expect
            .poll(
              () =>
                page.evaluate(
                  () => window._youtubeErrors.find((event) => event.data.info === 150)?.data.info,
                ),
              { timeout: 20000 },
            )
            .toBe(150);
          if (mode === 'official')
            await expect.poll(() => page.evaluate(() => window.officialError)).toBe(150);
          else {
            await expect(page.locator('.provider-status')).toContainText('El creador no permite');
            await expect(page.getByRole('link', { name: /Abrir original/ })).toHaveAttribute(
              'href',
              `https://www.youtube.com/watch?v=${id}`,
            );
            await mkdir('output/revision/0.8.19', { recursive: true });
            await page.screenshot({ path: 'output/revision/0.8.19/youtube-error-real.png' });
          }
        }
        evidence.cases.push({
          id,
          mode,
          frame: frame.url(),
          errors: await page.evaluate(() => window._youtubeErrors),
          officialError: await page.evaluate(() => window.officialError ?? null),
          status: await page.locator('.provider-status').allTextContents(),
          playback: await frame.locator('video').evaluateAll((videos) =>
            videos.map((video) => ({
              paused: video.paused,
              time: video.currentTime,
              ready: video.readyState,
            })),
          ),
        });
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await mkdir('output/revision/0.8.19', { recursive: true });
  await writeFile(
    'output/revision/0.8.19/youtube-comparison.json',
    JSON.stringify(evidence, null, 2),
  );
}
console.log(JSON.stringify(evidence, null, 2));
