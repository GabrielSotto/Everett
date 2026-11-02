// Representaciones estáticas: los controles dibujados permanecen dentro de una muestra inert.
export const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const t = (v, cls = '') => `<span class="label ${cls}" data-part="texto">${esc(v)}</span>`;
export const ico = (n) =>
  `<img class="icon" data-part="símbolo" src="/design/wireframe-library/vendor/${n}.svg" alt="">`;
const modifiers = (s) =>
  ({ hover: 'is-hovered', focus: 'is-focused', pressed: 'is-pressed', disabled: 'is-disabled' })[
    s
  ] ?? '';
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
export const btn = (v = 'Continuar', variant = '', glyph = '', state = 'default') =>
  `<div class="wf-btn interactive-part ${variant} ${modifiers(state)} ${state === 'loading' ? 'is-busy' : ''}" role="button" aria-disabled="${state === 'disabled' || state === 'loading'}" ${state === 'loading' ? 'aria-busy="true"' : ''} data-part="fondo">${state === 'loading' ? spinner() : glyph ? ico(glyph) : ''}${t(state === 'loading' ? 'Procesando…' : v)}</div>`;
export const act = (glyph, selected = false, state = 'default', toggleable = selected) =>
  `<span class="icon-action interactive-part ${selected ? 'is-active' : ''} ${modifiers(state)}" role="button" aria-label="${esc(glyph)}" aria-disabled="${state === 'disabled'}" ${toggleable ? `aria-pressed="${selected}"` : ''} data-part="fondo">${ico(glyph)}</span>`;
export const badge = (v) => `<span class="wf-badge" data-part="fondo">${t(v)}</span>`;
export const field = (name, value, glyph = '', state = 'default', help) =>
  `<div class="wf-field"><div class="wf-label">${t(name)}</div><div class="wf-input interactive-part ${modifiers(state)} ${state === 'error' ? 'is-error' : ''}" role="textbox" aria-disabled="${state === 'disabled'}" aria-invalid="${state === 'error'}" ${state === 'loading' ? 'aria-busy="true"' : ''} data-part="contenedor">${t(state === 'empty' ? 'Escribí acá…' : value)}${state === 'loading' ? spinner() : glyph ? ico(glyph) : ''}</div>${state === 'error' || state === 'success' ? `<small class="field-help">${ico(state === 'error' ? 'warning-circle' : 'check-circle')}<span>${esc(help ?? (state === 'error' ? 'Revisá este campo' : 'Dato válido'))}</span></small>` : ''}</div>`;
export const media = (video = false) =>
  `<div class="wf-img media-box" data-part="medio">${ico(video ? 'play' : 'image')}</div>`;
export const mark = (selected = false, partial = false, state = 'default') =>
  `<span class="check-mark ${selected ? 'checked' : ''} ${modifiers(state)}" role="checkbox" aria-checked="${partial ? 'mixed' : selected}" aria-disabled="${state === 'disabled'}" data-part="marca">${partial ? '−' : selected ? ico('check') : ''}</span>`;
export const toggle = (selected, state = 'default') =>
  `<span class="switch-demo ${selected ? 'on' : ''} ${modifiers(state)}" role="switch" aria-checked="${selected}" aria-disabled="${state === 'disabled'}" data-part="pista"><i data-part="control"></i></span>`;
export const row = (c, name = c.d.person, selected = false) =>
  `<div class="person-row ${selected ? 'is-selected' : ''}" ${selected ? 'aria-selected="true"' : ''}>${avatar()}<div class="grow">${t(name)}<small>${t(c.d.email)}</small></div>${act('dots-three')}</div>`;
export const empty = (c, noun = 'materiales') =>
  `<div class="wf-empty" data-ui="empty">${ico('folder')}<strong>${t('No hay ' + noun)}</strong>${t('Agregá el primero para comenzar')}</div>`;
export const list = (c, count = 3) =>
  `<div class="demo-list">${c.state === 'loading' ? loading('Cargando elementos…') : c.state === 'empty' ? empty(c, 'elementos') : c.state === 'error' ? fail('No se pudieron cargar los elementos.') : Array.from({ length: c.data === 'one' ? 1 : count }, (_, i) => row(c, i === 0 ? c.d.person : ['Gabriel López', 'Equipo de diseño'][i % 2], c.state === 'selected' && i === 0)).join('')}</div>`;
export const toolbar = (c, compact = false) =>
  `<div class="demo-toolbar" data-part="contenedor">${act('arrow-left')}<div class="grow">${t(compact ? 'Documento' : c.d.title)}</div>${act('magnifying-glass')}${act('dots-three')}</div>`;
export const sidebar = (c, compact = false) =>
  `<div class="demo-sidebar" data-part="contenedor">${['Resumen', 'Materiales', 'Actividad', 'Equipo'].map((v, i) => `<div class="nav-row ${i === 0 ? 'is-active' : ''} ${i === 1 && c.state === 'focus' ? 'is-focused' : ''} ${i === 3 && c.state === 'disabled' ? 'is-disabled' : ''}" role="link" ${i === 0 ? 'aria-current="page"' : ''} aria-disabled="${i === 3 && c.state === 'disabled'}">${ico(['squares-four', 'folder', 'bell', 'user'][i])}${compact ? '' : t(v)}</div>`).join('')}</div>`;
export const tabs = (names = ['Resumen', 'Actividad', 'Equipo'], selected = 0, c = {}) =>
  `<div class="demo-tabs ${c.variant === 'contained' ? 'contained' : ''}" role="tablist">${names.map((v, i) => `<span class="${i === selected ? 'is-active' : ''} ${i === 1 && c.state === 'focus' ? 'is-focused' : ''} ${i === 2 && c.state === 'disabled' ? 'is-disabled' : ''}" role="tab" aria-selected="${i === selected}" aria-disabled="${i === 2 && c.state === 'disabled'}">${t(v)}</span>`).join('')}</div>`;
export const table = (c) =>
  `<div class="table-region" data-part="recorte"><table class="wf-table" ${c.state === 'loading' ? 'aria-busy="true"' : ''}><thead><tr><th>${t('Nombre')}</th><th>${t('Estado')}</th><th>${t('Equipo')}</th></tr></thead><tbody>${['loading', 'empty', 'error'].includes(c.state) ? `<tr><td colspan="3" class="table-state">${c.state === 'loading' ? loading('Cargando filas…') : c.state === 'empty' ? empty(c, 'resultados') : fail('No se pudieron cargar los datos de la tabla.')}</td></tr>` : Array.from({ length: c.data === 'one' ? 1 : 3 }, (_, i) => `<tr class="${c.state === 'selected' && i === 0 ? 'is-selected' : ''}" ${c.state === 'selected' && i === 0 ? 'aria-selected="true"' : ''}><td>${t(i === 0 ? c.d.row : ['Decisiones', 'Propuesta'][i - 1])}</td><td>${badge(i === 0 ? 'Pendiente' : 'Revisado')}</td><td>${t(i === 0 ? c.d.person : 'Diseño')}</td></tr>`).join('')}</tbody></table></div>`;
export const chart = () =>
  `<div class="chart" data-part="contenedor">${[34, 62, 46, 91, 55, 76].map((n) => `<i style="height:${n}%" data-part="barra"></i>`).join('')}</div>`;
const imageRegion = (c) =>
  `<div class="wf-img media-box media-region" data-part="medio">${c.state === 'loading' ? loading('Cargando imagen…') : c.state === 'error' ? fail('No se pudo cargar la imagen.') : ico('image')}</div>`;
export const card = (c, picture = false) =>
  `<div class="wf-card ${c.state === 'selected' ? 'is-selected' : ''}" ${c.state === 'selected' ? 'aria-selected="true"' : ''} data-part="contenedor">${picture ? imageRegion(c) : ''}<strong>${t(c.d.title)}</strong>${c.state === 'loading' ? (picture ? '' : loading('Cargando contenido…')) : c.state === 'empty' ? empty(c, 'contenido') : c.state === 'error' ? (picture ? '' : fail('No se pudo cargar el contenido de la tarjeta.')) : paragraph(c)}<div class="demo-row wrap">${badge('Borrador')}${btn('Ver detalle', '', '', c.state === 'loading' ? 'disabled' : 'default')}</div></div>`;
export const composer = (c) =>
  `<div class="composer" data-part="contenedor"><div class="composer-draft ${c.state === 'focus' ? 'is-focused' : ''}" role="textbox">${t(c.d.message)}</div><div class="demo-row">${act('plus')}${act('paperclip')}<span class="grow"></span><span class="composer-send" aria-disabled="${['disabled', 'loading'].includes(c.state)}">${btn('Enviar', 'primary', 'paper-plane-tilt', ['loading', 'disabled'].includes(c.state) ? c.state : 'default')}</span></div>${c.state === 'error' ? '<small class="field-help">No se pudo enviar el mensaje. Conservá el borrador y reintentá con Enviar.</small>' : ''}</div>`;
const message = (c, own = false) =>
  `<div class="chat-line ${own ? 'own' : ''}">${own ? '' : avatar()}<div class="bubble ${own ? 'own' : ''}">${t(own ? 'Lo reviso y te comparto mis observaciones.' : c.d.message)}${own && c.state === 'error' ? '<small class="message-status">No enviado <span role="button" data-ui="retry">Reintentar</span></small>' : ''}</div></div>`;
export const chat = (c) =>
  `<div class="chat-window" data-part="contenedor">${toolbar(c, true)}<div class="chat-history">${c.state === 'loading' ? loading('Cargando mensajes anteriores…') : ''}${c.state === 'empty' ? empty(c, 'mensajes') : message(c) + message(c, true)}</div>${composer({ ...c, state: 'default' })}</div>`;
export const inspector = (c) =>
  `<div class="demo-inspector" data-part="contenedor"><div class="demo-row"><strong>${t('Propiedades')}</strong><span class="grow"></span>${act('dots-three')}</div>${tabs(['Diseño', 'Opciones'])}${c.state === 'empty' ? `<div class="wf-empty">${ico('sliders-horizontal')}${t('Seleccioná un elemento para ver sus propiedades')}</div>` : `<div class="property-section"><small>${t(c.state === 'disabled' ? 'Solo lectura' : 'Posición y tamaño')}</small><div class="property-grid">${field('X', '24')}${field('Y', '32')}${field('Ancho', '320')}${field('Alto', '180')}</div></div><div class="property-section">${t('Alineación')}<div class="demo-row">${['rows', 'squares-four', 'sliders-horizontal'].map((glyph) => act(glyph, false, c.state === 'disabled' ? 'disabled' : 'default')).join('')}</div></div><div class="property-section">${field('Radio de esquina', '8')}${field('Relleno', '#FFFFFF')}${field('Opacidad', '100 %')}</div>`}</div>`;
export const carousel = (c) =>
  `<div class="carousel"><div class="carousel-slide">${c.state === 'empty' ? empty(c, 'imágenes') : imageRegion(c)}${c.state !== 'empty' ? `<span class="carousel-prev">${act('arrow-left', false, c.state === 'loading' ? 'disabled' : 'default')}</span><span class="carousel-next">${act('arrow-right', false, c.state === 'loading' ? 'disabled' : 'default')}</span>` : ''}</div>${c.state === 'empty' ? '' : `<div class="pagination-dots">${[0, 1, 2, 3].map((i) => `<i class="${i === 0 ? 'current' : ''}" data-part="punto"></i>`).join('')}</div>`}</div>`;
export const modal = (c) =>
  `<div class="demo-backdrop" data-part="overlay"><div class="wf-modal" data-part="contenedor"><div class="wf-modal-header"><strong>${t('Invitar al proyecto')}</strong>${act('x')}</div><div class="wf-modal-body">${paragraph(c)}${field('Correo', c.d.email, '', c.state === 'error' ? 'error' : 'default', 'No se pudo enviar la invitación. Revisá el correo y reintentá.')}</div><div class="wf-modal-footer">${btn('Cancelar')}${btn('Invitar', 'primary', '', c.state === 'loading' ? 'loading' : 'default')}</div></div></div>`;
export const screen = (name, body) =>
  `<div class="mini-screen" data-part="marco"><div class="screen-title">${t(name)}</div>${body}</div>`;
const menuOptions = (c, context = false) =>
  `<div class="choice-list ${context ? 'context-demo' : ''}" role="menu">${(context ? ['Duplicar', 'Copiar enlace', 'Eliminar'] : ['Renombrar', 'Duplicar', 'Eliminar']).map((v, i) => `<div role="menuitem" class="${c.state === 'focus' && i === 1 ? 'is-focused' : ''} ${c.state === 'disabled' && i === 2 ? 'is-disabled' : ''}" aria-disabled="${c.state === 'disabled' && i === 2}">${context ? ico(['copy', 'link', 'trash'][i]) : ''}${t(v)}${context ? `<kbd>${['Ctrl D', 'Ctrl Shift C', 'Supr'][i]}</kbd>` : ''}</div>`).join('')}</div>`;
const personOptions = (c) =>
  '<div class="choice-list" role="listbox">' +
  (c.data === 'one' ? [c.d.person] : [c.d.person, 'Gabriel López', 'Equipo de diseño'])
    .map(
      (name, i) =>
        '<div role="option" aria-selected="' +
        (i === 0) +
        '" class="' +
        (c.state === 'focus' && i === (c.data === 'one' ? 0 : 1) ? 'is-focused' : '') +
        '">' +
        t(name) +
        '</div>',
    )
    .join('') +
  '</div>';
const progress = (percent = 60, indeterminate = false) =>
  `<div class="progress-region" data-part="pista y avance" role="progressbar" data-ui="progress" ${indeterminate ? 'aria-label="Operación en curso"' : `aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"`}><div class="demo-track ${indeterminate ? 'indeterminate' : ''}"><i style="width:${indeterminate ? 35 : percent}%"></i></div>${indeterminate ? '' : `<span>${percent} %</span>`}</div>`;
const gallery = (c) =>
  `<div class="gallery-region">${c.state === 'empty' ? empty(c, 'imágenes') : c.state === 'error' ? fail('No se pudieron cargar las imágenes.') : c.state === 'loading' ? `<div class="gallery-grid"><div class="media-box">${loading('Cargando imágenes…')}</div><div class="media-box" aria-hidden="true"></div></div>` : `<div class="gallery-grid">${Array.from({ length: c.data === 'one' ? 1 : 4 }, (_, i) => `<div class="${c.state === 'selected' && i === (c.data === 'one' ? 0 : 1) ? 'is-selected' : ''}" ${c.state === 'selected' && i === (c.data === 'one' ? 0 : 1) ? 'aria-selected="true"' : ''}>${media()}</div>`).join('')}</div>`}</div>`;
const notice = (c, type) => {
  const tone = c.variant ?? 'info';
  const glyph =
    tone === 'error' || tone === 'warning'
      ? 'warning-circle'
      : tone === 'success'
        ? 'check-circle'
        : 'info';
  const title = {
    info: 'Información del proyecto',
    success: 'Cambios guardados',
    warning: 'Hay cambios pendientes',
    error: 'No se pudo guardar el cambio',
  }[tone];
  return `<div class="${type === 'alert' ? 'wf-alert' : type === 'toast' ? 'toast-demo' : 'banner-demo'}" data-tone="${tone}">${ico(glyph)}<div class="grow"><strong>${t(title)}</strong>${type === 'alert' ? t({ info: 'Revisá los detalles antes de compartir.', success: 'El proyecto ya contiene la nueva versión.', warning: 'Guardá los cambios antes de continuar.', error: 'Tu trabajo sigue disponible. Reintentá guardar.' }[tone]) : ''}</div>${type === 'banner' ? btn('Revisar') : ''}${act('x')}</div>`;
};
const tree = (c) =>
  `<div class="tree-demo"><div>${ico('caret-down')}${ico('folder')}${t(c.d.title)}</div><div class="indent tree-children">${c.state === 'loading' ? loading('Cargando carpeta…') : c.state === 'empty' ? empty(c, 'archivos') : `<div class="${c.state === 'selected' ? 'is-selected' : ''}" ${c.state === 'selected' ? 'aria-selected="true"' : ''}>${ico('file')}${t(c.d.file)}</div><div>${ico('folder')}${t('Referencias')}</div>`}</div></div>`;
const steps = (c) =>
  `<div class="steps">${['Cuenta', 'Perfil', 'Confirmar']
    .map((v, i) => {
      const complete = c.state === 'success' || i === 0;
      const current = c.state !== 'success' && i === 1;
      return `<div class="${current && c.state === 'error' ? 'step-error' : ''}"><span class="${complete ? 'is-complete' : current ? 'is-current' : ''}" ${current ? 'aria-current="step"' : ''}>${complete ? ico('check') : current && c.state === 'error' ? ico('warning-circle') : i + 1}</span>${t(v)}</div>`;
    })
    .join(
      '',
    )}</div>${c.state === 'error' ? '<small class="field-help">Corregí los datos de Perfil para continuar.</small>' : ''}`;
const skeletonView = (c) =>
  `<div class="loading-skeleton" role="status" aria-label="Contenido en carga" data-part="carga">${c.variant === 'card' ? '<div class="skeleton-media"></div>' : '<div class="skeleton-avatar"></div>'}<div class="skeleton-lines"><i></i><i></i><i></i></div></div>`;
const metric = (c) =>
  `<div class="stat-demo"><strong class="metric-value">${c.state === 'loading' ? spinner() : c.state === 'empty' ? '—' : c.state === 'error' ? '—' : t(c.d.amount)}</strong>${t('Referencias organizadas')}${c.state === 'error' ? fail('No se pudo recuperar el indicador.') : c.state === 'loading' ? '<small>Cargando indicador…</small>' : c.state === 'empty' ? '<small>Sin datos disponibles</small>' : `<small>${t('+12 esta semana')}</small>`}</div>`;
const chartView = (c) =>
  `<div class="chart-demo"><strong>${t('Actividad semanal')}</strong><div class="plot-region" data-ui="plot">${c.state === 'loading' ? loading('Cargando datos…') : c.state === 'empty' ? empty(c, 'datos') : c.state === 'error' ? fail('No se pudieron cargar los datos del gráfico.') : chart()}</div><div class="demo-row">${['L', 'M', 'M', 'J', 'V', 'S'].map((v) => `<span>${v}</span>`).join('')}</div></div>`;
const timeline = (c) =>
  `<div class="timeline-panel"><strong>${t('Actividad del proyecto')}</strong><div class="timeline-demo">${c.state === 'loading' ? loading('Cargando actividad…') : c.state === 'empty' ? empty(c, 'actividad') : c.state === 'error' ? fail('No se pudo recuperar la actividad.') : (c.data === 'one' ? [c.d.message] : [c.d.message, 'Propuesta revisada', 'Material incorporado']).map((v) => `<div><i data-part="punto"></i><div>${t(v)}<small>${t('Hace unos minutos')}</small></div></div>`).join('')}</div></div>`;
export const components = {
  'text-bars': () => textPlaceholder(),
  image: imageRegion,
  button: (c) =>
    btn(
      'Continuar',
      c.variant === 'primary' ? 'primary' : c.variant === 'text' ? 'text-only' : '',
      '',
      c.state,
    ),
  'icon-button': (c) =>
    `<div class="icon-button-demo ${c.variant === 'round' ? 'round' : ''}">${act('plus', false, c.state)}</div>`,
  'button-group': (c) =>
    `<div class="segmented-demo">${['Día', 'Semana', 'Mes'].map((v, i) => `<span role="radio" aria-checked="${i === 0}" aria-disabled="${i === 1 && c.state === 'disabled'}" class="${i === 0 ? 'is-active' : ''} ${i === 1 ? modifiers(c.state) : ''}">${t(v)}</span>`).join('')}</div>`,
  'text-field': (c) => field('Correo electrónico', c.d.email, 'user', c.state),
  password: (c) => field('Contraseña', '••••••••••', 'eye', c.state),
  textarea: (c) =>
    `<div class="wf-field"><div class="wf-label">${t('Descripción')}</div><div class="demo-textarea ${modifiers(c.state)} ${c.state === 'error' ? 'is-error' : ''}" role="textbox" aria-invalid="${c.state === 'error'}" aria-disabled="${c.state === 'disabled'}">${c.state === 'empty' ? t('Escribí una descripción…') : paragraph(c)}<small>${c.state === 'empty' ? 0 : c.d.message.length} / 500</small></div>${c.state === 'error' ? '<small class="field-help">La descripción necesita una revisión.</small>' : ''}</div>`,
  search: (c) =>
    `${field('Buscar', c.d.row, 'magnifying-glass', c.state === 'error' ? 'default' : c.state)}${c.state === 'error' ? '<small class="field-help">No se pudo realizar la búsqueda. <span data-ui="retry">Reintentar</span></small>' : ''}`,
  select: (c) =>
    `<div class="selection-demo">${field('Equipo', c.d.person, 'caret-down', c.state)}${c.state === 'open' ? personOptions(c) : ''}</div>`,
  combobox: (c) =>
    `<div class="selection-demo">${field('Asignar a', c.d.person, 'magnifying-glass')}<div class="choice-list">${c.state === 'loading' ? loading('Buscando personas…') : c.state === 'empty' ? empty(c, 'coincidencias') : c.state === 'error' ? fail('No se pudieron cargar las opciones.') : personOptions(c)}</div></div>`,
  checkbox: (c) =>
    `<div class="demo-row">${mark(c.state === 'selected', c.state === 'partial', c.state)}${t('Recordar mi elección')}</div>`,
  radio: (c) =>
    `<div class="demo-row"><span class="radio-mark ${c.state === 'selected' ? 'selected' : ''} ${modifiers(c.state)}" role="radio" aria-checked="${c.state === 'selected'}" aria-disabled="${c.state === 'disabled'}" data-part="marca"></span>${t('Opción seleccionable')}</div>`,
  switch: (c) =>
    `<div class="demo-row">${toggle(c.state === 'selected', c.state)}${t('Permitir notificaciones')}</div>`,
  slider: (c) =>
    `<div class="slider-demo"><div class="demo-row">${t('Opacidad')}<span class="grow"></span><strong>60 %</strong></div><div class="demo-track"><i></i><b class="${modifiers(c.state)} ${c.state === 'active' ? 'is-dragging' : ''}" role="slider" aria-valuenow="60" aria-disabled="${c.state === 'disabled'}" data-part="control"></b></div></div>`,
  stepper: (c) =>
    `<div class="number-stepper ${modifiers(c.state)} ${c.state === 'error' ? 'is-error' : ''}" role="spinbutton" aria-valuenow="${c.state === 'error' ? -1 : 24}" aria-invalid="${c.state === 'error'}" aria-disabled="${c.state === 'disabled'}">${act('minus')}<span data-part="texto">${c.state === 'error' ? -1 : 24}</span>${act('plus')}</div>${c.state === 'error' ? '<small class="field-help">Ingresá un número mayor o igual a cero.</small>' : ''}`,
  date: (c) =>
    `<div class="date-demo">${field('Fecha', c.state === 'error' ? '32/11/2026' : c.state === 'selected' ? '10/11/2026' : 'Elegí una fecha', 'calendar-blank', c.state, 'Elegí una fecha válida del calendario.')}${['open', 'selected'].includes(c.state) ? `<div class="calendar-grid">${['L', 'M', 'M', 'J', 'V', 'S', 'D', ...Array.from({ length: 21 }, (_, i) => String(i + 1))].map((v, i) => `<span class="${i === 16 && c.state === 'selected' ? 'is-selected' : ''}" ${i === 16 && c.state === 'selected' ? 'aria-selected="true"' : ''}>${v}</span>`).join('')}</div>` : ''}</div>`,
  upload: (c) =>
    `<div class="upload-zone ${modifiers(c.state)}" data-part="contenedor">${ico(c.state === 'success' ? 'check-circle' : 'file')}${t(['loading', 'success', 'error'].includes(c.state) ? c.d.file : 'Arrastrá un archivo o elegilo')}${c.state === 'loading' ? progress(60) : c.state === 'error' ? fail('No se pudo incorporar este archivo.') : c.state === 'success' ? '<small>Archivo incorporado</small>' : ''}</div>`,
  'chips-input': (c) =>
    `<div class="chips-input ${modifiers(c.state)}" role="combobox" aria-disabled="${c.state === 'disabled'}">${c.state === 'empty' ? t('Elegir elementos…') : badge('Diseño') + badge('Arquitectura') + t(c.d.row)}</div>`,
  toolbar: (c) =>
    `<div class="demo-toolbar tools-${c.variant}" data-part="contenedor">${act('arrow-left')}${act('pencil-simple', c.state === 'active', c.state === 'focus' ? 'focus' : 'default', true)}${act('rows')}<i class="toolbar-separator"></i>${act('copy', false, c.state === 'disabled' ? 'disabled' : 'default')}${act('link')}${act('dots-three')}</div>`,
  menubar: (c) =>
    `<div class="menu-bar-scene"><div class="demo-toolbar"><span class="menu-trigger ${c.state === 'focus' ? 'is-focused' : ''} ${c.state === 'open' ? 'is-open' : ''}" role="menuitem" aria-expanded="${c.state === 'open'}">${t('Archivo')}</span>${['Editar', 'Ver', 'Ayuda'].map((v) => t(v)).join('')}</div>${c.state === 'open' ? `<div class="menu-bar-options choice-list"><div>${t('Nuevo documento')}</div><div>${t('Guardar')}</div><div>${t('Exportar')}</div></div>` : ''}</div>`,
  dropdown: (c) =>
    `<div class="selection-demo">${btn('Opciones', '', 'caret-down')}${c.state !== 'default' ? menuOptions(c) : ''}</div>`,
  'context-menu': (c) => menuOptions(c, true),
  sidebar: (c) => sidebar(c, c.variant === 'rail'),
  drawer: (c) =>
    `<div class="drawer-scene"><div class="drawer-background">${paragraph(c)}</div>${c.state === 'closed' ? btn('Abrir panel', '', 'sidebar-simple') : `<div class="drawer-shade" data-part="overlay"></div><div class="drawer-panel"><div class="drawer-title demo-row"><strong>${t('Materiales')}</strong><span class="grow"></span>${act('x')}</div><div class="drawer-content">${c.state === 'loading' ? loading('Cargando materiales…') : c.state === 'empty' ? empty(c) : c.state === 'error' ? fail('No se pudieron cargar los materiales.') : list({ ...c, state: 'default' }, 2)}</div></div>`}</div>`,
  tabs: (c) => tabs(undefined, 0, c),
  pagination: (c) =>
    `<div class="pagination">${act('arrow-left')}<span class="${c.state === 'disabled' ? '' : 'is-active'}" aria-current="${c.state === 'disabled' ? 'false' : 'page'}">2</span><span>3</span><span>…</span><span class="${c.state === 'disabled' ? 'is-active' : ''}" aria-current="${c.state === 'disabled' ? 'page' : 'false'}">12</span>${act('arrow-right', false, c.state === 'disabled' ? 'disabled' : c.state === 'focus' ? 'focus' : 'default')}</div>`,
  steps,
  tree,
  card: (c) => card(c),
  'media-card': (c) => card(c, true),
  list,
  table,
  'data-grid': (c) =>
    `<div class="data-grid-demo">${toolbar(c, true)}${tabs(['Todo', 'Pendientes'])}${table(c)}<div class="table-footer">${t(c.state === 'loading' ? 'Recuento pendiente' : c.state === 'empty' ? '0 registros' : c.d.count + (c.data === 'one' ? ' registro' : ' registros'))}${act('arrow-right', false, ['loading', 'empty'].includes(c.state) ? 'disabled' : 'default')}</div></div>`,
  identity: (c) =>
    `<div class="person-row"><span class="wf-avatar ${c.variant === 'online' ? 'has-presence' : ''}" data-part="máscara">${c.state === 'loading' ? spinner() : ico('user')}</span><div class="grow">${t(c.d.person)}<small>${t(c.d.email)}</small></div></div>`,
  tags: (c) =>
    `<div class="demo-row wrap">${['Borrador', 'Prioridad alta', 'Diseño', 'Compartido'].map((v, i) => `<span class="wf-badge ${i === 1 && c.state === 'selected' ? 'is-selected' : ''} ${i === 1 && c.state === 'disabled' ? 'is-disabled' : ''}">${t(v)}</span>`).join('')}</div>`,
  carousel,
  gallery,
  'video-player': (c) =>
    `<div class="video-demo"><div class="wf-img media-region" data-part="medio">${c.state === 'loading' ? loading('Cargando video…') : c.state === 'error' ? fail('No se pudo cargar el video.') : ico(c.state === 'active' ? 'image' : 'play')}</div><div class="demo-toolbar">${c.state === 'active' ? '<span class="icon-action" data-ui="pause" role="button" aria-label="Pausar">Ⅱ</span>' : act('play', false, c.state === 'loading' || c.state === 'error' ? 'disabled' : 'default')}<div class="demo-track grow"><i></i></div><span>0:35</span>${act('dots-three')}</div></div>`,
  progress: (c) =>
    `<div class="progress-sample"><span>${c.state === 'success' ? 'Importación completada' : c.state === 'error' ? 'Importación interrumpida' : 'Importando archivos…'}</span>${progress(c.state === 'success' ? 100 : 60, c.variant === 'indeterminate' && c.state !== 'success')}${c.state === 'error' ? fail('No se pudieron incorporar todos los archivos. El avance se conserva.') : ''}</div>`,
  stat: metric,
  chart: chartView,
  timeline,
  alert: (c) => notice(c, 'alert'),
  toast: (c) => notice(c, 'toast'),
  banner: (c) => notice(c, 'banner'),
  dialog: modal,
  popover: (c) =>
    `<div class="popover-scene">${btn('Compartir', '', 'link')}${c.state !== 'default' ? `<div class="popover-panel">${field('Invitar a', c.d.email, '', c.state === 'error' ? 'error' : 'default')}${btn('Compartir', 'primary')}</div>` : ''}</div>`,
  skeleton: skeletonView,
  'field-help': (c) =>
    `<div class="field-help">${ico(c.variant === 'error' ? 'warning-circle' : c.variant === 'success' ? 'check-circle' : 'info')}<span>${c.variant === 'error' ? 'Ingresá una dirección de correo válida.' : c.variant === 'success' ? 'El dato es correcto.' : 'Usá una dirección de correo de tu equipo.'}</span></div>`,
  message: (c) =>
    `<div class="chat-line">${avatar()}<div class="bubble">${t(c.d.message)}<small class="message-status">${c.state === 'loading' ? spinner() + ' Enviando…' : c.state === 'error' ? 'No enviado <span role="button" data-ui="retry">Reintentar</span>' : 'Enviado · 11:42'}</small></div></div>`,
  chat,
  composer,
  inspector: (c) => {
    const body = inspector(c);
    return c.state === 'disabled'
      ? body.replaceAll('role="textbox"', 'role="textbox" aria-readonly="true"')
      : body;
  },
  'command-palette': (c) =>
    `<div class="command-demo">${field('Buscar acciones', c.state === 'empty' ? 'Exportar plano orbital' : 'Buscar una acción…', 'magnifying-glass')}<small>${t('Acciones disponibles')}</small><div class="choice-list">${c.state === 'empty' ? empty(c, 'coincidencias') : ['Crear documento', 'Incorporar material', 'Abrir configuración'].map((v, i) => `<div class="${c.state === 'focus' && i === 1 ? 'is-focused' : ''}">${ico(['file', 'plus', 'gear-six'][i])}${t(v)}<kbd>↵</kbd></div>`).join('')}</div></div>`,
  'file-browser': (c) =>
    `<div class="split-demo">${sidebar({ ...c, state: 'default' }, true)}<div class="grow stack">${toolbar(c, true)}${table(c)}</div></div>`,
  'filter-panel': (c) =>
    `<div class="filter-demo">${field('Estado', c.variant === 'applied' ? 'Pendientes' : 'Todos', 'caret-down')}${field('Equipo', c.variant === 'applied' ? c.d.person : 'Todos los equipos', 'caret-down')}<div class="demo-row">${mark(c.variant === 'applied')}${t('Solo pendientes')}</div>${c.variant === 'applied' ? badge('2 filtros aplicados') : ''}<div class="demo-row wrap">${btn('Limpiar', '', '', c.variant === 'applied' ? 'default' : 'disabled')}${btn('Aplicar filtros', 'primary', '', c.state === 'disabled' ? 'disabled' : 'default')}</div></div>`,
  accordion: (c) =>
    `<div class="accordion-demo">${['Apariencia', 'Posición', 'Contenido'].map((v, i) => `<div><div class="demo-row ${i === 2 && c.state === 'disabled' ? 'is-disabled' : ''}" aria-expanded="${i === 0 && c.state !== 'closed'}" aria-disabled="${i === 2 && c.state === 'disabled'}">${t(v)}<span class="grow"></span>${ico('caret-down')}</div>${i === 0 && c.state !== 'closed' ? `<div class="accordion-body">${field('Relleno', '#FFFFFF')}${field('Opacidad', '100 %')}</div>` : ''}</div>`).join('')}</div>`,
};
