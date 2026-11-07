import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  entries,
  renderSample,
  availableStates,
  settingOptions,
} from '../../design/wireframe-library/samples.js';
import { changeState, resolveStates } from '../../design/wireframe-library/review-model.js';

const entry = (id) => entries.find((e) => e.id === id);
const sample = (id, state = 'default', variant, options, data = 'demo', review) =>
  JSDOM.fragment(renderSample(entry(id), state, data, variant, options, review));

function verifyConversation(dom) {
  for (const composer of dom.querySelectorAll('.composer')) {
    const send = composer.querySelector('.composer-send [role="button"]');
    assert.ok(send, 'El composer conserva su acción de envío');
    assert.match(send.getAttribute('aria-label'), /Envia[rn].*mensaje/);
    assert.equal(send.querySelector('.label'), null, 'El envío se representa solo con icono');
    assert.ok(send.querySelector('.icon, .spinner'));
    assert.equal(composer.querySelectorAll('[aria-label="Adjuntar archivo"]').length, 1);
  }
  for (const chat of dom.querySelectorAll('.chat-window')) {
    assert.ok(chat.querySelector('.chat-header .wf-avatar'));
    assert.match(chat.querySelector('.chat-header').textContent, /Conversación directa/);
    assert.equal(chat.querySelector('.chat-header .wf-input, .chat-header .demo-toolbar'), null);
    assert.doesNotMatch(chat.querySelector('.chat-header').textContent, /Documento/);
  }
}

test('BLF-ANATOMY-12: todas las composiciones de conversación conservan identidad y envío por icono', () => {
  let composers = 0;
  for (const item of entries) {
    for (const variant of item.variants)
      for (const state of availableStates(item, variant.id, {})) {
        const dom = sample(item.id, state, variant.id);
        composers += dom.querySelectorAll('.composer').length;
        verifyConversation(dom);
      }
  }
  assert.ok(composers >= 12, 'Se revisan el composer y las composiciones que lo contienen');
  const messaging = sample('chat-app');
  assert.match(messaging.querySelector('.conversation-list').textContent, /Buscar conversaciones/);
  assert.equal(messaging.querySelector('.conversation-items .wf-field'), null);
  assert.equal(
    messaging
      .querySelector('.conversation-items [aria-current="page"]')
      .textContent.includes('Ana García'),
    true,
  );
  const broken = sample('composer');
  const label = broken.ownerDocument.createElement('span');
  label.className = 'label';
  label.textContent = 'Enviar';
  broken.querySelector('.composer-send [role="button"]').append(label);
  assert.throws(() => verifyConversation(broken), /solo con icono/);
  const wrongHeader = sample('chat');
  wrongHeader.querySelector('.chat-header strong').textContent = 'Documento';
  assert.throws(() => verifyConversation(wrongHeader), assert.AssertionError);
});

test('BLF-ANATOMY-13: los escenarios utilizan controles correspondientes a su tarea', () => {
  const registration = sample('signup');
  assert.equal(
    registration.querySelector('[role="tablist"]'),
    null,
    'Un proceso secuencial muestra pasos',
  );
  assert.equal(
    registration.querySelector('[aria-current="step"]').parentElement.textContent,
    '1Cuenta',
  );
  for (const field of sample('inspector', 'disabled').querySelectorAll('[role="textbox"]')) {
    assert.equal(field.getAttribute('aria-readonly'), 'true');
    assert.equal(field.getAttribute('aria-disabled'), 'false');
  }
  for (const id of ['composer', 'chat', 'chat-app', 'support-workspace']) {
    for (const action of sample(id).querySelectorAll('.icon-action'))
      assert.ok(
        action.getAttribute('aria-label')?.length > 4,
        'Los iconos conservan un nombre de acción',
      );
  }
  const agenda = sample('calendar-app');
  assert.equal(agenda.querySelectorAll('.agenda-event').length, 2);
  assert.match(agenda.querySelector('.agenda-event').textContent, /10:00.*Revisión/s);
  assert.equal(agenda.querySelector('.agenda-list .person-row'), null);
  assert.match(sample('invitation').textContent, /invita a colaborar.*Acceso.*Editor.*Permisos/s);
  assert.ok(sample('search-results').querySelector('.pagination [aria-current="page"]'));
});

test('BLF-ANATOMY-14: veinte recorridos diferenciados y navegación lateral en dos presentaciones', () => {
  assert.equal(entries.filter((item) => item.family === 'screens').length, 20);
  const booking = sample('booking-mobile');
  assert.doesNotMatch(booking.textContent, /Proyecto Aurora|Explorar|Perfil/);
  assert.equal(booking.querySelector('.bottom-navigation'), null);
  for (const id of ['dashboard', 'editor', 'file-manager']) {
    const compact = sample(id, 'default', 'collapsed');
    const expanded = sample(id, 'default', 'expanded');
    assert.equal(compact.querySelectorAll('.app-rail .nav-row .label').length, 0);
    assert.equal(expanded.querySelectorAll('.app-rail .nav-row .label').length, 4);
    assert.equal(expanded.querySelectorAll('.app-rail [aria-current="page"]').length, 1);
    assert.equal(compact.querySelector('.app-rail').getAttribute('data-part'), 'navegación');
  }
  const contexts = {
    'product-detail': /Acabado.*Cantidad.*Agregar al carrito/s,
    checkout: /Contacto.*Entrega.*Pago.*Número de tarjeta.*Total/s,
    'file-manager': /Subir archivo.*Buscar en esta carpeta.*Referencias.*Portada/s,
    'article-reader': /6 min de lectura.*El punto de partida.*Probar el recorrido/s,
    'team-profile': /Diseño de producto.*Enviar mensaje.*Actividad reciente/s,
    'notification-center': /sin leer.*Marcar todas.*Hoy.*Ayer/s,
    'video-course': /Jerarquía y composición.*Completar y continuar.*Contenido del curso/s,
  };
  for (const [id, context] of Object.entries(contexts)) {
    const rendered = sample(id);
    assert.match(rendered.textContent, context, id);
    assert.ok(rendered.querySelectorAll('[data-part]').length > 15, id + ': piezas componibles');
    assert.equal(rendered.querySelector('input, textarea, select, iframe'), null);
  }
  const checkSupport = (dom) =>
    assert.match(dom.textContent, /Caso 1042.*Marcar resuelto.*Asignado a.*Prioridad/s);
  checkSupport(sample('support-workspace'));
  assert.throws(
    () => checkSupport(sample('chat-app')),
    assert.AssertionError,
    'Un chat genérico no sustituye un caso de atención',
  );
});

test('BLF-ANATOMY-01: marcar, enfocar y deshabilitar conserva el valor y rechaza focos imposibles', () => {
  for (const id of ['checkbox', 'radio', 'switch']) {
    const item = entry(id);
    let state = changeState(item, 'default', 'selected');
    state = changeState(item, state, 'focus');
    assert.ok(sample(id, state).querySelector('.is-focused[aria-checked="true"]'), id);
    state = changeState(item, state, 'disabled');
    const disabled = sample(id, state);
    assert.ok(disabled.querySelector('[aria-checked="true"][aria-disabled="true"]'), id);
    assert.equal(disabled.querySelector('.is-focused'), null);
    assert.throws(() => sample(id, ['selected', 'focus', 'disabled']), /deshabilitado/);
  }
  assert.ok(
    sample('checkbox', ['partial', 'disabled']).querySelector(
      '[aria-checked="mixed"][aria-disabled="true"]',
    ),
  );
  assert.throws(() => sample('checkbox', ['selected', 'partial']), /eje/);
  for (const id of ['select', 'date']) {
    assert.throws(() => sample(id, ['open', 'readonly']), /incompatible/);
    assert.deepEqual(
      changeState(
        entry(id),
        ['open', 'focus'].filter((s) => entry(id).states.includes(s)),
        'readonly',
      ),
      id === 'select' ? ['focus', 'readonly'] : ['readonly'],
    );
  }
  assert.throws(() => sample('slider', ['active', 'disabled']), /incompatible/);
  assert.deepEqual(changeState(entry('slider'), ['active'], 'disabled'), ['disabled']);
});

test('BLF-ANATOMY-02: validación con foco y solo lectura conservan datos, prefijos y unidades', () => {
  for (const id of ['text-field', 'password', 'textarea', 'stepper', 'select', 'time']) {
    assert.ok(sample(id, ['error', 'focus']).querySelector('.is-focused[aria-invalid="true"]'), id);
    const readonly = sample(id, 'readonly');
    assert.ok(readonly.querySelector('[aria-readonly="true"]'), id);
    assert.equal(readonly.querySelector('[aria-disabled="true"]'), null, id);
  }
  for (const variant of ['prefix', 'suffix', 'both']) {
    const field = sample('text-field', ['readonly', 'focus'], variant);
    assert.equal(field.querySelectorAll('[data-affix]').length, variant === 'both' ? 2 : 1);
    assert.ok(field.querySelector('.field-value').textContent.trim());
  }
  const pending = sample('search', ['loading', 'focus']);
  assert.ok(pending.querySelector('.is-focused .spinner'));
  assert.throws(() => sample('search', ['loading', 'error']), /Carga/);
});

test('BLF-ANATOMY-03: jerarquía de botón, función y valor son independientes', () => {
  for (const variant of ['primary', 'secondary', 'text']) {
    const action = sample('button', 'default', variant, { action: 'normal' });
    assert.equal(action.querySelector('[aria-pressed]'), null);
    const toggle = sample('button', ['selected', 'disabled'], variant, { action: 'toggle' });
    assert.ok(toggle.querySelector('[aria-pressed="true"][aria-disabled="true"]'));
    const destructive = sample('button', 'default', variant, { action: 'destructive' });
    assert.match(destructive.textContent, /Eliminar/);
    assert.ok(destructive.querySelector('[data-action="destructive"] img[src$="trash.svg"]'));
  }
  assert.throws(
    () => sample('button', 'selected', 'primary', { action: 'normal' }),
    /incompatible/,
  );
});

function verifyCalendar(dom) {
  assert.equal(dom.querySelector('[data-ui="month"]').textContent, 'Noviembre 2026');
  assert.equal(dom.querySelectorAll('.calendar-heading [role="button"]').length, 2);
  assert.equal(dom.querySelectorAll('[role="columnheader"]').length, 7);
  const cells = [...dom.querySelectorAll('[role="gridcell"]')];
  assert.equal(cells.length, 42);
  assert.equal(cells.filter((e) => e.dataset.date.startsWith('2026-11')).length, 30);
  assert.equal(cells.findIndex((e) => e.dataset.date === '2026-11-01') % 7, 6);
  assert.equal(
    cells.find((e) => e.dataset.date === '2026-11-10').getAttribute('aria-selected'),
    'true',
  );
}
test('BLF-ANATOMY-04: calendario completo, día de semana, selección e intervalo corresponden al campo', () => {
  const single = sample('date', 'selected');
  verifyCalendar(single);
  assert.match(single.querySelector('.field-value').textContent, /10\/11\/2026/);
  assert.equal(single.querySelectorAll('[role="gridcell"][aria-selected="true"]').length, 1);
  const range = sample('date', 'selected', 'range');
  verifyCalendar(range);
  assert.equal(range.querySelectorAll('[role="gridcell"][aria-selected="true"]').length, 6);
  assert.match(range.querySelector('.field-value').textContent, /10\/11\/2026 — 15\/11\/2026/);
  const readonly = sample('date', ['selected', 'readonly'], 'range');
  assert.match(readonly.textContent, /10\/11\/2026 — 15\/11\/2026/);
  assert.equal(readonly.querySelector('.calendar-panel'), null);
});
test('BLF-ANATOMY-05: rangos numéricos y hora tienen límites y anatomía propios', () => {
  const range = sample('slider', ['focus'], 'range');
  const thumbs = [...range.querySelectorAll('[role="slider"]')];
  assert.deepEqual(
    thumbs.map((e) => e.getAttribute('aria-valuenow')),
    ['20', '80'],
  );
  assert.deepEqual(
    thumbs.map((e) => [e.getAttribute('aria-valuemin'), e.getAttribute('aria-valuemax')]),
    [
      ['0', '80'],
      ['20', '100'],
    ],
  );
  assert.equal(range.querySelectorAll('.is-focused').length, 1);
  assert.equal(sample('time', 'default', 'dial').querySelectorAll('.clock-number').length, 12);
  assert.equal(sample('time').querySelectorAll('[role="textbox"]').length, 2);
  assert.match(sample('time', 'default', 'dial').textContent, /AM.*PM.*12 horas/s);
  assert.match(sample('time', 'default', 'input').textContent, /24 horas/);
  assert.equal(sample('time', ['error', 'focus']).querySelectorAll('.is-focused').length, 1);
  assert.equal(sample('stepper', 'readonly').querySelectorAll('[role="button"]').length, 0);
  assert.equal(
    sample('stepper', 'disabled').querySelectorAll('[role="button"][aria-disabled="true"]').length,
    2,
  );
});
test('BLF-ANATOMY-06: navegación por destinos, pestañas y modalidad se distinguen', () => {
  const nav = sample('bottom-nav', 'focus');
  assert.equal(nav.querySelectorAll('[aria-current="page"]').length, 1);
  assert.ok(nav.querySelector('[role="link"].is-focused:not([aria-current])'));
  assert.equal(nav.querySelector('[role="tab"]'), null);
  assert.equal(sample('tabs').querySelectorAll('[role="tab"]').length, 3);
  for (const id of ['drawer', 'bottom-sheet']) {
    assert.ok(sample(id, 'default', 'modal').querySelector('[data-part="overlay"]'));
    const nonmodal = sample(id, 'default', 'nonmodal');
    assert.equal(nonmodal.querySelector('[data-part="overlay"]'), null);
    assert.ok(nonmodal.querySelector('[role="dialog"][aria-modal="false"]'));
    assert.equal(sample(id, 'closed').querySelector('[role="dialog"]'), null);
  }
  const confirm = sample('dialog', 'default', 'confirm');
  assert.ok(confirm.querySelector('[role="alertdialog"]'));
  assert.match(confirm.textContent, /no se puede deshacer/);
  assert.ok(confirm.querySelector('[data-action="destructive"]'));
  assert.equal(sample('dialog', 'default', 'info').querySelectorAll('.wf-btn').length, 1);
  assert.throws(() => sample('dialog', 'loading', 'info'), /incompatible/);
});
test('BLF-ANATOMY-07: filas, accesorios, grupos, ordenamiento y selección múltiple completos', () => {
  for (const [variant, lines] of [
    ['one-line', 1],
    ['two-lines', 2],
    ['three-lines', 3],
  ]) {
    const list = sample('list', 'default', variant, {
      accessory: 'disclosure',
      grouping: 'sections',
    });
    assert.equal(list.querySelectorAll('.list-section').length, 2);
    assert.equal(
      list.querySelectorAll('.person-row')[0].querySelectorAll('.grow > *').length,
      lines,
    );
    assert.ok(list.querySelector('.person-row img[src$="arrow-right.svg"]'));
  }
  const multiple = sample('table', 'selected', 'multiple');
  assert.equal(multiple.querySelectorAll('tbody [aria-checked="true"]').length, 2);
  assert.ok(multiple.querySelector('thead [aria-checked="mixed"]'));
  assert.match(multiple.querySelector('[data-ui="bulk-actions"]').textContent, /2 seleccionados/);
  assert.ok(
    sample('table', 'selected', 'multiple', {}, 'one').querySelector('thead [aria-checked="true"]'),
  );
  assert.ok(sample('table', 'default', 'sortable').querySelector('th[aria-sort="ascending"] img'));
  assert.equal(
    sample('table', 'empty', 'multiple').querySelector('[data-ui="bulk-actions"]'),
    null,
  );
});
test('BLF-ANATOMY-08: chips no confunden acciones, filtros, entradas y sugerencias', () => {
  for (const variant of ['assist', 'suggestion'])
    assert.equal(sample('chip', 'default', variant).querySelector('[aria-pressed]'), null);
  assert.ok(
    sample('chip', ['selected', 'disabled'], 'filter').querySelector(
      '[aria-pressed="true"][aria-disabled="true"]',
    ),
  );
  assert.ok(sample('chip', 'default', 'input').querySelector('.chip-remove[aria-label^="Quitar"]'));
  assert.equal(sample('chips-input').querySelectorAll('.chip-remove').length, 2);
  assert.equal(
    sample('chips-input', 'readonly').querySelectorAll('.chip-remove[aria-disabled="true"]').length,
    2,
  );
  assert.throws(() => sample('chip', 'selected', 'assist'), /incompatible/);
  for (const id of ['alert', 'toast', 'banner']) {
    assert.match(
      sample(id, 'default', 'success', { action: 'undo' }).textContent,
      /archivado.*Deshacer/s,
    );
    assert.match(
      sample(id, 'default', 'error', { action: 'retry' }).textContent,
      /No se pudo.*Reintentar/s,
    );
    assert.equal(sample(id, 'default', 'info').querySelector('[data-ui="notice-action"]'), null);
    assert.throws(() => sample(id, 'default', 'info', { action: 'undo' }), /Opción/);
  }
});
test('BLF-ANATOMY-09: escenarios compuestos reutilizan los patrones y conservan contexto en errores', () => {
  const mobile = sample('booking-mobile', 'error');
  assert.ok(mobile.querySelector('.calendar-panel'));
  assert.ok(mobile.querySelector('.time-fields .is-focused[aria-invalid="true"]'));
  assert.equal(
    mobile.querySelector('.bottom-navigation'),
    null,
    'La reserva es un paso enfocado, sin destinos ajenos al proceso',
  );
  assert.match(
    mobile.textContent,
    /Visita al estudio.*Fecha.*Hora.*Estudio Central.*Confirmar reserva/s,
  );
  assert.ok(mobile.querySelector('[aria-label="Volver"]'));
  const records = sample('records-workspace', 'error');
  assert.ok(records.querySelector('[data-ui="bulk-actions"]'));
  assert.match(records.querySelector('[data-ui="notice-action"]').textContent, /Reintentar/);
  const support = sample('support-workspace', 'error');
  assert.ok(support.querySelector('.bubble.own [data-ui="retry"]'));
  assert.match(
    support.querySelector('.support-details').textContent,
    /Asignado a.*Prioridad.*Canal.*Creado/s,
  );
  assert.ok(support.querySelector('.composer-draft'));
  const edited = sample('booking-mobile', 'default', undefined, {}, 'demo', {
    width: 280,
    title: '<script>Prueba & título</script>',
  });
  assert.equal(edited.querySelector('script'), null);
  assert.match(edited.textContent, /<script>Prueba & título<\/script>/);
  assert.throws(
    () => renderSample(entry('booking-mobile'), 'default', 'demo', undefined, {}, { width: -1 }),
    /límites/,
  );
});
test('BLF-ANATOMY-10: contraejemplos del arnés detectan calendarios incompletos y valores perdidos', () => {
  const calendar = sample('date', 'selected');
  verifyCalendar(calendar);
  calendar.querySelector('[data-date="2026-11-30"]').remove();
  assert.throws(() => verifyCalendar(calendar), assert.AssertionError);
  const check = (dom) =>
    assert.ok(dom.querySelector('[aria-checked="true"][aria-disabled="true"]'));
  const checkbox = sample('checkbox', ['selected', 'disabled']);
  check(checkbox);
  checkbox.querySelector('[aria-checked]').setAttribute('aria-checked', 'false');
  assert.throws(() => check(checkbox), assert.AssertionError);
});

test('BLF-ANATOMY-11: todas las variantes de función admiten solo estados combinados compatibles', (context) => {
  let count = 0;
  for (const item of entries.filter((e) => e.combineStates))
    for (const variant of item.variants) {
      let configs = [{}];
      for (const setting of item.settings)
        configs = configs.flatMap((config) =>
          settingOptions(item, setting, variant.id).map((o) => ({ ...config, [setting.id]: o.id })),
        );
      for (const config of configs) {
        const states = availableStates(item, variant.id, config).filter((s) => s !== 'default');
        for (let mask = 0; mask < 2 ** states.length; mask++) {
          const subset = states.filter((_, i) => mask & (1 << i));
          let valid = true;
          try {
            resolveStates(item, subset);
          } catch {
            valid = false;
          }
          if (!valid) {
            assert.throws(() => renderSample(item, subset, 'demo', variant.id, config));
            continue;
          }
          const dom = sample(item.id, subset, variant.id, config, 'worst');
          assert.equal(dom.querySelector('input,select,textarea,button,script'), null);
          assert.doesNotMatch(dom.textContent, /undefined|NaN|\[object Object\]/);
          count++;
        }
      }
    }
  context.diagnostic(
    count + ' combinaciones compatibles de valor, interacción, disponibilidad y contenido',
  );
});
