// Recorridos completos compuestos con las mismas piezas del catálogo.
// Son bosquejos estáticos: variantes y datos ilustran decisiones de interfaz.
import {
  t,
  ico,
  avatar,
  btn,
  act,
  badge,
  field,
  media,
  mark,
  toggle,
  tabs,
  table,
  chart,
  chat,
  conversations,
  inspector,
  screen,
  components,
  calendar,
} from './components.js';

const heading = (title, detail = '') =>
  `<div class="app-heading"><strong>${t(title)}</strong>${detail ? `<small>${t(detail)}</small>` : ''}</div>`;
const actions = (...items) => `<div class="app-actions">${items.join('')}</div>`;
const section = (title, body, detail = '') =>
  `<section class="app-section">${heading(title, detail)}${body}</section>`;
const frame = (c, title, body) =>
  screen(c.reviewTitle ?? title, `<div class="app-content">${body}</div>`).replace(
    'class="mini-screen"',
    'class="mini-screen app-screen"',
  );
const rail = (
  c,
  names = ['Resumen', 'Proyectos', 'Actividad', 'Equipo'],
  glyphs = ['squares-four', 'folder', 'bell', 'user'],
) =>
  `<nav class="app-rail ${c.variant === 'expanded' ? 'expanded' : ''}" data-part="navegación"><div class="rail-heading">${act('sidebar-simple', false, 'default', false, c.variant === 'expanded' ? 'Contraer navegación' : 'Expandir navegación')}</div>${names.map((name, i) => `<div class="nav-row ${i === 0 ? 'is-active' : ''}" role="link" aria-label="${name}" ${i === 0 ? 'aria-current="page"' : ''}>${ico(glyphs[i])}${c.variant === 'expanded' ? t(name) : ''}</div>`).join('')}<div class="rail-footer">${act('gear-six', false, 'default', false, 'Preferencias')}</div></nav>`;
const shell = (c, body, names, glyphs) =>
  `<div class="app-shell">${rail(c, names, glyphs)}<main class="app-main">${body}</main></div>`;
const summary = (pairs) =>
  `<dl class="app-summary">${pairs.map(([a, b]) => `<div><dt>${t(a)}</dt><dd>${t(b)}</dd></div>`).join('')}</dl>`;
const clean = (c) => ({ ...c, state: 'default', states: [] });
const selected = (c) => ({ ...c, state: 'selected', states: ['selected'] });
const scenario = (c, value) => c.states.includes(value);
const entry = (id, name, anatomy, render, tags) => ({ id, name, anatomy, render, tags });

export const screenEntries = [
  entry(
    'login',
    'Inicio de sesión',
    'Marco + identidad + campos + acción principal',
    (c) =>
      frame(
        c,
        'Acceso al espacio',
        `<div class="auth-layout">${heading('Bienvenido de nuevo', 'Entrá para continuar con tu equipo.')}<div class="stack">${field('Correo', c.d.email)}${field('Contraseña', '••••••••', 'eye')}<div class="app-actions"><div class="demo-row">${mark(true)}${t('Recordarme')}</div>${btn('Recuperar acceso', 'text')}</div>${btn('Entrar', 'primary')}${actions(t('¿Todavía no tenés cuenta?'), btn('Crear cuenta', 'text'))}</div></div>`,
      ),
    'login autenticar',
  ),
  entry(
    'signup',
    'Registro por pasos',
    'Progreso + formulario + ayuda + siguiente paso',
    (c) =>
      frame(
        c,
        'Crear cuenta',
        `<div class="auth-layout">${components.steps({ ...c, stepIndex: 0 })}${heading('Tus datos', 'Primero, contanos cómo identificarte.')}<div class="stack">${field('Nombre', c.d.person)}${field('Correo', c.d.email)}${field('Contraseña', '••••••••', 'eye')}${t('Usá al menos 12 caracteres.')}${btn('Continuar', 'primary')}${btn('Ya tengo cuenta', 'text')}</div></div>`,
      ),
    'registro onboarding formulario',
  ),
  entry(
    'invitation',
    'Invitación a un espacio',
    'Identidad + contexto + permisos + decisión',
    (c) =>
      frame(
        c,
        'Invitación del equipo',
        `<div class="auth-layout">${avatar()}${heading('Sumate a ' + c.d.title, c.d.person + ' te invita a colaborar.')}${summary(
          [
            ['Acceso', 'Editor'],
            ['Permisos', 'Crear y modificar materiales'],
          ],
        )}${actions(btn('Ahora no'), btn('Aceptar invitación', 'primary'))}</div>`,
      ),
    'colaboración equipo permisos',
  ),
  entry(
    'dashboard',
    'Dashboard de trabajo',
    'Navegación + resumen + tendencia + actividad',
    (c) =>
      frame(
        c,
        'Resumen del equipo',
        shell(
          c,
          `${actions(heading('Esta semana', 'Trabajo del equipo y próximos pasos'), btn('7 días', '', 'caret-down'))}<div class="app-metrics">${[
            ['Tareas completadas', '32'],
            ['En curso', '8'],
            ['Pendientes', '18'],
          ]
            .map(([name, value]) => `<div>${t(name)}<strong>${t(value)}</strong></div>`)
            .join(
              '',
            )}</div>${section('Actividad del equipo', `<div class="app-chart">${chart()}<div class="app-chart-days">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => t(day)).join('')}</div></div>`, 'Tareas completadas por día')}${section('Proyectos recientes', table(clean(c)))}`,
        ),
      ),
    'panel estadísticas dashboard',
  ),
  entry(
    'chat-app',
    'Aplicación de mensajería',
    'Conversaciones + mensajes + composer',
    (c) =>
      frame(
        c,
        'Mensajes',
        `<div class="app-messaging">${conversations(c)}<div class="app-thread">${chat(c)}</div></div>`,
      ),
    'chat mensajería conversaciones',
  ),
  entry(
    'editor',
    'Editor con inspector',
    'Herramientas + lienzo + propiedades',
    (c) =>
      frame(
        c,
        'Editor de interfaz',
        `<div class="demo-toolbar">${act('arrow-left')}${t('Pantalla de bienvenida')}<span class="grow"></span>${act('copy')}${btn('Compartir')}</div><div class="app-editor">${rail(c, ['Capas', 'Recursos', 'Componentes', 'Versiones'], ['rows', 'image', 'squares-four', 'copy'])}<div class="app-artboard"><div class="app-artboard-page">${media()}${heading('Tu próximo proyecto', 'Un lugar para empezar.')}${btn('Comenzar', 'primary')}</div></div>${inspector(c)}</div>`,
      ),
    'diseño editor inspector',
  ),
  entry(
    'search-results',
    'Catálogo con filtros',
    'Búsqueda + filtros laterales + resultados + paginación',
    (c) =>
      frame(
        c,
        'Biblioteca de referencias',
        `${field('Buscar referencias', c.d.row, 'magnifying-glass')}<div class="app-catalog"><aside class="app-facets">${heading('Filtros')}${section('Formato', ['Imágenes', 'Documentos', 'Videos'].map((v, i) => `<div class="demo-row">${mark(i === 0)}${t(v)}</div>`).join(''))}${section('Colección', ['Diseño', 'Investigación'].map((v) => `<div class="demo-row">${mark()}${t(v)}</div>`).join(''))}</aside><div class="app-main">${actions(t('12 referencias'), btn('Más recientes', '', 'caret-down'))}<div class="app-results">${(c.data === 'one' ? [c.d.row] : [c.d.row, 'Navegación móvil', 'Sistemas de color', 'Patrones de formularios']).map((v, i) => `<article class="app-result">${media()}<strong>${t(v)}</strong><small>${t(i % 2 ? 'Equipo · Hace 2 días' : 'Personal · Hoy')}</small></article>`).join('')}</div>${components.pagination(clean(c))}</div></div>`,
      ),
    'búsqueda catálogo filtros resultados',
  ),
  entry(
    'settings',
    'Preferencias y configuración',
    'Navegación de secciones + campos + ajustes',
    (c) =>
      frame(
        c,
        'Configuración del espacio',
        `${tabs(['General', 'Apariencia', 'Notificaciones'])}<div class="app-form">${section('Información del espacio', `${field('Nombre', c.d.title)}${field('Idioma', 'Español', 'caret-down')}`)}${section(
          'Experiencia',
          [
            ['Mostrar cuadrícula', true],
            ['Reducir animaciones', false],
          ]
            .map(([name, on]) => `<div class="setting-row">${t(name)}${toggle(on)}</div>`)
            .join(''),
        )}${actions(btn('Guardar cambios', 'primary'))}</div>`,
      ),
    'ajustes preferencias settings',
  ),
  entry(
    'kanban',
    'Gestión por columnas',
    'Cabecera + estados + tareas + responsables',
    (c) =>
      frame(
        c,
        'Tablero de proyecto',
        `${actions(heading(c.d.title), btn('Nueva tarea', 'primary', 'plus'))}<div class="app-kanban">${[
          ['Pendiente', 'Definir navegación', 'Preparar contenidos'],
          ['En curso', 'Revisar accesibilidad'],
          ['Hecho', 'Compartir prototipo'],
        ]
          .map(
            ([name, ...tasks]) =>
              `<section class="app-column">${actions(heading(name), badge(String(tasks.length)))}${tasks.map((v, i) => `<article class="app-task" data-part="contenedor"><strong>${t(v)}</strong>${t(i ? 'Contenido' : 'Diseño')}${actions(avatar(), t('12 nov.'))}</article>`).join('')}${btn('Agregar tarea', 'text', 'plus')}</section>`,
          )
          .join('')}</div>`,
      ),
    'kanban tareas tablero',
  ),
  entry(
    'calendar-app',
    'Agenda y planificación',
    'Mes + selección de día + agenda con horarios',
    (c) =>
      frame(
        c,
        'Agenda del equipo',
        `${actions(heading('Noviembre de 2026'), btn('Nuevo evento', 'primary', 'plus'))}<div class="app-agenda"><div>${calendar({ ...selected(c), variant: 'single' })}</div><section class="app-day">${heading('Martes 10', '2 eventos programados')}${(c.data ===
        'one'
          ? [['10:00', 'Revisión de diseño', 'Con ' + c.d.person]]
          : [
              ['10:00', 'Revisión de diseño', 'Con ' + c.d.person],
              ['14:30', 'Planificación del equipo', '30 min · Sala de reuniones'],
            ]
        )
          .map(
            ([time, name, detail]) =>
              `<div class="agenda-event"><span class="event-time">${t(time)}</span><div class="grow"><strong>${t(name)}</strong><small>${t(detail)}</small></div></div>`,
          )
          .join('')}</section></div>`,
      ),
    'agenda calendario planificación',
  ),
  entry(
    'booking-mobile',
    'Reserva móvil',
    'Servicio + fecha + horario + resumen + confirmación',
    (c) =>
      frame(
        c,
        'Reservar una visita',
        `<div class="app-back">${act('arrow-left')}${t('Fecha y horario')}</div>${heading('Visita al estudio', 'Elegí cuándo venir. La visita dura 30 minutos.')}<div class="booking-content stack">${components.date({ ...selected(c), variant: 'single' })}${components.time({ ...clean(c), variant: 'input', states: scenario(c, 'error') ? ['error', 'focus'] : [] })}${summary(
          [
            ['Lugar', 'Estudio Central'],
            ['Duración', '30 minutos'],
            ['Costo', 'Sin cargo'],
          ],
        )}${btn('Confirmar reserva', 'primary', '', scenario(c, 'loading') ? 'loading' : 'default')}</div>`,
      ),
    'reserva móvil servicio fecha hora',
  ),
  entry(
    'records-workspace',
    'Gestión con selección múltiple',
    'Búsqueda + tabla seleccionable + acciones de lote',
    (c) =>
      frame(
        c,
        'Materiales del equipo',
        `${actions(field('Buscar materiales', c.d.row, 'magnifying-glass'), btn('Importar', '', 'plus'))}${components['data-grid']({ ...c, embedded: true, variant: 'multiple', state: scenario(c, 'loading') ? 'loading' : 'selected', states: scenario(c, 'loading') ? ['loading'] : ['selected'] })}${scenario(c, 'error') ? components.toast({ ...clean(c), variant: 'error', options: { action: 'retry' } }) : ''}`,
      ),
    'tabla datos selección lote',
  ),
  entry(
    'support-workspace',
    'Atención de un caso',
    'Conversación + estado + asignación + datos del caso',
    (c) =>
      frame(
        c,
        'Caso 1042 · Acceso a la cuenta',
        `${actions(badge('Abierto'), btn('Marcar resuelto', 'primary'))}<div class="support-layout"><div class="app-thread">${chat({ ...c, d: { ...c.d, message: 'No puedo acceder a mi cuenta. ¿Me ayudan a recuperarla?' } })}</div><aside class="support-details stack">${heading('Datos del caso')}${field('Asignado a', c.d.person, 'caret-down')}${field('Prioridad', 'Normal', 'caret-down')}${summary(
          [
            ['Canal', 'Chat'],
            ['Creado', 'Hoy, 09:40'],
          ],
        )}${section('Cliente', `${avatar()}${t(c.d.person)}${t(c.d.email)}`)}</aside></div>`,
      ),
    'soporte atención conversación panel',
  ),
  entry(
    'product-detail',
    'Detalle de un producto',
    'Galería + descripción + variantes + compra',
    (c) =>
      frame(
        c,
        'Tienda · Iluminación',
        `<div class="app-back">${act('arrow-left')}${t('Catálogo')}</div><div class="app-product"><div class="stack">${media()}<div class="app-thumbnails">${media()}${media()}${media()}</div></div><div class="app-main">${heading('Lámpara de escritorio', 'Luz cálida regulable para tu espacio de trabajo.')}<strong class="app-price">${t('$ 48.000')}</strong>${field('Acabado', 'Grafito', 'caret-down')}${field('Cantidad', '1', 'plus')}${btn('Agregar al carrito', 'primary')}${summary(
          [
            ['Entrega', '3 a 5 días'],
            ['Devolución', 'Dentro de los 30 días'],
          ],
        )}</div></div>`,
      ),
    'tienda ecommerce producto compra',
  ),
  entry(
    'checkout',
    'Carrito y pago',
    'Contacto + entrega + pago + resumen del pedido',
    (c) =>
      frame(
        c,
        'Finalizar compra',
        `${components.steps({ ...clean(c), stepIndex: 2, stepLabels: ['Contacto', 'Entrega', 'Pago'] })}<div class="app-checkout"><div class="app-main">${heading('Datos de pago')}${field('Nombre del titular', c.d.person)}${field('Número de tarjeta', '•••• •••• •••• 4242')}<div class="app-two-fields">${field('Vencimiento', 'MM / AA')}${field('Código', '•••')}</div>${btn('Pagar $ 48.000', 'primary')}${t('Revisá tu pedido antes de confirmar el pago.')}</div><aside class="app-order">${heading('Tu pedido')}${media()}${t('Lámpara de escritorio · Grafito')}${summary(
          [
            ['Cantidad', '1'],
            ['Subtotal', '$ 48.000'],
            ['Envío', 'Sin cargo'],
            ['Total', '$ 48.000'],
          ],
        )}</aside></div>`,
      ),
    'compra checkout pago carrito',
  ),
  entry(
    'file-manager',
    'Archivos y carpetas',
    'Navegación + ruta + archivos + acciones',
    (c) =>
      frame(
        c,
        'Archivos compartidos',
        shell(
          c,
          `${actions(heading('Equipo / Diseño'), btn('Subir archivo', 'primary', 'plus'))}${field('Buscar en esta carpeta', 'Nombre de archivo', 'magnifying-glass')}<div class="app-files">${[
            ['folder', 'Referencias', '8 elementos'],
            ['folder', 'Prototipos', '3 elementos'],
            ['file', c.d.file, 'PDF · 2,4 MB'],
            ['image', 'Portada.png', 'Imagen · 860 KB'],
          ]
            .map(
              ([glyph, name, detail]) =>
                `<div class="app-file">${ico(glyph)}<div class="grow"><strong>${t(name)}</strong><small>${t(detail)}</small></div>${act('dots-three')}</div>`,
            )
            .join('')}</div>`,
          ['Archivos', 'Compartidos', 'Recientes', 'Equipo'],
          ['folder', 'link', 'file', 'user'],
        ),
      ),
    'archivos explorador carpetas documentos',
  ),
  entry(
    'article-reader',
    'Artículo y lectura',
    'Título + autor + medio + secciones + índice',
    (c) =>
      frame(
        c,
        'Publicación del equipo',
        `<div class="app-back">${act('arrow-left')}${t('Biblioteca')}<span class="grow"></span>${act('link')}</div><div class="app-reading"><article class="app-article">${heading('Diseñar una navegación que conserve el contexto', 'Por ' + c.d.person + ' · 6 min de lectura')}${media()}${section('El punto de partida', `<p>${t('Cada vista debe mostrar dónde estamos y cómo volver. La estructura permite recorrer el contenido sin perder el trabajo en curso.')}</p>`)}${section('Probar el recorrido', `<p>${t('Compará las rutas principales con tareas reales. Revisá tanto el primer acceso como el regreso a una sección anterior.')}</p>`)}</article><aside class="app-index">${heading('En este artículo')}${t('El punto de partida')}${t('Probar el recorrido')}</aside></div>`,
      ),
    'artículo lectura contenido editorial',
  ),
  entry(
    'team-profile',
    'Perfil y actividad',
    'Identidad + acción + información + actividad reciente',
    (c) =>
      frame(
        c,
        'Directorio del equipo',
        `<div class="app-back">${act('arrow-left')}${t('Equipo')}</div><div class="app-profile">${avatar()}<div class="grow">${heading(c.d.person, 'Diseño de producto · Buenos Aires')}</div>${btn('Enviar mensaje', 'primary')}</div>${tabs(['Actividad', 'Proyectos', 'Información'])}${section(
          'Actividad reciente',
          [
            ['Revisó la propuesta de navegación', 'Hoy, 10:30'],
            ['Compartió un prototipo', 'Ayer, 16:15'],
            ['Se unió al proyecto', '8 de noviembre'],
          ]
            .map(
              ([v, time]) =>
                `<div class="app-activity">${ico('check-circle')}<div class="grow">${t(v)}<small>${t(time)}</small></div></div>`,
            )
            .join(''),
        )}`,
      ),
    'perfil equipo actividad persona',
  ),
  entry(
    'notification-center',
    'Centro de notificaciones',
    'Filtros + agrupación temporal + leído + acciones',
    (c) =>
      frame(
        c,
        'Notificaciones',
        `${actions(t('2 sin leer'), btn('Marcar todas como leídas', 'text'))}${tabs(['Todas', 'Menciones', 'Asignadas'])}${section(
          'Hoy',
          [
            ['Te mencionaron en una revisión', 'Ana · Hace 10 minutos'],
            ['Te asignaron una tarea', 'Equipo de diseño · Hace 1 hora'],
          ]
            .map(
              ([v, time]) =>
                `<div class="app-activity unread" data-part="contenedor">${ico('bell')}<div class="grow"><strong>${t(v)}</strong><small>${t(time)}</small></div>${act('dots-three')}</div>`,
            )
            .join(''),
        )}${section('Ayer', `<div class="app-activity">${ico('check-circle')}<div class="grow">${t('La revisión está completa')}<small>${t('Proyecto Aurora · 17:40')}</small></div></div>`)}`,
      ),
    'avisos inbox bandeja notificaciones',
  ),
  entry(
    'video-course',
    'Curso con video',
    'Reproductor + temario + progreso + notas',
    (c) =>
      frame(
        c,
        'Fundamentos de diseño',
        `<div class="app-course"><main class="app-main">${components['video-player'](clean(c))}${heading('2. Jerarquía y composición', 'Lección 2 de 4 · 12 minutos')}${tabs(['Descripción', 'Mis notas'])}${t('Aprendé a agrupar el contenido y a construir un recorrido visual claro.')}${actions(btn('Anterior', '', 'arrow-left'), btn('Completar y continuar', 'primary', 'arrow-right'))}</main><aside class="app-lessons">${heading('Contenido del curso', '1 de 4 lecciones completadas')}${[
          ['Introducción', '5 min'],
          ['Jerarquía y composición', '12 min'],
          ['Espaciado', '8 min'],
          ['Navegación', '10 min'],
        ]
          .map(
            ([name, time], i) =>
              `<div class="app-lesson ${i === 1 ? 'is-active' : ''}" data-part="contenedor">${ico(i === 0 ? 'check-circle' : 'play')}<div class="grow">${t(name)}<small>${t(time)}</small></div></div>`,
          )
          .join('')}</aside></div>`,
      ),
    'video curso aprendizaje lecciones multimedia',
  ),
];
