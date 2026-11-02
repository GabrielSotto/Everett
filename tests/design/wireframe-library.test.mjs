import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import {
  entries,
  families,
  stateNames,
  datasets,
  renderSample,
  esc,
} from '../../design/wireframe-library/samples.js';

const entry = (id) => {
  const item = entries.find((item) => item.id === id);
  assert.ok(item, id);
  return item;
};
const sample = (id, state = 'default', data = 'demo', variant) =>
  JSDOM.fragment(renderSample(entry(id), state, data, variant));

test('BLF-STATE-01: una herramienta activa se representa en un control, sin activar toda la toolbar', async () => {
  const normal = sample('toolbar');
  const selected = sample('toolbar', 'active');
  assert.equal(normal.querySelectorAll('[aria-pressed="true"]').length, 0);
  assert.equal(selected.querySelectorAll('[aria-pressed="true"]').length, 1);
  assert.ok(selected.querySelector('.demo-toolbar .icon-action[aria-pressed="true"]'));
  const css = await readFile(
    new URL('../../design/wireframe-library/catalogue.css', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(css, /\.state-active\s+\.demo-toolbar\s*[,\{]/);
});
test('BLF-STATE-02: la cabecera y la navegación local no inventan una carga de datos de todo el contenedor', () => {
  assert.ok(!entry('topbar').states.includes('loading'));
  assert.ok(!entry('sidebar').states.includes('loading'));
  assert.ok(!entry('command-palette').states.includes('loading'));
});
test('BLF-STATE-03: tabla y grilla conservan cabeceras, marco y herramientas mientras cargan', () => {
  for (const id of ['table', 'data-grid']) {
    const loading = sample(id, 'loading');
    assert.equal(loading.querySelectorAll('thead th').length, 3, id);
    assert.equal(loading.querySelectorAll('tbody tr').length, 1, id);
    assert.ok(loading.querySelector('tbody .spinner'), id);
    assert.equal(loading.querySelectorAll('.skeleton').length, 0, id);
  }
  assert.ok(sample('data-grid', 'loading').querySelector('.demo-toolbar'));
});
test('BLF-STATE-04: drawer y búsqueda conservan su estructura y localizan la carga', () => {
  const drawer = sample('drawer', 'loading');
  assert.ok(drawer.querySelector('.drawer-panel .drawer-title'));
  assert.ok(drawer.querySelector('.drawer-panel .spinner'));
  assert.equal(drawer.querySelectorAll('.spinner').length, 1);
  const search = sample('search', 'loading');
  assert.ok(search.querySelector('.wf-field .wf-input .spinner'));
  assert.match(search.querySelector('.wf-input').textContent, /Referencia de diseño/);
});
test('BLF-STATE-05: subir un archivo usa un único indicador y conserva su identidad', () => {
  const upload = sample('upload', 'loading');
  assert.equal(upload.querySelectorAll('.spinner,.demo-track').length, 1);
  assert.match(upload.textContent, /Propuesta de interfaz\.pdf/);
  assert.match(upload.textContent, /60\s*%/);
});
test('BLF-STATE-06: texto simulado y esqueleto de carga son representaciones distintas', () => {
  const text = sample('text-bars');
  assert.equal(text.querySelectorAll('.skeleton,[data-part="carga"]').length, 0);
  assert.ok(text.querySelector('[data-part="texto simulado"]'));
  assert.ok(sample('skeleton').querySelector('.loading-skeleton'));
});
test('BLF-STATE-07: foco y sección actual son independientes; cambiar de sección no es un estado nuevo de la barra', () => {
  for (const id of ['sidebar', 'tabs']) {
    assert.ok(!entry(id).states.includes('selected'));
    const focused = sample(id, 'focus');
    assert.equal(
      focused.querySelectorAll('[aria-current="page"],[aria-selected="true"]').length,
      1,
      id,
    );
    assert.equal(focused.querySelectorAll('.is-focused').length, 1, id);
    assert.ok(
      !focused.querySelector('.is-focused[aria-current="page"],.is-focused[aria-selected="true"]'),
      id,
    );
  }
});
test('BLF-STATE-08: un error de datos no informa de un guardado de configuración ajeno', () => {
  for (const id of ['table', 'list', 'chart']) {
    const error = sample(id, 'error', 'worst');
    assert.match(error.textContent, /cargar|recuperar/);
    assert.doesNotMatch(error.textContent, /guardar la configuración/);
    assert.ok(error.querySelector('[data-ui="retry"]'));
  }
});
test('BLF-STATE-09: envío de composer conserva el borrador y pone el progreso en la acción', () => {
  const sending = sample('composer', 'loading');
  assert.match(
    sending.querySelector('.composer-draft').textContent,
    new RegExp(datasets.demo.message.replaceAll('.', '\\.')),
  );
  assert.ok(sending.querySelector('.composer-send .spinner'));
  assert.equal(sending.querySelectorAll('.spinner').length, 1);
  assert.ok(sending.querySelector('.composer-send[aria-disabled="true"]'));
});
test('BLF-STATE-10: validación, apertura y reproducción producen diferencias en la parte correspondiente', () => {
  assert.ok(sample('text-field', 'error').querySelector('.wf-input[aria-invalid="true"]'));
  assert.equal(sample('select').querySelectorAll('.choice-list').length, 0);
  assert.equal(sample('select', 'open').querySelectorAll('.choice-list').length, 1);
  assert.equal(sample('popover').querySelectorAll('.popover-panel').length, 0);
  assert.equal(sample('popover', 'open').querySelectorAll('.popover-panel').length, 1);
  assert.equal(sample('drawer', 'closed').querySelectorAll('.drawer-panel').length, 0);
  assert.ok(sample('video-player', 'active').querySelector('[data-ui="pause"]'));
  assert.equal(sample('video-player', 'loading').querySelectorAll('.spinner').length, 1);
});
test('BLF-STATE-11: las variantes de presentación se mantienen separadas de estados', () => {
  assert.ok(entry('button').variants.some((variant) => variant.id === 'secondary'));
  for (const id of ['alert', 'toast', 'banner']) {
    assert.deepEqual(entry(id).states, ['default']);
    assert.ok(entry(id).variants.some((variant) => variant.id === 'error'));
    assert.match(sample(id, 'default', 'demo', 'error').textContent, /No se pudo/);
  }
  assert.notEqual(
    renderSample(entry('button'), 'default', 'demo', 'primary'),
    renderSample(entry('button'), 'default', 'demo', 'secondary'),
  );
});
test('BLF-STATE-12: los estados tienen intención y alcance explícitos; combinaciones inválidas se rechazan', () => {
  for (const item of entries) {
    for (const state of item.states) {
      const detail = item.stateDetails[state];
      assert.ok(
        detail.label && detail.reason && detail.target && detail.group,
        item.id + ':' + state,
      );
    }
  }
  assert.throws(() => renderSample(entry('topbar'), 'loading'), /estado/i);
  assert.throws(() => renderSample(entry('toolbar'), 'default', 'desconocido'), /datos/i);
  assert.throws(() => renderSample(entry('button'), 'default', 'demo', 'inventada'), /variante/i);
});

test('BLF-STATE-13: todas las combinaciones admitidas son estáticas, tienen partes y recursos disponibles', async (context) => {
  const resources = new Set();
  let combinations = 0;
  assert.equal(new Set(entries.map((item) => item.id)).size, entries.length);
  for (const [family] of families.slice(1))
    assert.ok(
      entries.some((item) => item.family === family),
      family,
    );
  for (const item of entries) {
    assert.equal(new Set(item.states).size, item.states.length, item.id);
    assert.equal(new Set(item.variants.map((v) => v.id)).size, item.variants.length, item.id);
    for (const variant of item.variants)
      for (const state of item.states)
        for (const data of Object.keys(datasets)) {
          const fragment = sample(item.id, state, data, variant.id);
          assert.ok(fragment.querySelector('.specimen[inert]'), item.id);
          assert.ok(fragment.querySelector('[data-part]'), item.id);
          assert.equal(
            fragment.querySelectorAll('input,textarea,select,button,iframe,script').length,
            0,
            item.id,
          );
          assert.doesNotMatch(fragment.textContent, /undefined|\[object Object\]/, item.id);
          for (const img of fragment.querySelectorAll('img'))
            resources.add(img.getAttribute('src'));
          combinations++;
        }
  }
  for (const resource of resources) {
    assert.match(resource, /^\/design\/wireframe-library\/vendor\/[\w-]+\.svg$/);
    assert.match(await readFile(new URL('../..' + resource, import.meta.url), 'utf8'), /<svg[\s>]/);
  }
  for (const license of ['CHALK-LICENSE', 'PHOSPHOR-LICENSE']) {
    assert.match(
      await readFile(
        new URL('../../design/wireframe-library/vendor/' + license, import.meta.url),
        'utf8',
      ),
      /Permission is hereby granted/,
    );
  }
  context.diagnostic(combinations + ' combinaciones de muestra, variante, estado y datos');
});

test('BLF-STATE-14: los vacíos retiran los datos y conservan contexto y siguiente paso', () => {
  assert.equal(sample('table', 'empty').querySelectorAll('tbody td[colspan="3"]').length, 1);
  assert.equal(sample('table', 'empty').querySelectorAll('tbody .wf-badge').length, 0);
  assert.equal(sample('chips-input', 'empty').querySelectorAll('.wf-badge').length, 0);
  assert.equal(sample('chat', 'empty').querySelectorAll('.bubble').length, 0);
  assert.ok(sample('chat', 'empty').querySelector('.composer'));
  assert.equal(sample('inspector', 'empty').querySelectorAll('.property-grid').length, 0);
  assert.match(sample('inspector', 'empty').textContent, /Seleccioná un elemento/);
  assert.equal(sample('list', 'default', 'one').querySelectorAll('.person-row').length, 1);
  assert.equal(sample('table', 'default', 'one').querySelectorAll('tbody tr').length, 1);
  assert.equal(
    sample('carousel', 'empty').querySelectorAll('.pagination-dots,.carousel-next').length,
    0,
  );
});

test('BLF-STATE-15: las interfaces completas siguen compartiendo piezas al componer', () => {
  for (const id of [
    'dashboard',
    'chat-app',
    'editor',
    'search-results',
    'settings',
    'kanban',
    'calendar-app',
  ]) {
    const fragment = sample(id, 'default', 'worst');
    assert.ok(fragment.querySelector('.mini-screen'), id);
    assert.ok(fragment.querySelectorAll('[data-part]').length >= 12, id);
  }
  assert.ok(sample('editor').querySelector('.demo-toolbar'));
  assert.ok(sample('editor').querySelector('.demo-inspector'));
  assert.ok(sample('chat-app').querySelector('.chat-window .composer'));
});

test('BLF-STATE-16: menús, datos y conversación localizan selección, disponibilidad y fallo', () => {
  const select = sample('select', 'open');
  assert.match(select.querySelector('[role="listbox"]').textContent, /Ana García/);
  assert.doesNotMatch(select.textContent, /Renombrar|Eliminar|Duplicar/);
  assert.equal(
    sample('combobox', 'focus').querySelectorAll('[role="option"].is-focused').length,
    1,
  );
  assert.equal(
    sample('gallery', 'selected', 'one').querySelectorAll('.gallery-grid > div').length,
    1,
  );
  assert.equal(sample('gallery', 'selected', 'one').querySelectorAll('.is-selected').length, 1);
  assert.equal(
    sample('timeline', 'default', 'one').querySelectorAll('.timeline-demo > div').length,
    1,
  );
  assert.match(
    sample('context-menu', 'focus').querySelector('.is-focused').textContent,
    /Copiar enlace/,
  );
  assert.match(
    sample('dropdown', 'disabled').querySelector('.is-disabled').textContent,
    /Eliminar/,
  );
  assert.equal(sample('toolbar', 'disabled').querySelectorAll('[aria-disabled="true"]').length, 1);
  assert.equal(sample('sidebar', 'disabled').querySelectorAll('[aria-disabled="true"]').length, 1);
  assert.equal(sample('tags', 'selected').querySelectorAll('.is-selected').length, 1);
  const chat = sample('chat', 'error');
  assert.ok(chat.querySelector('.bubble.own [data-ui="retry"]'));
  assert.equal(chat.querySelectorAll('.composer .spinner').length, 0);
  const inspector = sample('inspector', 'disabled');
  assert.ok(inspector.querySelector('[aria-readonly="true"]'));
  assert.equal(inspector.querySelectorAll('[aria-invalid="true"]').length, 0);
});

test('BLF-STATE-17: el arnés rechaza pérdida de estructura, carga duplicada y selección global', () => {
  const checkTable = (fragment) => {
    assert.equal(fragment.querySelectorAll('thead th').length, 3);
    assert.equal(fragment.querySelectorAll('tbody .spinner').length, 1);
  };
  const table = sample('table', 'loading');
  checkTable(table);
  const heading = table.querySelector('thead');
  heading.remove();
  assert.throws(() => checkTable(table), assert.AssertionError);
  table.querySelector('table').prepend(heading);
  checkTable(table);
  const checkUpload = (fragment) =>
    assert.equal(fragment.querySelectorAll('.spinner,.demo-track').length, 1);
  const upload = sample('upload', 'loading');
  checkUpload(upload);
  upload
    .querySelector('.upload-zone')
    .insertAdjacentHTML('beforeend', '<span class="spinner"></span>');
  assert.throws(() => checkUpload(upload), assert.AssertionError);
  const checkToolbar = (fragment) =>
    assert.equal(fragment.querySelectorAll('[aria-pressed="true"]').length, 1);
  const toolbar = sample('toolbar', 'active');
  checkToolbar(toolbar);
  toolbar
    .querySelectorAll('.icon-action')
    .forEach((action) => action.setAttribute('aria-pressed', 'true'));
  assert.throws(() => checkToolbar(toolbar), assert.AssertionError);
});

async function catalogueUi(query = '') {
  const html = await readFile(
    new URL('../../design/wireframe-library/index.html', import.meta.url),
    'utf8',
  );
  const script = (
    await readFile(
      new URL('../../design/wireframe-library/catalogue-expanded.js', import.meta.url),
      'utf8',
    )
  ).replace(/^import[^;]+;/, '');
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:4173/design/wireframe-library/' + query,
    runScripts: 'outside-only',
  });
  dom.window.scrollTo = () => {};
  new dom.window.Function('entries', 'families', 'stateNames', 'renderSample', 'esc', script)(
    entries,
    families,
    stateNames,
    renderSample,
    esc,
  );
  return dom;
}

test('BLF-STATE-18: filtrar y cambiar variante conserva el estado local y la intención visible', async () => {
  const dom = await catalogueUi('?family=navigation&state=active&text=labels');
  try {
    const { document, Event } = dom.window;
    const card = document.querySelector('[data-id="toolbar"]');
    assert.equal(card.hidden, false);
    assert.equal(card.querySelector('[data-state="active"]').getAttribute('aria-pressed'), 'true');
    const variant = card.querySelector('[data-variant]');
    variant.value = 'vertical';
    variant.dispatchEvent(new Event('change', { bubbles: true }));
    assert.ok(card.querySelector('.tools-vertical .icon-action[aria-pressed="true"]'));
    card.querySelector('[data-state="focus"]').click();
    assert.equal(card.hidden, false);
    assert.equal(card.querySelectorAll('.specimen .is-focused').length, 1);
    assert.match(card.querySelector('.scenario-note').textContent, /foco de teclado/);
    document.querySelector('#data-filter').value = 'worst';
    document.querySelector('#data-filter').dispatchEvent(new Event('change', { bubbles: true }));
    assert.ok(card.querySelector('.tools-vertical .is-focused'));
    assert.match(dom.window.location.search, /state=active/);
    document.querySelector('#state-filter').value = 'loading';
    document.querySelector('#state-filter').dispatchEvent(new Event('change', { bubbles: true }));
    assert.equal(card.hidden, true);
    assert.equal(document.querySelector('[data-id="topbar"]').hidden, true);
    assert.equal(document.querySelector('[data-id="drawer"]').hidden, false);
    assert.ok(document.querySelector('[data-id="drawer"] .drawer-title'));
  } finally {
    dom.window.close();
  }
});

test('BLF-STATE-19: filtros, representación, tamaño de texto y reinicio funcionan desde sus controles', async () => {
  const dom = await catalogueUi('?family=feedback');
  try {
    const { document, Event } = dom.window;
    document.querySelector('[data-text="labels"]').click();
    document.querySelector('#parts').click();
    document.querySelector('#text-scale').click();
    assert.ok(document.body.classList.contains('labels'));
    assert.ok(document.body.classList.contains('parts'));
    assert.ok(document.documentElement.classList.contains('large-text'));
    assert.match(dom.window.location.search, /scale=2/);
    document.querySelector('#search').value = 'esto no es un componente';
    document.querySelector('#search').dispatchEvent(new Event('input'));
    assert.equal(document.querySelector('#empty').hidden, false);
    document.querySelector('#reset').click();
    assert.equal(document.querySelector('#empty').hidden, true);
    assert.equal(document.querySelectorAll('.catalogue-card:not([hidden])').length, entries.length);
  } finally {
    dom.window.close();
  }
});
