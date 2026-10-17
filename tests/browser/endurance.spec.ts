import type { CDPSession, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';
import { installResourceProbe, seededOrder, type PendingResources } from './resource-probe';

// La sesión sostenida conserva acciones, DOM y mediciones; grabar cada fotograma
// durante diez minutos genera una traza que excede el tiempo de cierre del contexto.
test.use({ trace: { mode: 'on', screenshots: false, snapshots: true, sources: true } });

interface Sample extends PendingResources {
  cycle: number;
  elapsedMs: number;
  cycleMs: number;
  nodes: number;
  listeners: number;
  heapBytes: number;
}

async function resources(
  page: Page,
  cdp: CDPSession,
): Promise<Omit<Sample, 'cycle' | 'elapsedMs' | 'cycleMs'>> {
  await expect(page.locator('.transition-ghost,.panel-exit')).toHaveCount(0);
  await page.mouse.move(10, 70);
  await expect
    .poll(() => page.evaluate(() => window.EverettResourceProbe!()))
    .toEqual({ timeouts: 0, intervals: 0, frames: 0 });
  await cdp.send('HeapProfiler.collectGarbage');
  const counters = (await cdp.send('Memory.getDOMCounters')) as {
    nodes: number;
    jsEventListeners: number;
  };
  const metrics = (await cdp.send('Performance.getMetrics')) as {
    metrics: { name: string; value: number }[];
  };
  const heap = metrics.metrics.find((metric) => metric.name === 'JSHeapUsedSize');
  if (!heap) throw new Error('El navegador no entregó la medición de memoria');
  return {
    ...(await page.evaluate(() => window.EverettResourceProbe!())),
    nodes: counters.nodes,
    listeners: counters.jsEventListeners,
    heapBytes: heap.value,
  };
}

test('UI-HARNESS-02: la sonda detecta temporizadores, fotogramas y listeners añadidos deliberadamente', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Docs');
  await page.evaluate(installResourceProbe);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const before = await resources(page, cdp);
  const pending = await page.evaluate(() => {
    const timeout = window.setTimeout(() => {}, 60_000);
    const interval = window.setInterval(() => {}, 60_000);
    const frame = requestAnimationFrame(() => {});
    window.addEventListener('everett-probe-control', window.EverettResourceProbe!);
    const result = window.EverettResourceProbe!();
    clearTimeout(timeout);
    clearInterval(interval);
    cancelAnimationFrame(frame);
    return result;
  });
  expect(pending).toEqual({ timeouts: 1, intervals: 1, frames: 1 });
  await cdp.send('HeapProfiler.collectGarbage');
  const altered = (await cdp.send('Memory.getDOMCounters')) as { jsEventListeners: number };
  expect(altered.jsEventListeners).toBe(before.listeners + 1);
  await page.evaluate(() =>
    window.removeEventListener('everett-probe-control', window.EverettResourceProbe!),
  );
  const after = await resources(page, cdp);
  expect(after.listeners).toBe(before.listeners);
  await cdp.detach();
});

test('UI-STABILITY-02: sesión de cinco minutos conserva datos, libera recursos y mantiene respuesta', async ({
  page,
}, testInfo) => {
  test.setTimeout(10 * 60_000);
  await page.evaluate(installResourceProbe);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await enterWorld(page);
  await openSurface(page, 'Docs');
  const body = page.getByRole('textbox', { name: 'Contenido del documento', exact: true });
  const text = 'Documento conservado durante la sesión sostenida.\n\nÚltima línea.';
  await body.fill(text);
  const samples: Sample[] = [];
  const start = Date.now();
  let cycle = 0;
  try {
    while (cycle < 30 || Date.now() - start < 5 * 60_000) {
      const cycleStart = Date.now();
      for (const surface of seededOrder(
        ['Canvas', 'Code', 'Docs', 'Board', 'Agents', 'Session'],
        2909 + cycle,
      )) {
        await openSurface(page, surface);
        await expect(page.locator('#scene')).toHaveCount(1);
        if (surface === 'Docs') await expect(body).toHaveValue(text);
        if (surface === 'Canvas') {
          const note = page.locator('.material[data-node="note-b"]');
          const origin = (await note.boundingBox())!;
          await page.mouse.move(origin.x + 60, origin.y + 50);
          await page.mouse.down();
          await page.mouse.move(origin.x + 76, origin.y + 58, { steps: 3 });
          await page.mouse.up();
          await page.keyboard.press('Control+z');
          await expect.poll(async () => (await note.boundingBox())!.x).toBeCloseTo(origin.x, 0);
          await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
          const input = page.getByRole('textbox', { name: 'Escribí un mensaje…', exact: true });
          await input.fill('Borrador conservado');
          await input.press('Escape');
        }
        if (surface === 'Code') {
          await page.getByRole('button', { name: 'Hablar con Milo', exact: true }).click();
          const input = page.getByRole('textbox', {
            name: 'Pedile un cambio a Milo…',
            exact: true,
          });
          await input.fill('Borrador de código conservado');
          await input.press('Escape');
        }
      }
      if (cycle % 5 === 0) {
        await page.getByRole('button', { name: 'Everett', exact: true }).click();
        await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'universe');
        await expect(page.locator('.transition-ghost')).toHaveCount(0);
        await enterWorld(page);
      }
      await openSurface(page, 'Docs');
      await expect(body).toHaveValue(text);
      const sample = {
        ...(await resources(page, cdp)),
        cycle,
        elapsedMs: Date.now() - start,
        cycleMs: Date.now() - cycleStart,
      };
      samples.push(sample);
      // Tres ciclos iniciales cargan todas las vistas antes de fijar la referencia.
      const baseline = samples[2];
      if (baseline && cycle > 2) {
        expect(sample.listeners, `Listeners retenidos en ciclo ${cycle}`).toBeLessThanOrEqual(
          baseline.listeners + 2,
        );
        expect(sample.nodes, `Nodos retenidos en ciclo ${cycle}`).toBeLessThanOrEqual(
          baseline.nodes + 20,
        );
        expect(sample.heapBytes, `Memoria tras GC en ciclo ${cycle}`).toBeLessThanOrEqual(
          baseline.heapBytes * 1.25 + 8 * 1024 * 1024,
        );
      }
      cycle++;
    }
    const median = (values: number[]): number =>
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
    expect(median(samples.slice(-5).map((s) => s.cycleMs))).toBeLessThan(
      median(samples.slice(3, 8).map((s) => s.cycleMs)) * 2 + 500,
    );
    await openSurface(page, 'Canvas');
    await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
    await expect(
      page.getByRole('textbox', { name: 'Escribí un mensaje…', exact: true }),
    ).toHaveValue('Borrador conservado');
    await page.getByRole('button', { name: 'Cerrar chat', exact: true }).click();
    await openSurface(page, 'Code');
    await page.getByRole('button', { name: 'Hablar con Milo', exact: true }).click();
    await expect(
      page.getByRole('textbox', { name: 'Pedile un cambio a Milo…', exact: true }),
    ).toHaveValue('Borrador de código conservado');
  } finally {
    await testInfo.attach('sesion-sostenida', {
      body: JSON.stringify({ seed: 2909, minimumMs: 300_000, minimumCycles: 30, samples }),
      contentType: 'application/json',
    });
    await cdp.detach();
  }
});
