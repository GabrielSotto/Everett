// Representaciones estáticas: los controles dibujados permanecen dentro de una muestra inert.
export const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const t = (v, cls = '') => `<span class="label ${cls}" data-part="texto">${esc(v)}</span>`;
export const ico = (n) =>
  `<img class="icon" data-part="símbolo" src="/design/wireframe-library/vendor/${n}.svg" alt="">`;
const has = (state, value) => (Array.isArray(state) ? state : [state]).includes(value);
const is = (c, value) =>
  value === 'default' && c.states ? c.states.length === 0 : has(c.states ?? c.state, value);
const controlState = (c) => c.states ?? c.state;
const modifiers = (state) =>
  ['hover', 'focus', 'pressed', 'disabled']
    .filter((s) => has(state, s))
    .map(
      (s) =>
        ({
          hover: 'is-hovered',
          focus: 'is-focused',
          pressed: 'is-pressed',
          disabled: 'is-disabled',
        })[s],
    )
    .join(' ');
export const spinner = () => '<span class="spinner" data-part="carga" aria-hidden="true"></span>';
const loading = (label) =>
  `<div class="loading-region" data-ui="loading" role="status">${spinner()}<span>${esc(label)}</span></div>`;
const fail = (message) =>
  `<div class="error-region" data-ui="error">${ico('warning-circle')}<span>${esc(message)}</span><span class="retry-action" role="button" data-ui="retry">Reintentar</span></div>`;
const textPlaceholder = () =>
  '<div class="text-placeholder" data-part="texto simulado"><i></i><i></i><i></i></div>';
export const avatar = () => `<span class="wf-avatar" data-part="máscara">${ico('user')}</span>`;
export const paragraph = (c, value = c.d.message) =>
  `<div class="paragraph" data-part="párrafo">${t(value)}${t('Información adicional para entender el contexto')}${t('Detalle y próximos pasos')}</div>`;
export const btn = (
  v = 'Continuar',
  variant = '',
  glyph = '',
  state = 'default',
  action = 'normal',
) =>
  `<div class="wf-btn interactive-part ${variant} ${modifiers(state)} ${has(state, 'loading') ? 'is-busy' : ''}" data-action="${action}" ${action === 'toggle' ? `aria-pressed="${has(state, 'selected')}"` : ''} role="button" aria-disabled="${has(state, 'disabled') || has(state, 'loading')}" ${has(state, 'loading') ? 'aria-busy="true"' : ''} data-part="fondo">${has(state, 'loading') ? spinner() : glyph ? ico(glyph) : ''}${t(has(state, 'loading') ? 'Procesando…' : v)}</div>`;
const actionNames = {
  'arrow-left': 'Volver',
  'arrow-right': 'Siguiente',
  'arrow-up': 'Subir',
  'magnifying-glass': 'Buscar',
  'dots-three': 'Más opciones',
  'pencil-simple': 'Dibujar',
  rows: 'Organizar',
  copy: 'Copiar',
  link: 'Copiar enlace',
  minus: 'Reducir',
  plus: 'Agregar',
  paperclip: 'Adjuntar archivo',
  x: 'Cerrar',
  play: 'Reproducir',
  'sliders-horizontal': 'Ajustar propiedades',
  'squares-four': 'Distribuir',
};
export const act = (
  glyph,
  selected = false,
  state = 'default',
  toggleable = selected,
  label = actionNames[glyph] ?? glyph,
) =>
  `<span class="icon-action interactive-part ${selected ? 'is-active' : ''} ${modifiers(state)}" role="button" aria-label="${esc(label)}" title="${esc(label)}" aria-disabled="${has(state, 'disabled') || has(state, 'loading')}" ${has(state, 'loading') ? 'aria-busy="true"' : ''} ${toggleable ? `aria-pressed="${selected}"` : ''} data-part="fondo">${has(state, 'loading') ? spinner() : ico(glyph)}</span>`;
export const badge = (v) => `<span class="wf-badge" data-part="fondo">${t(v)}</span>`;
export const field = (name, value, glyph = '', state = 'default', help, adornments = {}) =>
  `<div class="wf-field"><div class="wf-label">${t(name)}</div><div class="wf-input interactive-part ${modifiers(state)} ${has(state, 'error') ? 'is-error' : ''}" role="textbox" aria-readonly="${has(state, 'readonly')}" aria-disabled="${has(state, 'disabled')}" aria-invalid="${has(state, 'error')}" ${has(state, 'loading') ? 'aria-busy="true"' : ''} data-part="contenedor">${adornments.prefix ? `<span class="field-affix" data-affix="prefix">${t(adornments.prefix)}</span>` : ''}<span class="field-value">${t(has(state, 'empty') ? 'Escribí acá…' : value)}</span>${adornments.suffix ? `<span class="field-affix" data-affix="suffix">${t(adornments.suffix)}</span>` : ''}${has(state, 'loading') ? spinner() : glyph ? ico(glyph) : ''}</div>${has(state, 'error') || has(state, 'success') ? `<small class="field-help">${ico(has(state, 'error') ? 'warning-circle' : 'check-circle')}<span>${esc(help ?? (has(state, 'error') ? 'Revisá este campo' : 'Dato válido'))}</span></small>` : ''}</div>`;
export const media = (video = false) =>
  `<div class="wf-img media-box" data-part="medio">${ico(video ? 'play' : 'image')}</div>`;
export const mark = (selected = false, partial = false, state = 'default') =>
  `<span class="check-mark ${selected ? 'checked' : ''} ${modifiers(state)}" role="checkbox" aria-checked="${partial ? 'mixed' : selected}" aria-disabled="${has(state, 'disabled')}" data-part="marca">${partial ? '−' : selected ? ico('check') : ''}</span>`;
export const toggle = (selected, state = 'default') =>
  `<span class="switch-demo ${selected ? 'on' : ''} ${modifiers(state)}" role="switch" aria-checked="${selected}" aria-disabled="${has(state, 'disabled')}" data-part="pista"><i data-part="control"></i></span>`;
export const row = (c, name = c.d.person, selected = false) => {
  const accessory = c.options?.accessory ?? 'avatar';
  const lines = c.variant === 'one-line' ? 1 : c.variant === 'three-lines' ? 3 : 2;
  return `<div class="person-row ${selected ? 'is-selected' : ''}" data-lines="${lines}" ${selected ? 'aria-selected="true"' : ''}>${accessory === 'avatar' ? avatar() : accessory === 'checkbox' ? mark(selected) : ''}<div class="grow">${t(name)}${lines > 1 ? `<small>${t(c.d.email)}</small>` : ''}${lines > 2 ? `<small>${t(c.d.message)}</small>` : ''}</div>${accessory === 'avatar' ? act('dots-three') : accessory === 'disclosure' ? ico('arrow-right') : accessory === 'switch' ? toggle(selected) : ''}</div>`;
};
export const empty = (c, noun = 'materiales') =>
  `<div class="wf-empty" data-ui="empty">${ico('folder')}<strong>${t('No hay ' + noun)}</strong>${t('Agregá el primero para comenzar')}</div>`;
export const list = (c, count = 3) => {
  const rows = Array.from({ length: c.data === 'one' ? 1 : count }, (_, i) =>
    row(c, i === 0 ? c.d.person : ['Jo', 'Đặng Thị Ngọc Hân'][i % 2], is(c, 'selected') && i === 0),
  );
  const content =
    c.options?.grouping === 'sections'
      ? `<section class="list-section"><strong>${t('Equipo de diseño')}</strong>${rows.slice(0, 2).join('')}</section>${rows.length > 2 ? `<section class="list-section"><strong>${t('Colaboradores')}</strong>${rows.slice(2).join('')}</section>` : ''}`
      : rows.join('');
  return `<div class="demo-list">${is(c, 'loading') ? loading('Cargando elementos…') : is(c, 'empty') ? empty(c, 'elementos') : is(c, 'error') ? fail('No se pudieron cargar los elementos.') : content}</div>`;
};
export const toolbar = (c, title = c.d.title) =>
  `<div class="demo-toolbar" data-part="contenedor">${act('arrow-left')}<div class="grow">${t(title)}</div>${act('magnifying-glass')}${act('dots-three')}</div>`;
export const sidebar = (c, compact = false) =>
  `<div class="demo-sidebar" data-part="contenedor">${['Resumen', 'Materiales', 'Actividad', 'Equipo'].map((v, i) => `<div class="nav-row ${i === 0 ? 'is-active' : ''} ${i === 1 && is(c, 'focus') ? 'is-focused' : ''} ${i === 3 && is(c, 'disabled') ? 'is-disabled' : ''}" role="link" ${i === 0 ? 'aria-current="page"' : ''} aria-disabled="${i === 3 && is(c, 'disabled')}">${ico(['squares-four', 'folder', 'bell', 'user'][i])}${compact ? '' : t(v)}</div>`).join('')}</div>`;
export const tabs = (names = ['Resumen', 'Actividad', 'Equipo'], selected = 0, c = {}) =>
  `<div class="demo-tabs ${c.variant === 'contained' ? 'contained' : ''}" role="tablist">${names.map((v, i) => `<span class="${i === selected ? 'is-active' : ''} ${i === 1 && is(c, 'focus') ? 'is-focused' : ''} ${i === 2 && is(c, 'disabled') ? 'is-disabled' : ''}" role="tab" aria-selected="${i === selected}" aria-disabled="${i === 2 && is(c, 'disabled')}">${t(v)}</span>`).join('')}</div>`;
export const table = (c) => {
  const multi = c.variant === 'multiple';
  const unavailable = ['loading', 'empty', 'error'].some((s) => is(c, s));
  const count = c.data === 'one' ? 1 : 3;
  const selected = is(c, 'selected') && !unavailable ? (multi ? Math.min(2, count) : 1) : 0;
  return `<div class="table-composition">${multi && selected ? `<div class="bulk-actions" data-ui="bulk-actions"><span>${selected} ${selected === 1 ? 'seleccionado' : 'seleccionados'}</span>${btn('Archivar', '', 'folder')}${btn('Eliminar', '', 'trash', 'default', 'destructive')}</div>` : ''}<div class="table-region" data-part="recorte"><table class="wf-table" ${is(c, 'loading') ? 'aria-busy="true"' : ''}><thead><tr>${multi ? `<th class="selection-cell">${mark(selected === count, selected > 0 && selected < count, unavailable ? 'disabled' : 'default')}</th>` : ''}<th ${c.variant === 'sortable' ? 'aria-sort="ascending"' : ''}><span class="column-heading">${t('Nombre')}${c.variant === 'sortable' ? `<span role="button" aria-label="Ordenar por nombre, ascendente">${ico('arrow-up')}</span>` : ''}</span></th><th>${t('Estado')}</th><th>${t('Equipo')}</th></tr></thead><tbody>${unavailable ? `<tr><td colspan="${multi ? 4 : 3}" class="table-state">${is(c, 'loading') ? loading('Cargando filas…') : is(c, 'empty') ? empty(c, 'resultados') : fail('No se pudieron cargar los datos de la tabla.')}</td></tr>` : Array.from({ length: count }, (_, i) => `<tr class="${i < selected ? 'is-selected' : ''}" aria-selected="${i < selected}">${multi ? `<td class="selection-cell">${mark(i < selected)}</td>` : ''}<td>${t(i === 0 ? c.d.row : ['Decisiones', 'Propuesta'][i - 1])}</td><td>${badge(i === 0 ? 'Pendiente' : 'Revisado')}</td><td>${t(i === 0 ? c.d.person : 'Diseño')}</td></tr>`).join('')}</tbody></table></div>`;
};
export const chart = () =>
  `<div class="chart" data-part="contenedor">${[34, 62, 46, 91, 55, 76].map((n) => `<i style="height:${n}%" data-part="barra"></i>`).join('')}</div>`;
const imageRegion = (c) =>
  `<div class="wf-img media-box media-region" data-part="medio">${is(c, 'loading') ? loading('Cargando imagen…') : is(c, 'error') ? fail('No se pudo cargar la imagen.') : ico('image')}</div>`;
export const card = (c, picture = false) =>
  `<div class="wf-card ${is(c, 'selected') ? 'is-selected' : ''}" ${is(c, 'selected') ? 'aria-selected="true"' : ''} data-part="contenedor">${picture ? imageRegion(c) : ''}<strong>${t(c.d.title)}</strong>${is(c, 'loading') ? (picture ? '' : loading('Cargando contenido…')) : is(c, 'empty') ? empty(c, 'contenido') : is(c, 'error') ? (picture ? '' : fail('No se pudo cargar el contenido de la tarjeta.')) : paragraph(c)}<div class="demo-row wrap">${badge('Borrador')}${btn('Ver detalle', '', '', is(c, 'loading') ? 'disabled' : 'default')}</div></div>`;
export const composer = (c) =>
  `<div class="composer" data-part="contenedor"><div class="composer-draft ${is(c, 'focus') ? 'is-focused' : ''}" role="textbox" aria-label="Mensaje" aria-multiline="true">${t(c.d.message)}</div><div class="demo-row">${act('paperclip')}<span class="grow"></span><span class="composer-send" aria-disabled="${is(c, 'disabled') || is(c, 'loading')}">${act('paper-plane-tilt', false, is(c, 'loading') ? 'loading' : is(c, 'disabled') ? 'disabled' : 'default', false, is(c, 'loading') ? 'Enviando mensaje' : 'Enviar mensaje')}</span></div>${is(c, 'error') ? '<small class="field-help">No se pudo enviar. El borrador se conserva; podés reintentar.</small>' : ''}</div>`;
const message = (c, own = false) =>
  `<div class="chat-line ${own ? 'own' : ''}">${own ? '' : avatar()}<div class="bubble ${own ? 'own' : ''}">${t(own ? 'Lo reviso y te comparto mis observaciones.' : c.d.message)}${own && is(c, 'error') ? '<small class="message-status">No enviado <span role="button" data-ui="retry">Reintentar</span></small>' : ''}</div></div>`;
export const chat = (c) =>
  `<div class="chat-window" data-part="contenedor"><div class="chat-header" data-part="contenedor">${avatar()}<div class="grow"><strong>${t(c.d.person)}</strong><small>${t('Conversación directa')}</small></div>${act('dots-three', false, 'default', false, 'Opciones de la conversación')}</div><div class="chat-history">${is(c, 'loading') ? loading('Cargando mensajes anteriores…') : ''}${is(c, 'empty') ? `<div class="chat-empty">${t('Todavía no hay mensajes')}${t('Escribí el primero para iniciar la conversación.')}</div>` : message(c) + message(c, true)}</div>${composer({ ...c, states: undefined, state: 'default' })}</div>`;
export const conversations = (c) =>
  `<div class="conversation-list"><strong>${t('Conversaciones')}</strong>${field('Buscar conversaciones', 'Buscar por nombre', 'magnifying-glass')}<div class="conversation-items">${(c.data === 'one' ? [c.d.person] : [c.d.person, 'Equipo de diseño', 'Jo']).map((name, i) => `<div class="conversation-row ${i === 0 ? 'is-selected' : ''}" role="link" ${i === 0 ? 'aria-current="page"' : ''}>${avatar()}<div class="grow"><strong>${t(name)}</strong><small>${t(i === 0 ? c.d.message : i === 1 ? 'Compartió una referencia' : 'Gracias, nos vemos mañana.')}</small></div></div>`).join('')}</div></div>`;
export const inspector = (c) =>
  `<div class="demo-inspector" data-part="contenedor"><div class="demo-row"><strong>${t('Propiedades')}</strong><span class="grow"></span>${act('dots-three')}</div>${tabs(['Diseño', 'Opciones'])}${is(c, 'empty') ? `<div class="wf-empty">${ico('sliders-horizontal')}${t('Seleccioná un elemento para ver sus propiedades')}</div>` : `<div class="property-section"><small>${t(is(c, 'disabled') ? 'Solo lectura' : 'Posición y tamaño')}</small><div class="property-grid">${field('X', '24', '', is(c, 'disabled') ? 'readonly' : 'default')}${field('Y', '32', '', is(c, 'disabled') ? 'readonly' : 'default')}${field('Ancho', '320', '', is(c, 'disabled') ? 'readonly' : 'default')}${field('Alto', '180', '', is(c, 'disabled') ? 'readonly' : 'default')}</div></div><div class="property-section">${t('Alineación')}<div class="demo-row">${['rows', 'squares-four', 'sliders-horizontal'].map((glyph) => act(glyph, false, is(c, 'disabled') ? 'disabled' : 'default')).join('')}</div></div><div class="property-section">${field('Radio de esquina', '8', '', is(c, 'disabled') ? 'readonly' : 'default')}${field('Relleno', '#FFFFFF', '', is(c, 'disabled') ? 'readonly' : 'default')}${field('Opacidad', '100 %', '', is(c, 'disabled') ? 'readonly' : 'default')}</div>`}</div>`;
export const carousel = (c) =>
  `<div class="carousel"><div class="carousel-slide">${is(c, 'empty') ? empty(c, 'imágenes') : imageRegion(c)}${!is(c, 'empty') ? `<span class="carousel-prev">${act('arrow-left', false, is(c, 'loading') ? 'disabled' : 'default')}</span><span class="carousel-next">${act('arrow-right', false, is(c, 'loading') ? 'disabled' : 'default')}</span>` : ''}</div>${is(c, 'empty') ? '' : `<div class="pagination-dots">${[0, 1, 2, 3].map((i) => `<i class="${i === 0 ? 'current' : ''}" data-part="punto"></i>`).join('')}</div>`}</div>`;
export const modal = (c) => {
  const type = ['confirm', 'info'].includes(c.variant) ? c.variant : 'form';
  const title =
    type === 'confirm'
      ? '¿Eliminar este proyecto?'
      : type === 'info'
        ? 'Acceso al proyecto'
        : 'Invitar al proyecto';
  const action =
    type === 'confirm' ? 'Eliminar proyecto' : type === 'info' ? 'Entendido' : 'Invitar';
  return `<div class="demo-backdrop" data-part="overlay"><div class="wf-modal" role="${type === 'confirm' ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-label="${title}" data-part="contenedor"><div class="wf-modal-header"><strong>${t(title)}</strong>${act('x')}</div><div class="wf-modal-body">${type === 'form' ? `${paragraph(c)}${field('Correo', c.d.email, '', is(c, 'error') ? 'error' : 'default', 'No se pudo enviar la invitación. Revisá el correo y reintentá.')}` : `<p>${t(type === 'confirm' ? 'Se eliminarán el proyecto y sus archivos. Esta acción no se puede deshacer.' : 'Tu equipo puede consultar los materiales compartidos. Solo los editores pueden modificarlos.')}</p>${is(c, 'error') ? '<small class="field-help">No se pudo eliminar el proyecto. Sigue disponible; podés reintentar.</small>' : ''}`}</div><div class="wf-modal-footer">${type === 'info' ? '' : btn('Cancelar')}${btn(action, 'primary', type === 'confirm' ? 'trash' : '', is(c, 'loading') ? 'loading' : 'default', type === 'confirm' ? 'destructive' : 'normal')}</div></div></div>`;
};
export const screen = (name, body) =>
  `<div class="mini-screen" data-part="marco"><div class="screen-title">${t(name)}</div>${body}</div>`;
const menuOptions = (c, context = false) =>
  `<div class="choice-list ${context ? 'context-demo' : ''}" role="menu">${(context ? ['Duplicar', 'Copiar enlace', 'Eliminar'] : ['Renombrar', 'Duplicar', 'Eliminar']).map((v, i) => `<div role="menuitem" class="${is(c, 'focus') && i === 1 ? 'is-focused' : ''} ${is(c, 'disabled') && i === 2 ? 'is-disabled' : ''}" aria-disabled="${is(c, 'disabled') && i === 2}">${context ? ico(['copy', 'link', 'trash'][i]) : ''}${t(v)}${context ? `<kbd>${['Ctrl D', 'Ctrl Shift C', 'Supr'][i]}</kbd>` : ''}</div>`).join('')}</div>`;
const personOptions = (c) =>
  '<div class="choice-list" role="listbox">' +
  (c.data === 'one' ? [c.d.person] : [c.d.person, 'Gabriel López', 'Equipo de diseño'])
    .map(
      (name, i) =>
        '<div role="option" aria-selected="' +
        (i === 0) +
        '" class="' +
        (is(c, 'focus') && i === (c.data === 'one' ? 0 : 1) ? 'is-focused' : '') +
        '">' +
        t(name) +
        '</div>',
    )
    .join('') +
  '</div>';
const progress = (percent = 60, indeterminate = false) =>
  `<div class="progress-region" data-part="pista y avance" role="progressbar" data-ui="progress" ${indeterminate ? 'aria-label="Operación en curso"' : `aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"`}><div class="demo-track ${indeterminate ? 'indeterminate' : ''}"><i style="width:${indeterminate ? 35 : percent}%"></i></div>${indeterminate ? '' : `<span>${percent} %</span>`}</div>`;
const gallery = (c) =>
  `<div class="gallery-region">${is(c, 'empty') ? empty(c, 'imágenes') : is(c, 'error') ? fail('No se pudieron cargar las imágenes.') : is(c, 'loading') ? `<div class="gallery-grid"><div class="media-box">${loading('Cargando imágenes…')}</div><div class="media-box" aria-hidden="true"></div></div>` : `<div class="gallery-grid">${Array.from({ length: c.data === 'one' ? 1 : 4 }, (_, i) => `<div class="${is(c, 'selected') && i === (c.data === 'one' ? 0 : 1) ? 'is-selected' : ''}" ${is(c, 'selected') && i === (c.data === 'one' ? 0 : 1) ? 'aria-selected="true"' : ''}>${media()}</div>`).join('')}</div>`}</div>`;
const notice = (c, type) => {
  const tone = c.variant ?? 'info';
  const glyph =
    tone === 'error' || tone === 'warning'
      ? 'warning-circle'
      : tone === 'success'
        ? 'check-circle'
        : 'info';
  const action = c.options?.action ?? 'none';
  const title =
    action === 'undo'
      ? 'Material archivado'
      : action === 'retry'
        ? 'No se pudo guardar el cambio'
        : {
            info: 'Información del proyecto',
            success: 'Cambios guardados',
            warning: 'Hay cambios pendientes',
            error: 'No se pudo guardar el cambio',
          }[tone];
  return `<div class="${type === 'alert' ? 'wf-alert' : type === 'toast' ? 'toast-demo' : 'banner-demo'}" data-tone="${tone}">${ico(glyph)}<div class="grow"><strong>${t(title)}</strong>${type === 'alert' ? t(action === 'undo' ? 'Podés recuperar el material con Deshacer.' : { info: 'Revisá los detalles antes de compartir.', success: 'El proyecto ya contiene la nueva versión.', warning: 'Guardá los cambios antes de continuar.', error: 'Tu trabajo sigue disponible. Reintentá guardar.' }[tone]) : ''}</div>${action !== 'none' ? `<span data-ui="notice-action">${btn(action === 'undo' ? 'Deshacer' : 'Reintentar', 'text-only')}</span>` : ''}${act('x')}</div>`;
};
const tree = (c) =>
  `<div class="tree-demo"><div>${ico('caret-down')}${ico('folder')}${t(c.d.title)}</div><div class="indent tree-children">${is(c, 'loading') ? loading('Cargando carpeta…') : is(c, 'empty') ? empty(c, 'archivos') : `<div class="${is(c, 'selected') ? 'is-selected' : ''}" ${is(c, 'selected') ? 'aria-selected="true"' : ''}>${ico('file')}${t(c.d.file)}</div><div>${ico('folder')}${t('Referencias')}</div>`}</div></div>`;
const steps = (c) =>
  `<div class="steps">${['Cuenta', 'Perfil', 'Confirmar']
    .map((v, i) => {
      const complete = is(c, 'success') || i < (c.stepIndex ?? 1);
      const current = !is(c, 'success') && i === (c.stepIndex ?? 1);
      return `<div class="${current && is(c, 'error') ? 'step-error' : ''}"><span class="${complete ? 'is-complete' : current ? 'is-current' : ''}" ${current ? 'aria-current="step"' : ''}>${complete ? ico('check') : current && is(c, 'error') ? ico('warning-circle') : i + 1}</span>${t(v)}</div>`;
    })
    .join(
      '',
    )}</div>${is(c, 'error') ? '<small class="field-help">Corregí los datos de Perfil para continuar.</small>' : ''}`;
const skeletonView = (c) =>
  `<div class="loading-skeleton" role="status" aria-label="Contenido en carga" data-part="carga">${c.variant === 'card' ? '<div class="skeleton-media"></div>' : '<div class="skeleton-avatar"></div>'}<div class="skeleton-lines"><i></i><i></i><i></i></div></div>`;
const metric = (c) =>
  `<div class="stat-demo"><strong class="metric-value">${is(c, 'loading') ? spinner() : is(c, 'empty') ? '—' : is(c, 'error') ? '—' : t(c.d.amount)}</strong>${t('Referencias organizadas')}${is(c, 'error') ? fail('No se pudo recuperar el indicador.') : is(c, 'loading') ? '<small>Cargando indicador…</small>' : is(c, 'empty') ? '<small>Sin datos disponibles</small>' : `<small>${t('+12 esta semana')}</small>`}</div>`;
const chartView = (c) =>
  `<div class="chart-demo"><strong>${t('Actividad semanal')}</strong><div class="plot-region" data-ui="plot">${is(c, 'loading') ? loading('Cargando datos…') : is(c, 'empty') ? empty(c, 'datos') : is(c, 'error') ? fail('No se pudieron cargar los datos del gráfico.') : chart()}</div><div class="demo-row">${['L', 'M', 'M', 'J', 'V', 'S'].map((v) => `<span>${v}</span>`).join('')}</div></div>`;
const timeline = (c) =>
  `<div class="timeline-panel"><strong>${t('Actividad del proyecto')}</strong><div class="timeline-demo">${is(c, 'loading') ? loading('Cargando actividad…') : is(c, 'empty') ? empty(c, 'actividad') : is(c, 'error') ? fail('No se pudo recuperar la actividad.') : (c.data === 'one' ? [c.d.message] : [c.d.message, 'Propuesta revisada', 'Material incorporado']).map((v) => `<div><i data-part="punto"></i><div>${t(v)}<small>${t('Hace unos minutos')}</small></div></div>`).join('')}</div></div>`;
export function calendar(c) {
  const range = c.variant === 'range';
  const selected = is(c, 'selected');
  // Noviembre de 2026 comienza en domingo. La grilla incluye las seis semanas del mes.
  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - 5;
    const current = day >= 1 && day <= 30;
    const display = day < 1 ? 31 + day : day > 30 ? day - 30 : day;
    const chosen = selected && current && (range ? day >= 10 && day <= 15 : day === 10);
    return `<span role="gridcell" data-date="2026-${current ? '11' : day < 1 ? '10' : '12'}-${String(display).padStart(2, '0')}" aria-selected="${chosen}" class="${current ? '' : 'outside-month'} ${chosen ? 'is-selected' : ''} ${chosen && range ? `range-day ${day === 10 ? 'range-start' : day === 15 ? 'range-end' : ''}` : ''}">${display}</span>`;
  });
  const weeks = Array.from(
    { length: 6 },
    (_, i) => `<div role="row">${days.slice(i * 7, i * 7 + 7).join('')}</div>`,
  ).join('');
  return `<div class="calendar-panel" data-part="contenedor"><div class="calendar-heading"><span role="button" aria-label="Mes anterior">${ico('arrow-left')}</span><strong data-ui="month">Noviembre 2026</strong><span role="button" aria-label="Mes siguiente">${ico('arrow-right')}</span></div><div class="calendar-scroll" data-part="recorte"><div class="month-grid" role="grid" aria-label="Noviembre 2026"><div role="row">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => `<span role="columnheader">${d}</span>`).join('')}</div>${weeks}</div></div><small>${selected ? (range ? 'Del 10 al 15 de noviembre' : '10 de noviembre') : 'Elegí una fecha'}</small></div>`;
}
const datePicker = (c) =>
  `<div class="date-demo">${field(c.variant === 'range' ? 'Desde — hasta' : 'Fecha', is(c, 'error') ? '32/11/2026' : is(c, 'selected') ? (c.variant === 'range' ? '10/11/2026 — 15/11/2026' : '10/11/2026') : 'Elegí una fecha', 'calendar-blank', controlState(c), 'Elegí una fecha válida del calendario.')}${(is(c, 'open') || is(c, 'selected')) && !is(c, 'disabled') && !is(c, 'readonly') ? calendar(c) : ''}</div>`;
const timePicker = (c) =>
  `<div class="time-picker">${c.variant === 'dial' ? `<div class="clock-dial" data-part="pista"><span class="clock-center"></span><i class="clock-hand"></i>${Array.from({ length: 12 }, (_, i) => `<span style="--angle:${i * 30}deg" class="clock-number ${i === 10 ? 'is-selected' : ''}"><b>${i === 0 ? 12 : i}</b></span>`).join('')}</div>` : ''}<div class="time-fields">${field('Hora', is(c, 'error') ? '25' : '10', '', controlState(c), c.variant === 'dial' ? 'Usá una hora entre 1 y 12.' : 'Usá una hora entre 00 y 23.')}<span>:</span>${field(
    'Minutos',
    '30',
    '',
    (c.states ?? [c.state]).filter((s) => !['error', 'focus'].includes(s)),
  )}</div>${c.variant === 'dial' ? (is(c, 'readonly') ? '<span>AM</span>' : `<div class="segmented-demo" role="radiogroup" aria-label="Periodo del día">${['AM', 'PM'].map((period, i) => `<span role="radio" aria-checked="${i === 0}" aria-disabled="${is(c, 'disabled')}" class="${i === 0 ? 'is-active' : ''} ${is(c, 'disabled') ? 'is-disabled' : ''}">${period}</span>`).join('')}</div>`) : ''}<small>Formato de ${c.variant === 'dial' ? 12 : 24} horas</small></div>`;
export const bottomNav = (c) =>
  `<div class="bottom-navigation" role="navigation" aria-label="Secciones principales" data-part="contenedor">${['Inicio', 'Explorar', 'Perfil'].map((name, i) => `<span role="link" aria-label="${name}" ${i === 0 ? 'aria-current="page"' : ''} aria-disabled="${i === 2 && is(c, 'disabled')}" class="${i === 0 ? 'is-current' : ''} ${i === 1 && is(c, 'focus') ? 'is-focused' : ''} ${i === 2 && is(c, 'disabled') ? 'is-disabled' : ''}">${ico(['squares-four', 'magnifying-glass', 'user'][i])}${t(name)}</span>`).join('')}</div>`;
const bottomSheet = (c) =>
  `<div class="sheet-scene"><div class="sheet-background">${paragraph(c)}</div>${is(c, 'closed') ? btn('Ver opciones') : `${c.variant === 'modal' ? '<div class="sheet-shade" data-part="overlay"></div>' : ''}<div class="bottom-sheet" role="dialog" aria-modal="${c.variant === 'modal'}" aria-label="Opciones del material" data-part="contenedor"><i class="sheet-grabber" data-part="tirador"></i><div class="demo-row"><strong class="grow">${t('Opciones del material')}</strong>${act('x')}</div>${is(c, 'loading') ? loading('Cargando opciones…') : is(c, 'error') ? fail('No se pudieron cargar las opciones del material.') : `<div class="choice-list">${['Compartir enlace', 'Guardar una copia'].map((v, i) => `<div role="button">${ico(i ? 'copy' : 'link')}${t(v)}</div>`).join('')}</div>`}</div>`}</div>`;
export const chip = (c) => {
  const type = c.variant ?? 'filter';
  const selected = type === 'filter' && is(c, 'selected');
  const disabled = is(c, 'disabled') || is(c, 'readonly');
  const label =
    c.label ??
    {
      assist: 'Añadir al calendario',
      filter: 'Pendientes',
      input: c.d.person,
      suggestion: 'Gracias, lo reviso',
    }[type];
  return `<span class="chip-demo ${modifiers(controlState(c))} ${selected ? 'is-selected' : ''}" data-chip="${type}" data-part="contenedor" ${type !== 'input' ? `role="button" aria-disabled="${disabled}"` : ''} ${type === 'filter' ? `aria-pressed="${selected}"` : ''}>${selected ? ico('check') : type === 'assist' ? ico('calendar-blank') : ''}${t(label)}${type === 'input' ? `<span class="chip-remove" role="button" aria-label="Quitar ${esc(label)}" aria-disabled="${disabled}">${ico('x')}</span>` : ''}</span>`;
};
const slider = (c) => {
  const range = c.variant === 'range';
  return `<div class="slider-demo"><div class="demo-row">${t(range ? 'Intervalo de precio' : 'Opacidad')}<span class="grow"></span><strong>${range ? '20–80' : '60 %'}</strong></div><div class="demo-track ${range ? 'range-track' : ''}"><i></i>${(range ? [20, 80] : [60]).map((value, i) => `<b style="left:${value}%" class="${i === 0 ? modifiers(controlState(c)) : is(c, 'disabled') ? 'is-disabled' : ''} ${is(c, 'active') && i === 0 ? 'is-dragging' : ''}" role="slider" aria-label="${range ? (i === 0 ? 'Mínimo' : 'Máximo') : 'Opacidad'}" aria-valuemin="${range && i === 1 ? 20 : 0}" aria-valuemax="${range && i === 0 ? 80 : 100}" aria-valuenow="${value}" aria-disabled="${is(c, 'disabled')}" data-part="control"></b>`).join('')}</div></div>`;
};
export const components = {
  'text-bars': () => textPlaceholder(),
  image: imageRegion,
  button: (c) =>
    btn(
      c.options?.action === 'destructive'
        ? 'Eliminar'
        : c.options?.action === 'toggle'
          ? 'Favorito'
          : 'Continuar',
      c.variant === 'primary' ? 'primary' : c.variant === 'text' ? 'text-only' : '',
      c.options?.action === 'destructive' ? 'trash' : '',
      controlState(c),
      c.options?.action,
    ),
  'icon-button': (c) =>
    `<div class="icon-button-demo ${c.variant === 'round' ? 'round' : ''}" data-action="${c.options?.action ?? 'normal'}">${act(c.options?.action === 'destructive' ? 'trash' : c.options?.action === 'toggle' ? 'bell' : 'plus', is(c, 'selected'), controlState(c), c.options?.action === 'toggle')}</div>`,
  'button-group': (c) =>
    `<div class="segmented-demo">${['Día', 'Semana', 'Mes'].map((v, i) => `<span role="radio" aria-checked="${i === 0}" aria-disabled="${i === 1 && is(c, 'disabled')}" class="${i === 0 ? 'is-active' : ''} ${i === 1 ? modifiers(controlState(c)) : ''}">${t(v)}</span>`).join('')}</div>`,
  'text-field': (c) =>
    field(
      c.variant === 'prefix'
        ? 'Sitio web'
        : c.variant === 'suffix'
          ? 'Distancia'
          : c.variant === 'both'
            ? 'Presupuesto'
            : 'Correo electrónico',
      c.variant === 'prefix'
        ? 'ejemplo.com'
        : c.variant === 'suffix'
          ? '24'
          : c.variant === 'both'
            ? '1.200'
            : c.d.email,
      c.variant === 'plain' ? 'user' : '',
      controlState(c),
      undefined,
      {
        prefix: c.variant === 'prefix' ? 'https://' : c.variant === 'both' ? '$' : '',
        suffix: c.variant === 'suffix' ? 'km' : c.variant === 'both' ? '/ mes' : '',
      },
    ),
  password: (c) => field('Contraseña', '••••••••••', 'eye', controlState(c)),
  textarea: (c) =>
    `<div class="wf-field"><div class="wf-label">${t('Descripción')}</div><div class="demo-textarea ${modifiers(controlState(c))} ${is(c, 'error') ? 'is-error' : ''}" role="textbox" aria-readonly="${is(c, 'readonly')}" aria-invalid="${is(c, 'error')}" aria-disabled="${is(c, 'disabled')}">${is(c, 'empty') ? t('Escribí una descripción…') : paragraph(c)}<small>${is(c, 'empty') ? 0 : c.d.message.length} / 500</small></div>${is(c, 'error') ? '<small class="field-help">La descripción necesita una revisión.</small>' : ''}</div>`,
  search: (c) =>
    `${field(
      'Buscar',
      c.d.row,
      'magnifying-glass',
      (c.states ?? [c.state]).filter((s) => s !== 'error'),
    )}${is(c, 'error') ? '<small class="field-help">No se pudo realizar la búsqueda. <span data-ui="retry">Reintentar</span></small>' : ''}`,
  select: (c) =>
    `<div class="selection-demo">${field('Equipo', c.d.person, 'caret-down', controlState(c))}${is(c, 'open') ? personOptions(c) : ''}</div>`,
  combobox: (c) =>
    `<div class="selection-demo">${field('Asignar a', c.d.person, 'magnifying-glass')}<div class="options-region">${is(c, 'loading') ? loading('Buscando personas…') : is(c, 'empty') ? empty(c, 'coincidencias') : is(c, 'error') ? fail('No se pudieron cargar las opciones.') : personOptions(c)}</div></div>`,
  checkbox: (c) =>
    `<div class="demo-row">${mark(is(c, 'selected'), is(c, 'partial'), controlState(c))}${t('Recordar mi elección')}</div>`,
  radio: (c) =>
    `<div class="demo-row"><span class="radio-mark ${is(c, 'selected') ? 'selected' : ''} ${modifiers(controlState(c))}" role="radio" aria-checked="${is(c, 'selected')}" aria-disabled="${is(c, 'disabled')}" data-part="marca"></span>${t('Opción seleccionable')}</div>`,
  switch: (c) =>
    `<div class="demo-row">${toggle(is(c, 'selected'), controlState(c))}${t('Permitir notificaciones')}</div>`,
  slider,
  stepper: (c) =>
    `<div class="number-stepper ${modifiers(controlState(c))} ${is(c, 'error') ? 'is-error' : ''}" role="spinbutton" aria-readonly="${is(c, 'readonly')}" aria-valuenow="${is(c, 'error') ? -1 : 24}" aria-invalid="${is(c, 'error')}" aria-disabled="${is(c, 'disabled')}">${is(c, 'readonly') ? '' : act('minus', false, is(c, 'disabled') ? 'disabled' : 'default')}<span data-part="texto">${is(c, 'error') ? -1 : 24}</span>${is(c, 'readonly') ? '' : act('plus', false, is(c, 'disabled') ? 'disabled' : 'default')}</div>${is(c, 'error') ? '<small class="field-help">Ingresá un número mayor o igual a cero.</small>' : ''}`,
  date: datePicker,
  time: timePicker,
  chip,
  'bottom-nav': bottomNav,
  'bottom-sheet': bottomSheet,
  upload: (c) =>
    `<div class="upload-zone ${modifiers(controlState(c))}" data-part="contenedor">${ico(is(c, 'success') ? 'check-circle' : 'file')}${t(['loading', 'success', 'error'].includes(c.state) ? c.d.file : 'Arrastrá un archivo o elegilo')}${is(c, 'loading') ? progress(60) : is(c, 'error') ? fail('No se pudo incorporar este archivo.') : is(c, 'success') ? '<small>Archivo incorporado</small>' : ''}</div>`,
  'chips-input': (c) =>
    `<div class="chips-input ${modifiers(controlState(c))}" role="combobox" aria-expanded="false" aria-readonly="${is(c, 'readonly')}" aria-disabled="${is(c, 'disabled')}">${is(c, 'empty') ? t('Elegir elementos…') : chip({ ...c, variant: 'input', label: 'Diseño' }) + chip({ ...c, variant: 'input', label: 'Arquitectura' }) + t(c.d.row)}</div>`,
  toolbar: (c) =>
    `<div class="demo-toolbar tools-${c.variant}" data-part="contenedor">${act('arrow-left')}${act('pencil-simple', is(c, 'active'), is(c, 'focus') ? 'focus' : 'default', true)}${act('rows')}<i class="toolbar-separator"></i>${act('copy', false, is(c, 'disabled') ? 'disabled' : 'default')}${act('link')}${act('dots-three')}</div>`,
  menubar: (c) =>
    `<div class="menu-bar-scene"><div class="demo-toolbar"><span class="menu-trigger ${is(c, 'focus') ? 'is-focused' : ''} ${is(c, 'open') ? 'is-open' : ''}" role="menuitem" aria-expanded="${is(c, 'open')}">${t('Archivo')}</span>${['Editar', 'Ver', 'Ayuda'].map((v) => t(v)).join('')}</div>${is(c, 'open') ? `<div class="menu-bar-options choice-list"><div>${t('Nuevo documento')}</div><div>${t('Guardar')}</div><div>${t('Exportar')}</div></div>` : ''}</div>`,
  dropdown: (c) =>
    `<div class="selection-demo">${btn('Opciones', '', 'caret-down')}${!is(c, 'default') ? menuOptions(c) : ''}</div>`,
  'context-menu': (c) => menuOptions(c, true),
  sidebar: (c) => sidebar(c, c.variant === 'rail'),
  drawer: (c) =>
    `<div class="drawer-scene ${c.variant === 'nonmodal' ? 'nonmodal' : ''}"><div class="drawer-background">${paragraph(c)}</div>${is(c, 'closed') ? btn('Abrir panel', '', 'sidebar-simple') : `${c.variant === 'nonmodal' ? '' : '<div class="drawer-shade" data-part="overlay"></div>'}<div class="drawer-panel" role="dialog" aria-label="Materiales" aria-modal="${c.variant !== 'nonmodal'}"><div class="drawer-title demo-row"><strong>${t('Materiales')}</strong><span class="grow"></span>${act('x')}</div><div class="drawer-content">${is(c, 'loading') ? loading('Cargando materiales…') : is(c, 'empty') ? empty(c) : is(c, 'error') ? fail('No se pudieron cargar los materiales.') : list({ ...c, states: undefined, state: 'default' }, 2)}</div></div>`}</div>`,
  tabs: (c) => tabs(undefined, 0, c),
  pagination: (c) =>
    `<div class="pagination">${act('arrow-left')}<span class="${is(c, 'disabled') ? '' : 'is-active'}" aria-current="${is(c, 'disabled') ? 'false' : 'page'}">2</span><span>3</span><span>…</span><span class="${is(c, 'disabled') ? 'is-active' : ''}" aria-current="${is(c, 'disabled') ? 'page' : 'false'}">12</span>${act('arrow-right', false, is(c, 'disabled') ? 'disabled' : is(c, 'focus') ? 'focus' : 'default')}</div>`,
  steps,
  tree,
  card: (c) => card(c),
  'media-card': (c) => card(c, true),
  list,
  table,
  'data-grid': (c) =>
    `<div class="data-grid-demo">${c.embedded ? '' : toolbar(c, 'Materiales')}${tabs(['Todo', 'Pendientes'])}${table(c)}<div class="table-footer">${t(is(c, 'loading') ? 'Recuento pendiente' : is(c, 'empty') ? '0 registros' : c.d.count + (c.data === 'one' ? ' registro' : ' registros'))}${act('arrow-right', false, ['loading', 'empty'].includes(c.state) ? 'disabled' : 'default')}</div></div>`,
  identity: (c) =>
    `<div class="person-row"><span class="wf-avatar ${c.variant === 'online' ? 'has-presence' : ''}" data-part="máscara">${is(c, 'loading') ? spinner() : ico('user')}</span><div class="grow">${t(c.d.person)}<small>${t(c.d.email)}</small></div></div>`,
  tags: (c) =>
    `<div class="demo-row wrap">${['Borrador', 'Prioridad alta', 'Diseño', 'Compartido'].map((v, i) => `<span class="wf-badge ${i === 1 && is(c, 'selected') ? 'is-selected' : ''} ${i === 1 && is(c, 'disabled') ? 'is-disabled' : ''}">${t(v)}</span>`).join('')}</div>`,
  carousel,
  gallery,
  'video-player': (c) =>
    `<div class="video-demo"><div class="wf-img media-region" data-part="medio">${is(c, 'loading') ? loading('Cargando video…') : is(c, 'error') ? fail('No se pudo cargar el video.') : ico(is(c, 'active') ? 'image' : 'play')}</div><div class="demo-toolbar">${is(c, 'active') ? '<span class="icon-action" data-ui="pause" role="button" aria-label="Pausar">Ⅱ</span>' : act('play', false, is(c, 'loading') || is(c, 'error') ? 'disabled' : 'default')}<div class="demo-track grow"><i></i></div><span>0:35</span>${act('dots-three')}</div></div>`,
  progress: (c) =>
    `<div class="progress-sample"><span>${is(c, 'success') ? 'Importación completada' : is(c, 'error') ? 'Importación interrumpida' : 'Importando archivos…'}</span>${progress(is(c, 'success') ? 100 : 60, c.variant === 'indeterminate' && !is(c, 'success'))}${is(c, 'error') ? fail('No se pudieron incorporar todos los archivos. El avance se conserva.') : ''}</div>`,
  stat: metric,
  chart: chartView,
  timeline,
  alert: (c) => notice(c, 'alert'),
  toast: (c) => notice(c, 'toast'),
  banner: (c) => notice(c, 'banner'),
  dialog: modal,
  popover: (c) =>
    `<div class="popover-scene">${btn('Compartir', '', 'link')}${!is(c, 'default') ? `<div class="popover-panel">${field('Invitar a', c.d.email, '', is(c, 'error') ? 'error' : 'default')}${btn('Compartir', 'primary')}</div>` : ''}</div>`,
  skeleton: skeletonView,
  'field-help': (c) =>
    `<div class="field-help">${ico(c.variant === 'error' ? 'warning-circle' : c.variant === 'success' ? 'check-circle' : 'info')}<span>${c.variant === 'error' ? 'Ingresá una dirección de correo válida.' : c.variant === 'success' ? 'El dato es correcto.' : 'Usá una dirección de correo de tu equipo.'}</span></div>`,
  message: (c) =>
    `<div class="chat-line">${avatar()}<div class="bubble">${t(c.d.message)}<small class="message-status">${is(c, 'loading') ? spinner() + ' Enviando…' : is(c, 'error') ? 'No enviado <span role="button" data-ui="retry">Reintentar</span>' : 'Enviado · 11:42'}</small></div></div>`,
  chat,
  composer,
  inspector,
  'command-palette': (c) =>
    `<div class="command-demo">${field('Buscar acciones', is(c, 'empty') ? 'Exportar plano orbital' : 'Buscar una acción…', 'magnifying-glass')}<small>${t('Acciones disponibles')}</small><div class="choice-list">${is(c, 'empty') ? empty(c, 'coincidencias') : ['Crear documento', 'Incorporar material', 'Abrir configuración'].map((v, i) => `<div class="${is(c, 'focus') && i === 1 ? 'is-focused' : ''}">${ico(['file', 'plus', 'gear-six'][i])}${t(v)}<kbd>↵</kbd></div>`).join('')}</div></div>`,
  'file-browser': (c) =>
    `<div class="split-demo">${sidebar({ ...c, states: undefined, state: 'default' }, true)}<div class="grow stack">${toolbar(c, 'Archivos')}${table(c)}</div></div>`,
  'filter-panel': (c) =>
    `<div class="filter-demo">${field('Estado', c.variant === 'applied' ? 'Pendientes' : 'Todos', 'caret-down')}${field('Equipo', c.variant === 'applied' ? c.d.person : 'Todos los equipos', 'caret-down')}<div class="demo-row">${mark(c.variant === 'applied')}${t('Solo pendientes')}</div>${c.variant === 'applied' ? badge('2 filtros aplicados') : ''}<div class="demo-row wrap">${btn('Limpiar', '', '', c.variant === 'applied' ? 'default' : 'disabled')}${btn('Aplicar filtros', 'primary', '', is(c, 'disabled') ? 'disabled' : 'default')}</div></div>`,
  accordion: (c) =>
    `<div class="accordion-demo">${['Apariencia', 'Posición', 'Contenido'].map((v, i) => `<div><div class="demo-row ${i === 2 && is(c, 'disabled') ? 'is-disabled' : ''}" aria-expanded="${i === 0 && !is(c, 'closed')}" aria-disabled="${i === 2 && is(c, 'disabled')}">${t(v)}<span class="grow"></span>${ico('caret-down')}</div>${i === 0 && !is(c, 'closed') ? `<div class="accordion-body">${field('Relleno', '#FFFFFF')}${field('Opacidad', '100 %')}</div>` : ''}</div>`).join('')}</div>`,
};
