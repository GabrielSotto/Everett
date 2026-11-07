import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { entries, stateNames } from '../../design/wireframe-library/samples.js';

// Revisión aislada del catálogo, sin abrir Canvas ni acceder a datos de revisión del usuario.
const target = new URL(
  process.env.EVERETT_DESIGN_URL ?? 'http://127.0.0.1:4173/design/wireframe-library/',
);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  target.pathname !== '/design/wireframe-library/'
)
  throw new Error('El arnés de diseño requiere el catálogo local.');
const evidence = 'output/pruebas/diseno';
let browser, page;
const errors = [];
before(async () => {
  mkdirSync(evidence, { recursive: true });
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'es-AR' });
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(target.href);
  await page.locator('.catalogue-card').last().waitFor();
  await page.locator('[data-text="labels"]').click();
});
after(async () => {
  await browser?.close();
  assert.deepEqual(errors, [], 'Errores de ejecución');
});
const card = (id) => page.locator(`[data-id="${id}"]`);
const state = (id, value) => card(id).locator(`[data-state="${value}"]`).click();
const variant = (id, value) => card(id).locator('select[data-variant]').selectOption(value);
async function capture(id, name) {
  const viewport = page.viewportSize();
  const bounds = await card(id).boundingBox();
  // Toda la muestra cabe debajo de la cabecera sticky; no se oculta UI en la evidencia.
  await page.setViewportSize({
    width: viewport.width,
    height: Math.max(viewport.height, Math.ceil(bounds.height) + 200),
  });
  await page.evaluate((sampleId) => {
    const element = document.querySelector(`[data-id="${sampleId}"]`);
    const header = document.querySelector('.catalogue-header');
    scrollTo({
      top:
        scrollY + element.getBoundingClientRect().top - header.getBoundingClientRect().height - 24,
      behavior: 'instant',
    });
  }, id);
  await card(id).screenshot({ path: `${evidence}/${name}.png` });
  await page.setViewportSize(viewport);
}

async function geometry() {
  return page.evaluate(() => {
    const failures = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('Desborde de página');
    for (const card of document.querySelectorAll('.catalogue-card:not([hidden])')) {
      const sample = card.querySelector('.specimen');
      if (!sample) {
        failures.push(card.dataset.id + ': sin muestra');
        continue;
      }
      const bounds = sample.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1)
        failures.push(card.dataset.id + ': geometría vacía');
      for (const el of sample.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(el).display === 'none') continue;
        // Tablas y pestañas tienen scroll propio; la pieza Recorte ilustra clipping deliberado.
        // Sus marcos sí deben quedar contenidos: solo se excluyen sus descendientes.
        if (el.parentElement?.closest('.table-region, .demo-tabs, .clip-example, .calendar-scroll'))
          continue;
        if (r.left < bounds.left - 2 || r.right > bounds.right + 2)
          failures.push(card.dataset.id + ': ' + el.className + ' fuera de muestra');
      }
      for (const img of sample.querySelectorAll('img'))
        if (!img.complete || !img.naturalWidth)
          failures.push(card.dataset.id + ': recurso sin cargar');
      for (const cell of sample.querySelectorAll('[role="gridcell"]')) {
        const range = document.createRange();
        range.selectNodeContents(cell);
        if (range.getBoundingClientRect().width > cell.getBoundingClientRect().width - 2)
          failures.push(card.dataset.id + ': dígitos de calendario solapados');
      }
      // Encajar en la muestra no basta: el texto de una acción debe conservar palabras
      // completas dentro del propio control, también en composiciones anidadas.
      if (document.body.classList.contains('labels'))
        for (const label of sample.querySelectorAll(
          '.wf-btn .label, .nav-row .label, .demo-tabs .label, .bottom-navigation .label, .choice-list .label, .menu-bar-scene .demo-toolbar .label, .steps .label, .chip-demo .label, .wf-badge .label, .segmented-demo .label, .demo-heading .label, .app-facets .label, .app-summary .label',
        )) {
          const node = label.firstChild;
          if (!node || node.nodeType !== Node.TEXT_NODE || !label.getBoundingClientRect().height)
            continue;
          for (const match of node.textContent.matchAll(/[\p{L}\p{M}]+/gu)) {
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            const lines = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
            if (lines.size > 1) failures.push(`${card.dataset.id}: palabra partida «${match[0]}»`);
            const text = range.getBoundingClientRect();
            const control =
              label.closest(
                '.wf-btn, .nav-row, [role="tab"], .bottom-navigation > span, [role="menuitem"], .chip-demo, .wf-badge',
              ) ?? label;
            const box = control.getBoundingClientRect();
            if (text.left < box.left - 1 || text.right > box.right + 1)
              failures.push(`${card.dataset.id}: rótulo fuera de su control «${match[0]}»`);
          }
        }
    }
    return [...new Set(failures)];
  });
}
async function settledGeometry() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
  assert.deepEqual(await geometry(), []);
}

test('BLF-BROWSER-07: interfaces completas en barras y rótulos, regiones alineadas y navegación legible', async () => {
  await page.locator('[data-family="screens"]').click();
  for (const mode of ['bars', 'labels']) {
    await page.locator(`[data-text="${mode}"]`).click();
    for (const item of entries.filter((entry) => entry.family === 'screens')) {
      const specimen = card(item.id).locator('.specimen');
      await specimen.scrollIntoViewIfNeeded();
      await specimen.screenshot({ path: `${evidence}/screen-${item.id}-${mode}.png` });
    }
  }
  for (const id of ['dashboard', 'editor', 'file-manager']) {
    await variant(id, 'expanded');
    await settledGeometry();
    await card(id)
      .locator('.specimen')
      .screenshot({ path: `${evidence}/screen-${id}-expanded.png` });
    await variant(id, 'collapsed');
  }
  const columns = await card('dashboard')
    .locator('.app-metrics > div')
    .evaluateAll((nodes) =>
      nodes.map((el) => {
        const label = el.firstElementChild.getBoundingClientRect();
        const value = el.lastElementChild.getBoundingClientRect();
        return { left: label.left, valueLeft: value.left, top: label.top, valueTop: value.top };
      }),
    );
  assert.ok(columns.every((column) => Math.abs(column.left - column.valueLeft) < 1));
  assert.ok(columns.every((column) => Math.abs(column.top - columns[0].top) < 1));
  // Los estilos del catálogo no pueden introducir rellenos o sticky dentro de una plantilla.
  for (const node of await page
    .locator('.app-screen main, .app-facets, .app-index, .app-lessons')
    .all()) {
    const style = await node.evaluate((el) => ({
      padding: getComputedStyle(el).padding,
      position: getComputedStyle(el).position,
    }));
    assert.equal(style.padding, '0px');
    assert.equal(style.position, 'static');
  }
  await page.locator('[data-family="controls"]').click();
});

test('BLF-BROWSER-01: estados independientes y variantes desde controles visibles', async () => {
  await page.locator('[data-family="controls"]').click();
  await state('checkbox', 'selected');
  await state('checkbox', 'focus');
  assert.equal(await card('checkbox').locator('.is-focused[aria-checked="true"]').count(), 1);
  await state('checkbox', 'disabled');
  assert.equal(
    await card('checkbox').locator('[aria-checked="true"][aria-disabled="true"]').count(),
    1,
  );
  assert.equal(await card('checkbox').locator('.is-focused').count(), 0);
  await state('search', 'loading');
  await state('search', 'focus');
  assert.equal(await card('search').locator('.is-focused .spinner').count(), 1);
  await card('button').locator('[data-setting="action"]').selectOption('toggle');
  await state('button', 'selected');
  await state('button', 'disabled');
  assert.equal(
    await card('button').locator('.sample [aria-pressed="true"][aria-disabled="true"]').count(),
    1,
  );
  await card('button').locator('[data-setting="action"]').selectOption('destructive');
  assert.equal(await card('button').locator('.sample [aria-pressed]').count(), 0);
  await variant('date', 'range');
  await state('date', 'selected');
  assert.equal(await card('date').locator('[role="gridcell"][aria-selected="true"]').count(), 6);
  await capture('date', 'calendar-range');
  await state('date', 'readonly');
  assert.equal(await card('date').locator('.calendar-panel').count(), 0);
  assert.match(
    await card('date').locator('.field-value').innerText(),
    /10\/11\/2026 — 15\/11\/2026/,
  );
  await variant('time', 'dial');
  await state('time', 'focus');
  assert.equal(await card('time').locator('.sample .is-focused').count(), 1);
  await capture('time', 'time-picker');
  await page.locator('#state-filter').selectOption('selected');
  assert.equal(
    await card('button').isVisible(),
    false,
    'Una acción destructiva no ofrece alternancia',
  );
  await page.locator('#state-filter').selectOption('all');
});

test('BLF-BROWSER-02: redimensionar composiciones y conservar texto, accesorios y proporciones', async () => {
  await page.locator('[data-family="screens"]').click();
  for (const id of ['booking-mobile', 'records-workspace', 'support-workspace']) {
    const item = entries.find((e) => e.id === id);
    await card(id).locator('summary').click();
    await card(id)
      .locator('[data-example-title]')
      .fill('Proyecto internacional — investigación, decisiones y entregas compartidas');
    for (const width of [item.layout.minWidth, item.layout.maxWidth, item.layout.width]) {
      await card(id).locator('[data-width]').fill(String(width));
      const bounds = await card(id).locator('.specimen').boundingBox();
      const available = await card(id)
        .locator('.sample')
        .evaluate(
          (el) =>
            el.clientWidth -
            parseFloat(getComputedStyle(el).paddingLeft) -
            parseFloat(getComputedStyle(el).paddingRight),
        );
      assert.ok(
        Math.abs(bounds.width - Math.min(width, available)) < 3,
        `${id}: ancho efectivo ${bounds.width}, esperado ${Math.min(width, available)}`,
      );
      await settledGeometry();
    }
    await state(id, 'error');
    assert.match(await card(id).locator('.screen-title').innerText(), /Proyecto internacional/);
    await capture(id, id);
  }
});

test(
  'BLF-BROWSER-03: geometría de todas las variantes, estados, datos y texto ampliado',
  { timeout: 180000 },
  async (context) => {
    await page.locator('[data-family="all"]').click();
    await page.locator('#state-filter').selectOption('default');
    let scenarios = 0;
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      if (width === 320) await page.locator('#text-scale').click();
      for (const data of ['demo', 'worst', 'one']) {
        await page.locator('#data-filter').selectOption(data);
        for (const value of Object.keys(stateNames)) {
          await page.locator('#state-filter').selectOption(value);
          await settledGeometry();
          scenarios += await page.locator('.catalogue-card:not([hidden])').count();
        }
      }
      await page.locator('#state-filter').selectOption('all');
      await page.locator('#data-filter').selectOption('worst');
      for (const item of entries.filter((e) => e.variants.length > 1)) {
        for (const option of item.variants) {
          await variant(item.id, option.id);
          await settledGeometry();
          scenarios++;
        }
      }
      if (width === 1440) {
        for (const item of entries) {
          const details = card(item.id).locator('.composition-review');
          if (!(await details.evaluate((el) => el.open))) await details.locator('summary').click();
          for (const size of [
            item.layout.minWidth,
            Math.round((item.layout.minWidth + item.layout.width) / 2),
            item.layout.maxWidth,
          ]) {
            await card(item.id).locator('[data-width]').fill(String(size));
            await settledGeometry();
            scenarios++;
          }
          await card(item.id).locator('[data-width]').fill(String(item.layout.width));
          await details.locator('summary').click();
        }
      }
    }
    await page.locator('[data-family="screens"]').click();
    await capture('booking-mobile', 'mobile-narrow-large-text');
    await page.locator('#text-scale').click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    context.diagnostic(`${scenarios} representaciones comprobadas con geometría y recursos`);
  },
);

test('BLF-BROWSER-04: contraejemplo geométrico, foco de revisión y cambio a barras', async () => {
  await page.locator('[data-family="controls"]').click();
  await page.locator('#state-filter').selectOption('default');
  await settledGeometry();
  // Inyección adversa del arnés: prueba que medir el marco no oculta una pieza desanclada.
  await card('text-field')
    .locator('.wf-input')
    .evaluate((el) => {
      el.style.transform = 'translateX(600px)';
    });
  assert.ok((await geometry()).some((f) => f.startsWith('text-field:')));
  await card('text-field')
    .locator('.wf-input')
    .evaluate((el) => {
      el.style.removeProperty('transform');
    });
  await settledGeometry();
  await card('checkbox').locator('[data-state="focus"]').focus();
  await page.keyboard.press('Space');
  assert.equal(
    await card('checkbox').locator('[data-state="focus"]').getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(
    await card('checkbox')
      .locator('[data-state="focus"]')
      .evaluate((el) => getComputedStyle(el).outlineStyle),
    'solid',
  );
  await page.locator('[data-text="bars"]').click();
  assert.equal(
    await card('text-field')
      .locator('.field-value .label')
      .evaluate((el) => getComputedStyle(el).color),
    'rgba(0, 0, 0, 0)',
  );
  await page.locator('[data-text="labels"]').click();
  assert.deepEqual(errors, []);
});

test('BLF-BROWSER-05: accesorios, acciones y modalidad conservan su contexto', async () => {
  await page.locator('[data-family="all"]').click();
  await page.locator('#state-filter').selectOption('all');
  await page.locator('#data-filter').selectOption('demo');
  await variant('list', 'three-lines');
  await card('list').locator('[data-setting="accessory"]').selectOption('switch');
  await card('list').locator('[data-setting="grouping"]').selectOption('sections');
  await state('list', 'selected');
  assert.equal(await card('list').locator('.sample [aria-checked="true"]').count(), 1);
  assert.equal(await card('list').locator('.list-section').count(), 2);
  await capture('list', 'list-accessories');
  await variant('drawer', 'nonmodal');
  assert.equal(await card('drawer').locator('[data-part="overlay"]').count(), 0);
  await capture('drawer', 'nonmodal-panel');
  await variant('dialog', 'confirm');
  await state('dialog', 'error');
  assert.equal(await card('dialog').locator('[role="alertdialog"]').count(), 1);
  await capture('dialog', 'confirmation');
  await variant('toast', 'success');
  await card('toast').locator('[data-setting="action"]').selectOption('undo');
  assert.match(await card('toast').locator('[data-ui="notice-action"]').innerText(), /Deshacer/);
  await variant('toast', 'error');
  assert.equal(await card('toast').locator('[data-setting="action"]').inputValue(), 'none');
  await card('toast').locator('[data-setting="action"]').selectOption('retry');
  await capture('toast', 'notice-action');
  await variant('chip', 'filter');
  await state('chip', 'selected');
  await state('chip', 'focus');
  await capture('chip', 'filter-chip');
  await settledGeometry();
});

test('BLF-BROWSER-06: rótulos íntegros durante resize y chats con envío por icono', async () => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-family="workspace"]').click();
  await page.locator('#state-filter').selectOption('default');
  await page.locator('#data-filter').selectOption('demo');
  await card('split-pane').locator('summary').click();
  // Cruza los puntos de cambio, no solamente los extremos declarados.
  for (const width of [720, 650, 640, 520, 510, 420, 360, 350, 320, 280, 240, 400, 720]) {
    await card('split-pane').locator('[data-width]').fill(String(width));
    await settledGeometry();
    assert.equal(await card('split-pane').locator('.nav-row .label').count(), 4);
    for (const label of await card('split-pane').locator('.nav-row .label').all())
      assert.ok(await label.isVisible(), 'El resize conserva los destinos de navegación');
  }
  await card('split-pane').locator('[data-width]').fill('320');
  await capture('split-pane', 'split-labels-narrow');

  // Un elemento contenido puede seguir siendo ilegible: reproducir la palabra partida.
  const badWrapping = await page.addStyleTag({
    content: `
    [data-id="split-pane"] .nav-row { width: 48px; }
    [data-id="split-pane"] .nav-row .label { overflow-wrap: anywhere; }
  `,
  });
  assert.ok((await geometry()).some((f) => f.includes('palabra partida')));
  await badWrapping.evaluate((el) => el.remove());
  await settledGeometry();

  for (const id of ['composer', 'chat']) {
    for (const value of ['default', 'loading', 'error']) {
      await state(id, value);
      const send = card(id).locator('.composer-send [role="button"]');
      assert.match(await send.getAttribute('aria-label'), /Envia[rn].*mensaje/);
      assert.equal(await send.locator('.label').count(), 0);
      const size = await send.boundingBox();
      assert.ok(
        Math.abs(size.width - size.height) < 1 && size.width >= 32,
        `${id}/${value}: envío ${size.width} × ${size.height}`,
      );
      assert.match(await card(id).locator('.composer-draft').innerText(), /propuesta/);
      await settledGeometry();
    }
    await state(id, 'default');
  }
  await capture('chat', 'chat-context');
  await page.locator('[data-family="screens"]').click();
  await card('chat-app').locator('summary').click();
  await card('chat-app').locator('[data-width]').fill('1000');
  await capture('chat-app', 'messaging-labels-wide');
  await card('chat-app').locator('[data-width]').fill('320');
  await settledGeometry();
  await capture('chat-app', 'messaging-labels-narrow');
  await page.locator('[data-text="bars"]').click();
  await settledGeometry();
  assert.equal(await card('chat-app').locator('.composer-send .icon').count(), 1);
  await capture('chat-app', 'messaging-bars');
  await page.locator('[data-text="labels"]').click();
});
