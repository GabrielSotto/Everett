import svg0 from '../../../../design/wireframe-library/vendor/arrow-left.svg?raw';
import svg1 from '../../../../design/wireframe-library/vendor/arrow-right.svg?raw';
import svg2 from '../../../../design/wireframe-library/vendor/arrow-up.svg?raw';
import svg3 from '../../../../design/wireframe-library/vendor/bell.svg?raw';
import svg4 from '../../../../design/wireframe-library/vendor/calendar-blank.svg?raw';
import svg5 from '../../../../design/wireframe-library/vendor/caret-down.svg?raw';
import svg6 from '../../../../design/wireframe-library/vendor/check.svg?raw';
import svg7 from '../../../../design/wireframe-library/vendor/check-circle.svg?raw';
import svg8 from '../../../../design/wireframe-library/vendor/copy.svg?raw';
import svg9 from '../../../../design/wireframe-library/vendor/dots-three.svg?raw';
import svg10 from '../../../../design/wireframe-library/vendor/eye.svg?raw';
import svg11 from '../../../../design/wireframe-library/vendor/file.svg?raw';
import svg12 from '../../../../design/wireframe-library/vendor/folder.svg?raw';
import svg13 from '../../../../design/wireframe-library/vendor/gear-six.svg?raw';
import svg14 from '../../../../design/wireframe-library/vendor/image.svg?raw';
import svg15 from '../../../../design/wireframe-library/vendor/info.svg?raw';
import svg16 from '../../../../design/wireframe-library/vendor/link.svg?raw';
import svg17 from '../../../../design/wireframe-library/vendor/magnifying-glass.svg?raw';
import svg18 from '../../../../design/wireframe-library/vendor/minus.svg?raw';
import svg19 from '../../../../design/wireframe-library/vendor/paper-plane-tilt.svg?raw';
import svg20 from '../../../../design/wireframe-library/vendor/paperclip.svg?raw';
import svg21 from '../../../../design/wireframe-library/vendor/pencil-simple.svg?raw';
import svg22 from '../../../../design/wireframe-library/vendor/play.svg?raw';
import svg23 from '../../../../design/wireframe-library/vendor/plus.svg?raw';
import svg24 from '../../../../design/wireframe-library/vendor/rows.svg?raw';
import svg25 from '../../../../design/wireframe-library/vendor/sidebar-simple.svg?raw';
import svg26 from '../../../../design/wireframe-library/vendor/sliders-horizontal.svg?raw';
import svg27 from '../../../../design/wireframe-library/vendor/squares-four.svg?raw';
import svg28 from '../../../../design/wireframe-library/vendor/trash.svg?raw';
import svg29 from '../../../../design/wireframe-library/vendor/user.svg?raw';
import svg30 from '../../../../design/wireframe-library/vendor/warning-circle.svg?raw';
import svg31 from '../../../../design/wireframe-library/vendor/x.svg?raw';

/** Recursos locales incluidos al cargar Everett; la biblioteca no depende de peticiones tardías. */
const symbols: Record<string, string> = {
  'arrow-left': 'data:image/svg+xml,' + encodeURIComponent(svg0),
  'arrow-right': 'data:image/svg+xml,' + encodeURIComponent(svg1),
  'arrow-up': 'data:image/svg+xml,' + encodeURIComponent(svg2),
  bell: 'data:image/svg+xml,' + encodeURIComponent(svg3),
  'calendar-blank': 'data:image/svg+xml,' + encodeURIComponent(svg4),
  'caret-down': 'data:image/svg+xml,' + encodeURIComponent(svg5),
  check: 'data:image/svg+xml,' + encodeURIComponent(svg6),
  'check-circle': 'data:image/svg+xml,' + encodeURIComponent(svg7),
  copy: 'data:image/svg+xml,' + encodeURIComponent(svg8),
  'dots-three': 'data:image/svg+xml,' + encodeURIComponent(svg9),
  eye: 'data:image/svg+xml,' + encodeURIComponent(svg10),
  file: 'data:image/svg+xml,' + encodeURIComponent(svg11),
  folder: 'data:image/svg+xml,' + encodeURIComponent(svg12),
  'gear-six': 'data:image/svg+xml,' + encodeURIComponent(svg13),
  image: 'data:image/svg+xml,' + encodeURIComponent(svg14),
  info: 'data:image/svg+xml,' + encodeURIComponent(svg15),
  link: 'data:image/svg+xml,' + encodeURIComponent(svg16),
  'magnifying-glass': 'data:image/svg+xml,' + encodeURIComponent(svg17),
  minus: 'data:image/svg+xml,' + encodeURIComponent(svg18),
  'paper-plane-tilt': 'data:image/svg+xml,' + encodeURIComponent(svg19),
  paperclip: 'data:image/svg+xml,' + encodeURIComponent(svg20),
  'pencil-simple': 'data:image/svg+xml,' + encodeURIComponent(svg21),
  play: 'data:image/svg+xml,' + encodeURIComponent(svg22),
  plus: 'data:image/svg+xml,' + encodeURIComponent(svg23),
  rows: 'data:image/svg+xml,' + encodeURIComponent(svg24),
  'sidebar-simple': 'data:image/svg+xml,' + encodeURIComponent(svg25),
  'sliders-horizontal': 'data:image/svg+xml,' + encodeURIComponent(svg26),
  'squares-four': 'data:image/svg+xml,' + encodeURIComponent(svg27),
  trash: 'data:image/svg+xml,' + encodeURIComponent(svg28),
  user: 'data:image/svg+xml,' + encodeURIComponent(svg29),
  'warning-circle': 'data:image/svg+xml,' + encodeURIComponent(svg30),
  x: 'data:image/svg+xml,' + encodeURIComponent(svg31),
};
export function librarySymbol(name: string): string {
  const source = symbols[name];
  if (!source) throw new Error('El símbolo de esta pieza no está disponible. Elegí otra variante.');
  return source;
}
