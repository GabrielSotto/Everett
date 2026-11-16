// Estados por componente: intención y alcance se declaran antes de representarlos.
import { symbolNames, symbolVariants } from './symbols.js';
export const stateNames = {
  default: 'Base',
  hover: 'Hover',
  focus: 'Foco de teclado',
  pressed: 'Pulsación',
  active: 'En uso',
  selected: 'Selección',
  disabled: 'No disponible',
  loading: 'Procesando',
  empty: 'Sin contenido',
  error: 'Error',
  success: 'Completado',
  open: 'Abierto',
  closed: 'Cerrado',
  partial: 'Indeterminado',
  readonly: 'Solo lectura',
};
const groups = {
  default: 'Presentación',
  hover: 'Interacción',
  focus: 'Interacción',
  pressed: 'Interacción',
  active: 'Interacción',
  selected: 'Valor',
  partial: 'Valor',
  disabled: 'Disponibilidad',
  loading: 'Contenido',
  empty: 'Contenido',
  error: 'Resultado',
  success: 'Resultado',
  open: 'Visibilidad',
  closed: 'Visibilidad',
  readonly: 'Disponibilidad',
};
const state = (id, label, target, reason) => ({ id, label, group: groups[id], target, reason });
const base = (target, reason = 'Representación habitual del componente.', label = 'Base') =>
  state('default', label, target, reason);
const interaction = (target, ids) =>
  ids.map((id) =>
    state(
      id,
      stateNames[id],
      target,
      {
        hover: 'Solo el control bajo el puntero cambia de apariencia.',
        focus: 'El foco de teclado marca este control, sin activar otros.',
        pressed: 'La pulsación se representa mientras se mantiene presionado.',
        disabled: 'Este control no está disponible en el contexto mostrado.',
      }[id],
    ),
  );
const content = (id, label, target, reason) => state(id, label, target, reason);
const variant = (id, label, reason) => ({ id, label, reason });
const defs = {};
const define = (id, states, variants) => {
  defs[id] = { states, variants };
};
define('frame', [base('Marco')], [
  variant('desktop', 'Escritorio', 'Marco horizontal.'),
  variant('tablet', 'Tablet', 'Marco de proporción 4:3.'),
  variant('phone', 'Teléfono', 'Marco vertical.'),
]);
define('button', [
  base('Botón'),
  ...interaction('Botón', ['hover', 'focus', 'pressed', 'disabled']),
  content(
    'loading',
    'Procesando',
    'Acción del botón',
    'La acción conserva su lugar y muestra un único indicador.',
  ),
], [
  variant('primary', 'Primario', 'Acción principal.'),
  variant('secondary', 'Secundario', 'Acción complementaria.'),
  variant('text', 'Solo texto', 'Acción de menor énfasis.'),
]);
define('icon-button', [
  base('Botón de icono'),
  ...interaction('Botón de icono', ['hover', 'focus', 'pressed', 'disabled']),
], [
  variant('square', 'Cuadrado', 'Contenedor de esquinas suaves.'),
  variant('round', 'Circular', 'Contenedor circular.'),
]);
define('button-group', [
  base('Grupo de opciones', 'Una opción del grupo tiene un valor elegido.'),
  ...interaction('Segunda opción', ['focus', 'disabled']),
]);
for (const id of ['text-field', 'password', 'textarea', 'stepper'])
  define(id, [
    base('Campo'),
    ...interaction('Campo', ['focus', 'disabled']),
    ...(id === 'text-field' ? interaction('Campo', ['hover']) : []),
    content(
      'error',
      'Dato inválido',
      'Campo y ayuda',
      'El dato se conserva y el mensaje explica cómo corregirlo.',
    ),
    ...(id === 'text-field'
      ? [
          content(
            'success',
            'Dato válido',
            'Ayuda del campo',
            'La validación confirma el valor sin sustituirlo.',
          ),
          content(
            'empty',
            'Sin valor',
            'Campo',
            'El campo vacío conserva su rótulo y muestra una indicación.',
          ),
        ]
      : id === 'textarea'
        ? [
            content(
              'empty',
              'Sin texto',
              'Campo multilínea',
              'El contenido está vacío; se conserva el área de edición.',
            ),
          ]
        : []),
  ]);
define('search', [
  base('Campo de búsqueda'),
  ...interaction('Campo de búsqueda', ['focus']),
  content(
    'loading',
    'Buscando',
    'Extremo del campo',
    'La consulta permanece y el indicador ocupa el lugar de la acción.',
  ),
  content(
    'empty',
    'Sin consulta',
    'Campo de búsqueda',
    'No hay texto escrito; la estructura se conserva.',
  ),
  content(
    'error',
    'Búsqueda fallida',
    'Ayuda de la búsqueda',
    'La consulta sigue visible y se ofrece reintentar.',
  ),
]);
define('select', [
  base('Selector', 'El selector cerrado conserva el valor actual.', 'Cerrado'),
  content(
    'open',
    'Opciones abiertas',
    'Panel de opciones',
    'El panel aparece junto al disparador.',
  ),
  ...interaction('Disparador', ['focus', 'disabled']),
  content(
    'error',
    'Dato inválido',
    'Campo y ayuda',
    'La validación se comunica junto al selector.',
  ),
]);
define('combobox', [
  base('Búsqueda y resultados', 'La consulta y las opciones se ven juntas.'),
  ...interaction('Opción disponible', ['focus']),
  content(
    'loading',
    'Buscando opciones',
    'Lista de opciones',
    'Solo la lista espera datos; el campo sigue visible.',
  ),
  content(
    'empty',
    'Sin coincidencias',
    'Lista de opciones',
    'La lista explica que no hay resultados para la consulta.',
  ),
  content(
    'error',
    'Opciones no disponibles',
    'Lista de opciones',
    'El error y reintento pertenecen a la lista.',
  ),
]);
for (const id of ['checkbox', 'radio', 'switch'])
  define(id, [
    base('Control de elección', 'El valor está desactivado o sin marcar.'),
    content(
      'selected',
      id === 'switch' ? 'Encendido' : 'Marcado',
      'Valor del control',
      'Cambia la marca o la posición del control, no todo el renglón.',
    ),
    ...(id === 'checkbox'
      ? [
          content(
            'partial',
            'Indeterminado',
            'Marca de la casilla',
            'Representa una selección parcial del conjunto asociado.',
          ),
        ]
      : []),
    ...interaction('Control de elección', ['focus', 'disabled']),
  ]);
define('slider', [
  base('Control deslizante'),
  ...interaction('Control del slider', ['focus', 'disabled']),
  content(
    'active',
    'Arrastrando',
    'Control del slider',
    'Solo el tirador muestra la manipulación en curso.',
  ),
]);
define('date', [
  base('Campo de fecha', 'El calendario está cerrado y aún no hay fecha.'),
  content(
    'open',
    'Calendario abierto',
    'Panel del calendario',
    'Las fechas se muestran junto al campo.',
  ),
  content(
    'selected',
    'Fecha elegida',
    'Día y valor del campo',
    'La fecha o intervalo quedan marcados y el campo conserva la misma selección.',
  ),
  ...interaction('Campo de fecha', ['disabled']),
  content(
    'error',
    'Fecha inválida',
    'Campo y ayuda',
    'La fecha incorrecta sigue visible para corregirla.',
  ),
]);
define('upload', [
  base('Zona para archivos'),
  ...interaction('Zona para archivos', ['hover', 'disabled']),
  content(
    'loading',
    'Subiendo archivo',
    'Archivo y progreso',
    'El archivo conserva su nombre y un único progreso determinado.',
  ),
  content(
    'success',
    'Archivo incorporado',
    'Resultado del archivo',
    'Se confirma la incorporación del mismo archivo.',
  ),
  content(
    'error',
    'Carga fallida',
    'Resultado del archivo',
    'El archivo y una acción de reintento siguen disponibles.',
  ),
]);
define('chips-input', [
  base('Selector múltiple'),
  ...interaction('Campo del selector', ['focus', 'disabled']),
  content(
    'empty',
    'Sin opciones elegidas',
    'Valor del selector',
    'Se retiran las etiquetas seleccionadas; permanece el campo.',
  ),
]);
define('toolbar', [
  base(
    'Barra de herramientas',
    'Las acciones están disponibles; ninguna herramienta se marca activa.',
  ),
  content(
    'active',
    'Herramienta activa',
    'Botón de lápiz',
    'Solo la herramienta elegida se marca como activada.',
  ),
  ...interaction('Botón de lápiz', ['focus']),
  content(
    'disabled',
    'Acción no disponible',
    'Botón Copiar',
    'Solo Copiar está deshabilitado; las demás acciones conservan su aspecto.',
  ),
], [
  variant('horizontal', 'Horizontal', 'Acciones en una fila.'),
  variant('vertical', 'Vertical', 'Las mismas acciones en una columna.'),
]);
define('topbar', [
  base(
    'Barra superior',
    'La cabecera es una estructura de navegación; no se simula una carga global.',
  ),
]);
define('menubar', [
  base('Barra de menús', 'Los disparadores se muestran sin un menú abierto.', 'Cerrado'),
  ...interaction('Disparador Archivo', ['focus']),
  content(
    'open',
    'Archivo abierto',
    'Disparador y su menú',
    'Solo Archivo se resalta y despliega sus opciones ancladas.',
  ),
]);
define('dropdown', [
  base('Disparador', 'El menú está cerrado.', 'Cerrado'),
  content(
    'open',
    'Menú abierto',
    'Panel de opciones',
    'Las opciones aparecen junto al disparador.',
  ),
  ...interaction('Opción Duplicar', ['focus']),
  ...interaction('Opción Eliminar', ['disabled']),
]);
define('context-menu', [
  base('Menú contextual', 'Las opciones están disponibles.'),
  ...interaction('Opción Copiar enlace', ['focus']),
  content(
    'disabled',
    'Eliminar no disponible',
    'Opción Eliminar',
    'Solo la acción no permitida aparece deshabilitada.',
  ),
]);
define('sidebar', [
  base('Navegación lateral', 'Resumen es la sección actual; no es un estado de toda la barra.'),
  ...interaction('Opción Materiales', ['focus']),
  content(
    'disabled',
    'Equipo no disponible',
    'Opción Equipo',
    'La sección actual permanece y solo Equipo se deshabilita.',
  ),
], [
  variant('expanded', 'Con rótulos', 'Iconos acompañados por nombres de sección.'),
  variant('rail', 'Solo iconos', 'Navegación compacta con los mismos destinos.'),
]);
define('drawer', [
  base('Panel lateral', 'El panel está abierto y conserva su cabecera.', 'Abierto'),
  content(
    'closed',
    'Cerrado',
    'Panel lateral',
    'El panel se retira y el disparador queda disponible.',
  ),
  content(
    'loading',
    'Cargando materiales',
    'Cuerpo del panel',
    'La cabecera y el cierre permanecen; el cuerpo indica qué está cargando.',
  ),
  content(
    'empty',
    'Sin materiales',
    'Cuerpo del panel',
    'Se explica el vacío dentro del panel abierto.',
  ),
  content(
    'error',
    'Carga fallida',
    'Cuerpo del panel',
    'El panel conserva el cierre y permite reintentar.',
  ),
]);
define('tabs', [
  base('Grupo de pestañas', 'Resumen está seleccionado; las demás pestañas siguen disponibles.'),
  ...interaction('Pestaña Actividad', ['focus']),
  content(
    'disabled',
    'Equipo no disponible',
    'Pestaña Equipo',
    'La selección actual no cambia al deshabilitar otra pestaña.',
  ),
], [
  variant('line', 'Subrayadas', 'La selección usa una línea inferior.'),
  variant('contained', 'Contenidas', 'La selección usa un contenedor destacado.'),
]);
define('pagination', [
  base('Paginación', 'La segunda página está elegida.'),
  ...interaction('Página siguiente', ['focus']),
  content(
    'disabled',
    'Última página',
    'Página siguiente',
    'En la última página se deshabilita solo el avance.',
  ),
]);
define('steps', [
  base('Pasos del proceso', 'Cuenta está completa y Perfil es el paso actual.', 'En curso'),
  content(
    'error',
    'Corregir Perfil',
    'Paso Perfil',
    'El error pertenece al paso actual; el completado se conserva.',
  ),
  content(
    'success',
    'Proceso completo',
    'Pasos del proceso',
    'Todos los pasos están completos y se representan como tales.',
  ),
]);
define('tree', [
  base('Árbol de archivos'),
  content(
    'selected',
    'Archivo seleccionado',
    'Fila del archivo',
    'La selección se limita a una fila.',
  ),
  content(
    'loading',
    'Cargando carpeta',
    'Hijos de la carpeta',
    'La carpeta permanece y solo sus hijos esperan datos.',
  ),
  content(
    'empty',
    'Carpeta vacía',
    'Hijos de la carpeta',
    'La carpeta permanece visible sin archivos hijos.',
  ),
]);
for (const id of ['card', 'media-card', 'list', 'table', 'data-grid', 'gallery'])
  define(id, [
    base('Contenido'),
    content(
      'selected',
      id === 'list' || id === 'table' || id === 'data-grid'
        ? 'Fila seleccionada'
        : id === 'gallery'
          ? 'Imagen seleccionada'
          : 'Tarjeta seleccionada',
      'Elemento de contenido',
      'La selección queda en una pieza concreta.',
    ),
    content(
      'loading',
      'Cargando contenido',
      'Región de contenido',
      'Se conserva el marco y las herramientas; la espera se limita al contenido.',
    ),
    content(
      'empty',
      'Sin contenido',
      'Región de contenido',
      'Se explica el vacío conservando el contexto.',
    ),
    content(
      'error',
      'Carga fallida',
      'Región de contenido',
      'Se describe el fallo de carga y se permite reintentar.',
    ),
  ]);
define('identity', [
  base('Identidad', 'El nombre y el correo son conocidos.'),
  content(
    'loading',
    'Cargando avatar',
    'Avatar',
    'Solo la imagen espera; el nombre y el correo permanecen.',
  ),
], [
  variant('person', 'Persona', 'Identidad de un usuario.'),
  variant('online', 'Con presencia', 'La identidad incluye un indicador de conexión.'),
]);
define('tags', [
  base('Etiquetas'),
  content(
    'selected',
    'Etiqueta elegida',
    'Segunda etiqueta',
    'Solo una etiqueta se destaca como elegida.',
  ),
  content(
    'disabled',
    'Etiqueta no disponible',
    'Segunda etiqueta',
    'Solo una etiqueta queda deshabilitada.',
  ),
]);
define('carousel', [
  base('Carrusel'),
  content(
    'loading',
    'Cargando imagen',
    'Diapositiva',
    'Se conserva el carrusel y se espera la imagen actual.',
  ),
  content(
    'empty',
    'Sin imágenes',
    'Carrusel',
    'No se muestran páginas ficticias para una colección vacía.',
  ),
]);
define('video-player', [
  base('Video', 'El reproductor está pausado.', 'Pausado'),
  content(
    'active',
    'Reproduciendo',
    'Controles de reproducción',
    'La acción pasa a Pausa; la barra completa no cambia de color.',
  ),
  content(
    'loading',
    'Cargando video',
    'Región de video',
    'Un indicador único ocupa la región de video; los controles permanecen.',
  ),
  content(
    'error',
    'Video no disponible',
    'Región de video',
    'Se conserva el reproductor y se explica el fallo.',
  ),
]);
define('progress', [
  base('Progreso', 'La operación está en curso.', 'En curso'),
  content(
    'success',
    'Completado',
    'Avance de la operación',
    'Se muestra cien por ciento y la confirmación.',
  ),
  content(
    'error',
    'Interrumpido',
    'Avance de la operación',
    'El avance alcanzado se conserva con un error específico.',
  ),
], [
  variant('determinate', 'Determinado', 'Se conoce el porcentaje de la operación.'),
  variant('indeterminate', 'Indeterminado', 'Se indica actividad sin inventar un porcentaje.'),
]);
for (const id of ['stat', 'chart', 'timeline'])
  define(id, [
    base('Datos'),
    content(
      'loading',
      'Cargando datos',
      'Región de datos',
      'Se conserva el contexto y se retiran los valores aún desconocidos.',
    ),
    content(
      'empty',
      'Sin datos',
      'Región de datos',
      'El contexto se conserva sin valores ficticios.',
    ),
    content(
      'error',
      'Datos no disponibles',
      'Región de datos',
      'Se explica qué datos no se pudieron recuperar.',
    ),
  ]);
for (const id of ['alert', 'toast', 'banner'])
  define(
    id,
    [base('Mensaje', 'El tono es una variante del mensaje, no un estado de interacción.')],
    ['info', 'success', 'warning', 'error'].map((tone, index) =>
      variant(
        tone,
        ['Informativo', 'Éxito', 'Advertencia', 'Error'][index],
        'El símbolo y el contenido expresan el tono del mensaje.',
      ),
    ),
  );
define('dialog', [
  base('Diálogo', 'El diálogo está abierto y espera la acción de la persona.', 'Abierto'),
  content(
    'loading',
    'Enviando invitación',
    'Botón Invitar',
    'El contenido se conserva; el progreso pertenece a Invitar.',
  ),
  content(
    'error',
    'Invitación fallida',
    'Ayuda de la invitación',
    'Se conserva el correo y se explica por qué reintentar.',
  ),
]);
define('popover', [
  base('Disparador', 'El popover está cerrado.', 'Cerrado'),
  content('open', 'Abierto', 'Panel anclado', 'El panel aparece junto al disparador.'),
  content(
    'error',
    'Dato inválido',
    'Campo dentro del popover',
    'El error se comunica junto al dato incorrecto.',
  ),
]);
define('skeleton', [
  base(
    'Esqueleto de carga',
    'Ejemplo explícito de un patrón de carga; no representa texto escrito.',
  ),
], [
  variant('list', 'Lista', 'El esqueleto anticipa filas de una lista.'),
  variant('card', 'Tarjeta', 'El esqueleto anticipa imagen y texto de una tarjeta.'),
]);
define('field-help', [base('Ayuda', 'El contenido representa ayuda contextual.')], [
  variant('hint', 'Ayuda', 'Explica el formato esperado.'),
  variant('success', 'Dato válido', 'Confirma la validación.'),
  variant('error', 'Dato inválido', 'Explica la corrección necesaria.'),
]);
define('message', [
  base('Mensaje enviado'),
  content(
    'loading',
    'Enviando',
    'Estado del mensaje',
    'El texto permanece mientras se confirma su envío.',
  ),
  content(
    'error',
    'Envío fallido',
    'Estado del mensaje',
    'Se conserva el texto y se ofrece reintentar.',
  ),
]);
define('chat', [
  base('Conversación'),
  content(
    'loading',
    'Cargando historial',
    'Historial anterior',
    'La conversación y el composer permanecen; se esperan mensajes anteriores.',
  ),
  content(
    'empty',
    'Sin mensajes',
    'Historial',
    'El composer sigue disponible para iniciar la conversación.',
  ),
  content(
    'error',
    'Envío fallido',
    'Último mensaje propio',
    'El error queda unido al mensaje que falló.',
  ),
]);
define('composer', [
  base('Borrador'),
  ...interaction('Área de escritura', ['focus']),
  content(
    'disabled',
    'Envío no disponible',
    'Botón Enviar',
    'El borrador permanece; solo el envío no está disponible.',
  ),
  content(
    'loading',
    'Enviando',
    'Botón Enviar',
    'El borrador se conserva y el progreso pertenece al envío.',
  ),
  content(
    'error',
    'Envío fallido',
    'Ayuda del composer',
    'El borrador se conserva para reintentar.',
  ),
]);
define('inspector', [
  base('Propiedades del elemento'),
  content(
    'disabled',
    'Solo lectura',
    'Campos del inspector',
    'Los valores siguen visibles y los campos se marcan de solo lectura.',
  ),
  content(
    'empty',
    'Sin selección',
    'Cuerpo del inspector',
    'La cabecera permanece y se explica qué seleccionar.',
  ),
]);
define('command-palette', [
  base('Paleta de comandos'),
  ...interaction('Segundo comando', ['focus']),
  content(
    'empty',
    'Sin coincidencias',
    'Resultados de comandos',
    'La consulta permanece y se explica la ausencia de coincidencias.',
  ),
]);
define('file-browser', [
  base('Explorador de archivos'),
  content(
    'selected',
    'Archivo elegido',
    'Fila del archivo',
    'Solo una fila se marca seleccionada.',
  ),
  content(
    'loading',
    'Cargando archivos',
    'Lista de archivos',
    'La navegación y las herramientas permanecen.',
  ),
  content(
    'empty',
    'Carpeta vacía',
    'Lista de archivos',
    'La navegación permanece y se explica el vacío.',
  ),
  content(
    'error',
    'Carga fallida',
    'Lista de archivos',
    'El error corresponde a recuperar los archivos.',
  ),
]);
define('filter-panel', [
  base('Panel de filtros'),
  content(
    'disabled',
    'Aplicar no disponible',
    'Botón Aplicar',
    'Los filtros siguen visibles; solo Aplicar no está disponible.',
  ),
], [
  variant('all', 'Sin filtros', 'Ninguna restricción está aplicada.'),
  variant('applied', 'Con filtros', 'Los campos y el contador muestran los filtros elegidos.'),
]);
define('accordion', [
  base('Secciones', 'Apariencia está desplegada.'),
  content(
    'closed',
    'Contraídas',
    'Secciones',
    'Las cabeceras siguen visibles con su contenido contraído.',
  ),
  content(
    'disabled',
    'Contenido no disponible',
    'Cabecera Contenido',
    'Solo una sección se deshabilita; las demás permanecen.',
  ),
]);
define('image', [
  base('Imagen'),
  content(
    'loading',
    'Cargando imagen',
    'Región de imagen',
    'La región conserva su proporción con un indicador único.',
  ),
  content(
    'error',
    'Imagen no disponible',
    'Región de imagen',
    'La región conserva su proporción y permite reintentar.',
  ),
]);
// Anatomía y variantes adicionales conservan los estados del componente original.
const variants = (id, options) => {
  defs[id].variants = options.map(([key, label, reason]) => variant(key, label, reason));
};
variants('text-field', [
  ['plain', 'Texto', 'Campo simple con rótulo persistente.'],
  ['prefix', 'Con prefijo', 'Prefijo separado del valor editable.'],
  ['suffix', 'Con unidad', 'Unidad que permanece al extremo del campo.'],
  ['both', 'Prefijo y sufijo', 'Importe con moneda y periodicidad.'],
]);
for (const id of [
  'text-field',
  'password',
  'textarea',
  'stepper',
  'select',
  'date',
  'chips-input',
]) {
  defs[id].states.push(
    content(
      'readonly',
      'Solo lectura',
      'Valor del campo',
      'El valor se puede consultar; no se atenúa como una acción deshabilitada.',
    ),
  );
}
variants('slider', [
  ['single', 'Un valor', 'Un tirador y una magnitud.'],
  ['range', 'Intervalo', 'Dos tiradores: mínimo y máximo.'],
]);
variants('date', [
  ['single', 'Una fecha', 'Calendario completo con mes, año y navegación.'],
  ['range', 'Intervalo de fechas', 'Inicio y fin identificados en el campo y calendario.'],
]);
define('time', [
  base('Selector de hora'),
  ...interaction('Hora', ['focus', 'disabled']),
  content('readonly', 'Solo lectura', 'Hora', 'Hora consultable sin edición.'),
  content('error', 'Hora inválida', 'Campo y ayuda', 'Se conserva el valor para corregirlo.'),
], [
  variant('input', 'Entrada de hora', 'Horas y minutos separados.'),
  variant('dial', 'Reloj', 'Esfera de horas y campos equivalentes.'),
]);
define('bottom-nav', [
  base('Navegación principal', 'Inicio es el destino actual.'),
  ...interaction('Destino Explorar', ['focus']),
  content('disabled', 'Destino no disponible', 'Perfil', 'Solo Perfil está deshabilitado.'),
]);
variants('drawer', [
  ['modal', 'Modal', 'La tarea requiere atención y oscurece el fondo.'],
  ['nonmodal', 'No modal', 'El panel convive con el contenido sin bloquearlo.'],
]);
define('bottom-sheet', [
  base('Panel inferior', 'Acciones de una tarea ancladas al borde inferior.'),
  content('closed', 'Cerrado', 'Panel', 'El disparador permanece.'),
  content(
    'loading',
    'Cargando opciones',
    'Contenido del panel',
    'Conserva cabecera, agarre y cierre.',
  ),
  content(
    'error',
    'Carga fallida',
    'Contenido del panel',
    'Permite reintentar sin perder la salida.',
  ),
], [
  variant('modal', 'Modal', 'Fondo atenuado durante la tarea.'),
  variant('nonmodal', 'No modal', 'Contexto disponible detrás del panel.'),
]);
variants('dialog', [
  ['form', 'Formulario', 'Invitación con dato y acción.'],
  ['confirm', 'Confirmación', 'Consecuencia concreta y acción destructiva identificada.'],
  ['info', 'Información', 'Mensaje y una acción para terminar.'],
]);
defs.dialog.states = [
  base('Diálogo', 'La presentación conserva título, contenido y salida.', 'Abierto'),
  content(
    'loading',
    'Procesando acción',
    'Acción principal',
    'La espera pertenece a la acción que se ejecuta.',
  ),
  content(
    'error',
    'Acción fallida',
    'Resultado de la acción',
    'El mensaje corresponde a la tarea del diálogo.',
  ),
];
variants('list', [
  ['one-line', 'Una línea', 'Nombre y accesorio.'],
  ['two-lines', 'Dos líneas', 'Nombre y detalle.'],
  ['three-lines', 'Tres líneas', 'Nombre, detalle y contexto adicional.'],
]);
for (const id of ['table', 'data-grid'])
  variants(id, [
    ['plain', 'Datos', 'Columnas y cabeceras persistentes.'],
    ['sortable', 'Ordenamiento', 'Columna ordenada y dirección visibles.'],
    ['multiple', 'Selección múltiple', 'Casillas por fila, selección parcial y acciones del lote.'],
  ]);
define('chip', [
  base('Chip'),
  content(
    'selected',
    'Filtro elegido',
    'Valor del filtro',
    'La marca identifica un filtro aplicado.',
  ),
  ...interaction('Chip', ['focus', 'disabled']),
], [
  variant('assist', 'Acción', 'Ejecuta una ayuda contextual.'),
  variant('filter', 'Filtro', 'Alterna un criterio de contenido.'),
  variant('input', 'Entrada', 'Un valor añadido con acción para quitarlo.'),
  variant('suggestion', 'Sugerencia', 'Propone un valor para completar una entrada.'),
]);

const settings = {};
const setting = (id, label, options) => ({
  id,
  label,
  options: options.map(([key, text]) => ({ id: key, label: text })),
});
for (const id of ['button', 'icon-button']) {
  settings[id] = [
    setting('action', 'Función', [
      ['normal', 'Acción'],
      ['toggle', 'Alternancia'],
      ['destructive', 'Destructiva'],
    ]),
  ];
  defs[id].states.push(
    content(
      'selected',
      'Activado',
      'Valor de la alternancia',
      'Se representa solo cuando la función es Alternancia.',
    ),
  );
}
settings.list = [
  setting('accessory', 'Accesorio', [
    ['avatar', 'Avatar y acción'],
    ['disclosure', 'Ir al detalle'],
    ['checkbox', 'Casilla'],
    ['switch', 'Interruptor'],
    ['none', 'Sin accesorio'],
  ]),
  setting('grouping', 'Agrupación', [
    ['none', 'Sin grupos'],
    ['sections', 'Por secciones'],
  ]),
];
for (const id of ['alert', 'toast', 'banner'])
  settings[id] = [
    setting('action', 'Acción del aviso', [
      ['none', 'Sin acción'],
      ['undo', 'Deshacer'],
      ['retry', 'Reintentar'],
    ]),
  ];
const combined = new Set([
  'button',
  'icon-button',
  'text-field',
  'password',
  'textarea',
  'search',
  'select',
  'checkbox',
  'radio',
  'switch',
  'slider',
  'stepper',
  'date',
  'time',
  'chips-input',
  'chip',
]);
for (const id of ['dashboard', 'editor', 'file-manager'])
  define(
    id,
    [base('Interfaz compuesta')],
    [
      variant(
        'collapsed',
        'Navegación compacta',
        'Barra lateral de iconos que deja más espacio al contenido.',
      ),
      variant(
        'expanded',
        'Navegación desplegada',
        'Destinos con iconos y rótulos; el contenido conserva su jerarquía.',
      ),
    ],
  );
for (const id of ['booking-mobile', 'records-workspace', 'support-workspace'])
  define(id, [
    base('Interfaz compuesta'),
    content(
      'loading',
      'Operación en curso',
      id === 'booking-mobile'
        ? 'Confirmación de reserva'
        : id === 'records-workspace'
          ? 'Filas de la tabla'
          : 'Historial anterior',
      'La estructura y las salidas permanecen disponibles.',
    ),
    content(
      'error',
      'Error en contexto',
      id === 'booking-mobile'
        ? 'Hora incorrecta'
        : id === 'records-workspace'
          ? 'Aviso de guardado'
          : 'Último mensaje',
      'El dato o mensaje se conserva junto con la corrección o reintento.',
    ),
  ]);

settings.symbol = [setting('symbolVariant', 'Variante del símbolo', Object.entries(symbolVariants))];
define('symbol', [base('Símbolo individual')], Object.entries(symbolNames).map(([id, label]) =>
  variant(id, label, 'Símbolo vectorial editable de Phosphor.'),
));
define('clip', [base('Ventana de contenido')], [
  variant(
    'horizontal',
    'Carrusel recortado',
    'La siguiente tarjeta asoma dentro de una ventana horizontal.',
  ),
  variant('vertical', 'Lista recortada', 'El contenido continúa fuera del límite inferior.'),
]);
define('overlay', [base('Capa sobre contenido')], [
  variant(
    'scrim',
    'Fondo atenuado',
    'Una capa translúcida reduce el énfasis del contenido inferior.',
  ),
  variant(
    'floating',
    'Panel flotante',
    'Un panel independiente se superpone a una zona del contenido.',
  ),
]);

export function stateContract(id) {
  const def = defs[id] ?? { states: [base('Pieza visual')] };
  return {
    states: def.states.map((s) => s.id),
    stateDetails: Object.fromEntries(def.states.map((s) => [s.id, s])),
    variants: def.variants ?? [
      variant('standard', 'Estándar', 'Presentación habitual de la pieza.'),
    ],
    combineStates: combined.has(id),
    settings: settings[id] ?? [],
  };
}
