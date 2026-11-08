import { screenEntries } from './screens.js';
// Catálogo de diseño: clases de Chalk y símbolos de Phosphor, ambos MIT.
import { stateNames, stateContract } from './state-contracts.js';
export { stateNames };
import { resolveStates, resolveOptions, availableStates } from './review-model.js';
export { changeState, availableStates, settingOptions } from './review-model.js';
import { ruleFor } from './composition-rules.js';
import {
  esc,
  t,
  ico,
  avatar,
  paragraph,
  btn,
  act,
  badge,
  field,
  media,
  mark,
  toggle,
  empty,
  toolbar,
  sidebar,
  tabs,
  table,
  chart,
  card,
  chat,
  inspector,
  components,
} from './components.js';
export const families = [
  ['all', 'Todo', 'Biblioteca de bosquejos'],
  ['base', 'Base y variantes', 'Piezas gráficas y estructurales'],
  ['controls', 'Controles', 'Controles compuestos'],
  ['navigation', 'Navegación', 'Orientación y navegación'],
  ['content', 'Contenido y datos', 'Contenido, medios y datos'],
  ['feedback', 'Comunicación', 'Feedback y estados de interfaz'],
  ['workspace', 'Espacios de trabajo', 'Paneles y herramientas compuestas'],
  ['screens', 'Interfaces completas', 'Interfaces construidas con la misma base'],
];
export const datasets = {
  demo: {
    title: 'Proyecto Aurora',
    person: 'Ana García',
    email: 'ana@ejemplo.com',
    message: 'La propuesta está lista para revisar.',
    count: '12',
    file: 'Propuesta de interfaz.pdf',
    row: 'Referencia de diseño',
    amount: '248',
  },
  worst: {
    title: 'Rediseño del portal de investigación y documentación del equipo internacional',
    person: 'Aleksandra Wiśniewska-Kowalczyk',
    email: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com',
    message:
      'Dejé observaciones sobre la navegación y los estados vacíos. Necesitamos conservar el contexto al volver del detalle, incluso cuando el documento tenga un nombre largo.',
    count: '1.284',
    file: 'Revisión de arquitectura y decisiones pendientes — noviembre de 2026.pdf',
    row: 'Especificación de accesibilidad del flujo de incorporación de materiales',
    amount: '128.490',
  },
  one: {
    title: 'Mi proyecto',
    person: 'Jo',
    email: 'jo@ejemplo.com',
    message: 'Listo.',
    count: '1',
    file: 'A.pdf',
    row: 'Nota',
    amount: '1',
  },
};
export { esc } from './components.js';
const items = [];
const add = (family, id, name, anatomy, render, tags = '', kind = 'Composición', wide = false) =>
  items.push({
    family,
    id,
    name,
    anatomy,
    render,
    tags,
    kind,
    wide,
    ...stateContract(id),
    layout: ruleFor({ family, id }),
  });
const base = (id, name, parts, render, kind = 'Pieza') =>
  add('base', id, name, parts, render, '', kind);
base(
  'block',
  'Bloque rectangular',
  'Forma · relleno · borde · tamaño',
  () => '<div class="primitive-box" data-part="forma"></div>',
);
base(
  'rounded',
  'Forma redondeada',
  'Variante de forma · radio de esquina',
  () => '<div class="primitive-box rounded" data-part="forma"></div>',
  'Variante',
);
base(
  'ellipse',
  'Círculo y elipse',
  'Variante de forma · proporción',
  () =>
    '<div class="demo-row"><div class="primitive-box circle" data-part="forma"></div><div class="primitive-box ellipse" data-part="forma"></div></div>',
  'Variante',
);
base(
  'polygon',
  'Polígono',
  'Geometría · vértices · relleno',
  () =>
    '<svg class="primitive-svg" viewBox="0 0 220 100" data-part="forma"><path d="M30 85 75 15 120 85Z"/><path d="m160 12 40 35-15 42h-50l-15-42Z"/></svg>',
);
base(
  'path',
  'Trazo y curva',
  'Geometría libre · puntos · grosor',
  () =>
    '<svg class="primitive-svg" viewBox="0 0 220 100" data-part="trazo"><path d="M10 70Q40 15 75 55T145 50T210 20" fill="none"/></svg>',
);
base(
  'line',
  'Línea',
  'Trazo · largo · grosor · dirección',
  () => '<div class="primitive-rule" data-part="línea"></div>',
);
base(
  'arrow',
  'Flecha y conexión',
  'Variante de línea · dirección · extremos',
  () =>
    '<svg class="primitive-svg" viewBox="0 0 220 100" data-part="trazo"><path d="M15 65h75V30h100m-12-10 12 10-12 10" fill="none"/></svg>',
  'Variante',
);
base(
  'divider',
  'Separador',
  'Variante de línea · horizontal o vertical',
  () =>
    '<div class="demo-row separators"><i data-part="línea"></i><i data-part="línea"></i><i data-part="línea"></i></div>',
  'Variante',
);
base('label', 'Rótulo', 'Texto · alineación · tamaño · color', (c) => t(c.d.title));
base(
  'heading',
  'Encabezado',
  'Variante de texto · jerarquía',
  (c) => `<div class="demo-heading">${t(c.d.title)}</div>`,
  'Variante',
);
base('paragraph', 'Párrafo', 'Variante de texto · varias líneas', (c) => paragraph(c), 'Variante');
base(
  'text-bars',
  'Texto simulado',
  'Representación de texto · barras y longitud',
  components['text-bars'],
  'Variante',
);
base(
  'symbol',
  'Icono y símbolo',
  'Símbolo individual de Phosphor · buscá y elegí otra variante',
  (c) => `<div class="symbol-example">${ico(c.variant)}</div>`,
);
base(
  'check-mark',
  'Marcas',
  'Variante de símbolo · check, cruz e indeterminado',
  () => `<div class="demo-row">${ico('check')}${ico('x')}<span data-part="marca">−</span></div>`,
  'Variante',
);
base(
  'dot',
  'Punto',
  'Variante de forma · tamaño · relleno',
  () =>
    '<div class="demo-row"><i class="primitive-dot" data-part="forma"></i><i class="primitive-dot hollow" data-part="forma"></i></div>',
  'Variante',
);
base(
  'bar',
  'Barra y pista',
  'Variante de forma · avance · longitud',
  () => '<div class="demo-track" data-part="pista"><i data-part="barra"></i></div>',
  'Variante',
);
base('image', 'Imagen', 'Región de medio · proporción · recorte', components['image'], 'Pieza');
base('video', 'Video', 'Región de medio · proporción · símbolo', () => media(true));
base(
  'container',
  'Contenedor',
  'Estructura · fondo · borde · contenido',
  (c) =>
    `<div class="primitive-container" data-part="contenedor">${t(c.d.title)}<div class="primitive-box small" data-part="contenido"></div></div>`,
);
base(
  'frame',
  'Pantalla y marco',
  'Estructura · ancho y alto libres',
  () =>
    '<div class="frame-examples"><div data-part="marco"></div><div data-part="marco"></div><div data-part="marco"></div></div>',
);
base(
  'clip',
  'Región recortada',
  'Ventana que muestra parte de un carrusel o una lista; el contenido continúa fuera del marco',
  (c) =>
    `<div class="clip-example ${c.variant}" data-part="Ventana recortada">${Array.from({ length: 3 }, (_, i) => `<div class="clip-card" data-part="Tarjeta ${i + 1}">${media()}${t('Elemento ' + (i + 1))}</div>`).join('')}</div>`,
);
base(
  'mask',
  'Máscara',
  'Estructura · forma de recorte',
  () => `<div class="mask-example" data-part="máscara">${media()}</div>`,
);
base(
  'overlay',
  'Capa superpuesta',
  'Contenido de fondo y capa independiente; atenuación o panel flotante',
  (c) =>
    `<div class="overlay-example ${c.variant}" data-part="Contenido inferior">${paragraph(c)}<div class="overlay-layer" data-part="Capa superpuesta">${c.variant === 'floating' ? `${t('Opciones')}${t('Copiar')}${t('Compartir')}` : ''}</div></div>`,
);
base(
  'scroll-region',
  'Área desplazable',
  'Estructura · ventana · contenido largo',
  (c) =>
    `<div class="scroll-example" data-part="área desplazable">${Array.from({ length: 7 }, (_, i) => `<div>${t(i === 0 ? c.d.row : 'Elemento ' + (i + 1))}</div>`).join('')}</div>`,
);
const control = (id, name, parts, render, tags = '') =>
  add('controls', id, name, parts, render, tags);
control('button', 'Botón', 'Fondo + texto + icono opcional', components['button'], 'acción submit');
control('icon-button', 'Botón de icono', 'Contenedor + símbolo', components['icon-button']);
control(
  'button-group',
  'Grupo de botones',
  'Botones + contenedor compartido',
  components['button-group'],
  'segmentado',
);
control(
  'text-field',
  'Campo de texto',
  'Rótulo + contenedor + texto + ayuda',
  components['text-field'],
  'input email',
);
control('password', 'Contraseña', 'Campo + símbolo + ayuda', components['password'], 'password');
control(
  'textarea',
  'Campo multilínea',
  'Contenedor + párrafo + contador',
  components['textarea'],
  'texto largo',
);
control('search', 'Búsqueda', 'Campo + símbolo + acción', components['search'], 'buscador');
control(
  'select',
  'Selector desplegable',
  'Campo + texto + chevrón + opciones',
  components['select'],
  'select dropdown',
);
control(
  'combobox',
  'Selección con búsqueda',
  'Campo + búsqueda + lista + estado',
  components['combobox'],
  'autocomplete autocompletar',
);
control(
  'checkbox',
  'Casilla de selección',
  'Cuadrado + marca + texto',
  components['checkbox'],
  'checkbox',
);
control('radio', 'Opción exclusiva', 'Círculo + punto + texto', components['radio'], 'radio');
control('switch', 'Interruptor', 'Pista + control + rótulo', components['switch'], 'toggle');
control(
  'slider',
  'Control deslizante',
  'Pista + avance + control + valor',
  components['slider'],
  'rango range',
);
control(
  'stepper',
  'Campo numérico',
  'Campo + valor + acciones de incremento',
  components['stepper'],
  'número spinbutton',
);
control(
  'date',
  'Fecha y calendario',
  'Campo + símbolo + grilla + selección',
  components['date'],
  'date picker',
);
control(
  'upload',
  'Carga de archivo',
  'Contenedor + símbolo + texto + progreso',
  components['upload'],
  'dropzone importar',
);
control(
  'chips-input',
  'Selección múltiple',
  'Campo + etiquetas + acciones',
  components['chips-input'],
  'tags multiselect',
);
control(
  'time',
  'Hora',
  'Campos + unidades + esfera opcional',
  components.time,
  'time picker horario reloj',
);
control(
  'chip',
  'Chips por función',
  'Contenedor + texto + marca o acción',
  components.chip,
  'assist filter input suggestion filtro sugerencia',
);
const nav = (id, name, parts, render, tags = '') =>
  add('navigation', id, name, parts, render, tags);
nav(
  'toolbar',
  'Toolbar',
  'Contenedor + grupos de acciones + separadores',
  components['toolbar'],
  'barra de herramientas dock',
);
nav(
  'topbar',
  'Barra superior',
  'Marca + navegación + búsqueda + perfil',
  (c) => toolbar(c),
  'header navbar',
);
nav(
  'menubar',
  'Barra de menús',
  'Rótulos + menú + estado activo',
  components['menubar'],
  'menú aplicación',
);
nav(
  'dropdown',
  'Menú desplegable',
  'Disparador + panel + opciones',
  components['dropdown'],
  'dropdown',
);
nav(
  'context-menu',
  'Menú contextual',
  'Panel + opciones + iconos + atajos',
  components['context-menu'],
  'clic derecho',
);
nav(
  'sidebar',
  'Navegación lateral',
  'Contenedor + grupos + iconos + filas',
  components['sidebar'],
  'sidebar',
);
nav(
  'drawer',
  'Drawer lateral',
  'Overlay + panel + cabecera + contenido',
  components['drawer'],
  'panel deslizante sheet',
);
nav('tabs', 'Pestañas', 'Texto + indicador + contenedor', components['tabs'], 'tabs');
nav(
  'breadcrumb',
  'Ruta de navegación',
  'Rótulos + separadores + nivel actual',
  (c) =>
    `<div class="breadcrumb">${t('Inicio')}${ico('caret-down')}${t(c.d.title)}${ico('caret-down')}${t('Detalle')}</div>`,
  'breadcrumbs migas',
);
nav(
  'pagination',
  'Paginación',
  'Acciones + números + selección',
  components['pagination'],
  'páginas',
);
nav(
  'steps',
  'Progreso por pasos',
  'Puntos + conectores + texto',
  components['steps'],
  'stepper wizard',
);
nav(
  'tree',
  'Árbol de navegación',
  'Niveles + conectores + filas + acciones',
  components['tree'],
  'tree jerarquía carpetas',
);
nav(
  'bottom-nav',
  'Navegación inferior',
  'Destinos + iconos + rótulos + destino actual',
  components['bottom-nav'],
  'móvil navegación principal',
);
nav(
  'bottom-sheet',
  'Panel inferior',
  'Panel + cabecera + agarre + contenido + cierre',
  components['bottom-sheet'],
  'bottom sheet modal',
);
const content = (id, name, parts, render, tags = '') =>
  add('content', id, name, parts, render, tags);
content(
  'card',
  'Tarjeta de contenido',
  'Contenedor + título + párrafo + acciones',
  components['card'],
  'card',
);
content(
  'media-card',
  'Tarjeta multimedia',
  'Imagen + texto + acciones',
  components['media-card'],
  'media card',
);
content(
  'list',
  'Lista de elementos',
  'Filas + avatar + texto + acciones',
  components['list'],
  'lista',
);
content(
  'table',
  'Tabla de datos',
  'Filas + celdas + texto + estado',
  components['table'],
  'table datagrid',
);
content(
  'data-grid',
  'Tabla con herramientas',
  'Toolbar + filtros + tabla + paginación',
  components['data-grid'],
  'grilla data grid',
);
content(
  'identity',
  'Identidad y avatar',
  'Máscara + símbolo + nombre + estado',
  components['identity'],
  'usuario perfil',
);
content(
  'tags',
  'Etiquetas y chips',
  'Contenedor + texto + símbolo opcional',
  components['tags'],
  'tag badge pill',
);
content(
  'carousel',
  'Carrusel',
  'Región de imagen + navegación + indicadores',
  components['carousel'],
  'slider carrusel',
);
content(
  'gallery',
  'Galería de medios',
  'Grilla + imágenes + selección',
  components['gallery'],
  'galería moodboard',
);
content(
  'video-player',
  'Reproductor de video',
  'Región de medio + acciones + pista',
  components['video-player'],
  'player',
);
content(
  'progress',
  'Progreso',
  'Pista + avance + rótulo + valor',
  components['progress'],
  'barra progreso',
);
content(
  'stat',
  'Indicador numérico',
  'Valor + etiqueta + tendencia',
  components['stat'],
  'métrica kpi',
);
content(
  'chart',
  'Gráfico de datos',
  'Ejes + barras + etiquetas + leyenda',
  components['chart'],
  'gráfica barras dashboard',
);
content(
  'timeline',
  'Línea de actividad',
  'Puntos + conectores + eventos',
  components['timeline'],
  'historial timeline',
);
const feedback = (id, name, parts, render, tags = '') =>
  add('feedback', id, name, parts, render, tags);
feedback(
  'alert',
  'Alerta en contexto',
  'Contenedor + símbolo + mensaje + acción',
  components['alert'],
  'alerta',
);
feedback(
  'toast',
  'Notificación breve',
  'Contenedor + estado + texto + acción',
  components['toast'],
  'toast snackbar',
);
feedback(
  'banner',
  'Aviso persistente',
  'Franja + mensaje + acción',
  components['banner'],
  'banner',
);
feedback(
  'dialog',
  'Diálogo y modal',
  'Overlay + contenedor + cabecera + contenido + acciones',
  components['dialog'],
  'popup pop-up ventana modal',
);
feedback(
  'popover',
  'Popover anclado',
  'Disparador + panel + contenido + flecha',
  components['popover'],
  'flotante',
);
feedback(
  'tooltip',
  'Ayuda breve',
  'Panel + texto + anclaje',
  () =>
    `<div class="tooltip-scene"><div class="tooltip-demo">${t('Duplicar selección · Ctrl D')}</div>${act('copy')}</div>`,
  'tooltip',
);
feedback(
  'empty',
  'Estado vacío',
  'Símbolo + explicación + siguiente acción',
  (c) => `${empty(c)}${btn('Agregar material', 'primary', 'plus')}`,
  'vacío sin datos',
);
feedback(
  'skeleton',
  'Contenido en carga',
  'Barras + formas + distribución',
  components['skeleton'],
  'skeleton placeholder',
);
feedback(
  'field-help',
  'Ayuda y validación',
  'Símbolo + mensaje + asociación al campo',
  components['field-help'],
  'validación formulario',
);
feedback(
  'message',
  'Burbuja de mensaje',
  'Contenedor + texto + emisor + estado',
  components['message'],
  'chat mensaje',
);
const work = (id, name, parts, render, tags = '') =>
  add('workspace', id, name, parts, render, tags, 'Composición', true);
work(
  'chat',
  'Chat completo',
  'Cabecera + historial + mensajes + composer',
  components['chat'],
  'conversación mensajería',
);
work(
  'composer',
  'Composer',
  'Contenedor + texto + adjuntos + acciones',
  components['composer'],
  'prompt mensaje editor enviar',
);
work(
  'inspector',
  'Inspector de propiedades',
  'Secciones + campos + controles + pestañas',
  components['inspector'],
  'panel propiedades diseño',
);
work(
  'split-pane',
  'Paneles divididos',
  'Contenedores + divisor + contenido',
  (c) =>
    `<div class="split-demo">${sidebar(c)}<i class="split-handle"></i><div class="grow stack">${toolbar(c, c.d.file)}${card(c)}</div></div>`,
  'split panes divisor',
);
work(
  'command-palette',
  'Paleta de comandos',
  'Búsqueda + grupos + opciones + atajos',
  components['command-palette'],
  'command palette ctrl k',
);
work(
  'file-browser',
  'Explorador de archivos',
  'Árbol + lista + toolbar + selección',
  components['file-browser'],
  'archivos file picker',
);
work(
  'filter-panel',
  'Panel de filtros',
  'Grupos + campos + opciones + acciones',
  components['filter-panel'],
  'filtros búsqueda avanzada',
);
work(
  'accordion',
  'Panel de secciones',
  'Cabeceras + chevrón + contenido + separación',
  components['accordion'],
  'acordeón disclosure',
);
for (const entry of screenEntries)
  add(
    'screens',
    entry.id,
    entry.name,
    entry.anatomy,
    entry.render,
    'pantalla ' + entry.tags,
    'Interfaz',
    true,
  );
export const entries = items;
export function renderSample(
  item,
  state = 'default',
  data = 'demo',
  variant,
  options = {},
  review = {},
) {
  if (!Object.hasOwn(datasets, data)) throw new Error('Conjunto de datos desconocido: ' + data);
  const chosen = variant ?? item.variants[0].id;
  if (!item.variants.some((v) => v.id === chosen))
    throw new Error('Variante no admitida para ' + item.id + ': ' + chosen);
  const resolvedOptions = resolveOptions(item, options, chosen);
  const states = resolveStates(item, state);
  const allowed = availableStates(item, chosen, resolvedOptions);
  if (states.some((s) => !allowed.includes(s)))
    throw new Error('Estado incompatible con la variante o función');
  const width = review.width ?? item.layout.width;
  if (!Number.isFinite(width) || width < item.layout.minWidth || width > item.layout.maxWidth)
    throw new Error('Ancho de muestra fuera de límites');
  if (review.title !== undefined && (typeof review.title !== 'string' || review.title.length > 500))
    throw new Error('Título de muestra inválido');
  const d = {
    ...datasets[data],
    ...(review.title !== undefined ? { title: review.title || 'Sin título' } : {}),
  };
  return `<div class="specimen" data-sample="${item.id}" data-scenario="${states.join(' ') || 'default'}" data-variant="${chosen}" style="--sample-width:${width}px" inert>${item.render({ id: item.id, state: states[0] ?? 'default', states, data, d, reviewTitle: review.title === undefined ? undefined : review.title || 'Sin título', variant: chosen, options: resolvedOptions })}</div>`;
}
