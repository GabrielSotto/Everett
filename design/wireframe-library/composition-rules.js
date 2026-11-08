// Reglas de esta propuesta visual, compartidas por muestras y escenarios completos.
// No implementan un motor de auto-layout de Canvas.
export const compositionRules = {
  control: {
    width: 320,
    minWidth: 180,
    maxWidth: 560,
    title: 'Control',
    description:
      'Rótulo encima del valor; iconos y marcas conservan tamaño. El texto usa el espacio restante y aumenta el alto al envolver. Separación interna de 8 px.',
  },
  collection: {
    width: 480,
    minWidth: 240,
    maxWidth: 880,
    title: 'Colección',
    description:
      'Las filas crecen con su texto; los accesorios mantienen su tamaño. Las cabeceras permanecen con sus datos y las columnas conservan un mínimo legible con desplazamiento horizontal.',
  },
  panel: {
    width: 400,
    minWidth: 240,
    maxWidth: 720,
    title: 'Panel',
    description:
      'Cabecera, contenido y acciones mantienen su jerarquía. El cuerpo crece con el texto; el cierre no se comprime. Márgenes de 16 px y separación entre secciones de 16 px.',
  },
  media: {
    width: 360,
    minWidth: 180,
    maxWidth: 720,
    title: 'Medio',
    description:
      'La región conserva la proporción 16:9. Iconos y controles mantienen tamaño; el texto complementario ocupa su propia región.',
  },
  navigation: {
    width: 400,
    minWidth: 220,
    maxWidth: 800,
    title: 'Navegación',
    description:
      'Destino actual, foco y disponibilidad son independientes. Los iconos conservan tamaño; rótulos y grupos usan el ancho disponible sin mezclar navegación con acciones.',
  },
  screen: {
    width: 720,
    minWidth: 280,
    maxWidth: 1120,
    title: 'Interfaz compuesta',
    description:
      'Marco → regiones → componentes → piezas. Encabezados y acciones conservan jerarquía; contenido flexible y medios proporcionales. Las columnas tienen mínimos y su propio desplazamiento cuando hace falta.',
  },
  mobile: {
    width: 360,
    minWidth: 280,
    maxWidth: 480,
    title: 'Interfaz móvil',
    description:
      'Una columna con márgenes de 16 px. Contenido por secciones y navegación al borde inferior. El alto crece con el contenido y el texto sin comprimir los controles.',
  },
  primitive: {
    width: 320,
    minWidth: 180,
    maxWidth: 640,
    title: 'Pieza',
    description:
      'La geometría es independiente del contenido. Formas y regiones admiten tamaño; líneas e iconos conservan grosor. Texto, relleno y símbolo permanecen separados.',
  },
};
export function ruleFor(item) {
  if (['booking-mobile', 'mobile-inbox', 'mobile-catalog'].includes(item.id))
    return compositionRules.mobile;
  if (['tablet-workspace', 'tablet-planner'].includes(item.id))
    return { ...compositionRules.screen, width: 800, minWidth: 600, maxWidth: 1120 };
  if (item.family === 'screens') return compositionRules.screen;
  if (['image', 'video', 'media-card', 'carousel', 'gallery', 'video-player'].includes(item.id))
    return compositionRules.media;
  if (['list', 'table', 'data-grid', 'file-browser'].includes(item.id))
    return compositionRules.collection;
  if (
    [
      'drawer',
      'bottom-sheet',
      'dialog',
      'popover',
      'chat',
      'composer',
      'inspector',
      'split-pane',
    ].includes(item.id)
  )
    return compositionRules.panel;
  if (item.family === 'base') return compositionRules.primitive;
  if (item.family === 'navigation') return compositionRules.navigation;
  return compositionRules.control;
}
