import type { Anchor, Link, Material } from '../../src/domain/model';
import { label, note } from './materiales';

const cream = '#f7e9d0',
  quiet = '#c3d1d1',
  mint = '#a4dbcb';
const type = (
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  color = cream,
  weight = 400,
  serif = false,
) => label(id, text, x, y, width, size, color, weight, serif);
function plate(
  id: string,
  title: string,
  x: number,
  y: number,
  width: number,
  aspect: number,
): Material {
  return {
    id,
    x,
    y,
    width,
    height: width / aspect,
    owner: null,
    data: { kind: 'image', title, asset: id, mime: 'image/svg+xml', ratio: aspect },
  };
}
function wire(
  id: string,
  from: string,
  to: string,
  fromAnchor: Anchor,
  toAnchor: Anchor,
  label?: string,
): Link {
  return {
    id,
    from,
    to,
    fromAnchor,
    toAnchor,
    direction: 'forward',
    thickness: 3,
    ...(label ? { label } : {}),
  };
}

// Prueba de imprenta: la muestra ilustrada es una imagen; las decisiones y los cables se editan en Everett.
export function printProof(compact: boolean) {
  const left = compact ? -200 : -480,
    top = compact ? -313 : -227;
  function card(
    id: string,
    title: string,
    body: string,
    x: number,
    y: number,
    width: number,
    color: string,
  ): Material {
    return { ...note(id, title, body, x, y, color), width, height: compact ? 146 : 126 };
  }
  const nodes: Material[] = [
    type(
      'titulo',
      '¿Lista para la tirada?',
      left,
      top,
      compact ? 410 : 945,
      compact ? 35 : 54,
      cream,
      650,
      true,
    ),
    type(
      'bajada',
      'Una prueba a dos tintas decide el próximo paso.',
      left,
      top + (compact ? 52 : 74),
      compact ? 410 : 910,
      compact ? 17 : 22,
      quiet,
    ),
    plate(
      'prueba',
      'Afiche Ecos del río, prueba a dos tintas',
      compact ? -186 : -470,
      compact ? -201 : -84,
      compact ? 108 : 204,
      230 / 290,
    ),
    card(
      'registro',
      '¿Coinciden?',
      'Compará las cruces.',
      compact ? -191 : -132,
      compact ? -46 : -55,
      compact ? 230 : 213,
      '#e9dfca',
    ),
    card(
      'tirada',
      compact ? 'Imprimir' : 'Imprimir la tirada',
      'Conservá el ajuste.',
      compact ? -194 : 223,
      compact ? 157 : -148,
      compact ? 177 : 242,
      '#c7e2d4',
    ),
    card(
      'correccion',
      compact ? 'Corregir' : 'Ajustar el registro',
      'Mové la segunda tinta.',
      compact ? 21 : 223,
      compact ? 157 : 45,
      compact ? 177 : 242,
      '#f1cead',
    ),
  ];
  if (compact)
    nodes.push(
      type('muestra', 'Muestra de taller', -44, -158, 224, 21, mint, 650),
      type('edicion', 'Ecos del río', -44, -124, 195, 19, quiet),
    );
  else nodes.push(type('muestra', 'Muestra de taller', -470, 194, 234, 18, mint, 650));
  const links: Link[] = [
    wire('examinar', 'prueba', 'registro', compact ? 'south' : 'east', compact ? 'north' : 'west'),
    wire(
      'aprobar',
      'registro',
      'tirada',
      compact ? 'south' : 'east',
      compact ? 'north' : 'west',
      'Sí',
    ),
    wire('ajustar', 'registro', 'correccion', 'east', compact ? 'north' : 'west', 'No'),
    wire(
      'revisar',
      'correccion',
      'registro',
      compact ? 'east' : 'south',
      compact ? 'east' : 'south',
      compact ? undefined : 'Otra prueba',
    ),
  ];
  for (const link of links) if (link.from === 'registro') link.labelPlacement = 'start';
  return { width: compact ? 488 : 997, height: compact ? 695 : 500, nodes, links };
}

// El corte óptico es la imagen de referencia; cada llamada es un texto y un cable nativos.
export function pinholeCamera(compact: boolean) {
  const left = compact ? -208 : -477,
    top = compact ? -293 : -255;
  const nodes: Material[] = [
    type(
      'titulo',
      'La luz se cruza',
      left,
      top,
      compact ? 418 : 900,
      compact ? 40 : 56,
      cream,
      650,
      true,
    ),
    type(
      'bajada',
      'Seguí el rayo naranja: sale de la punta de la llama y llega abajo.',
      left,
      top + (compact ? 57 : 78),
      compact ? 414 : 920,
      compact ? 17 : 22,
      quiet,
    ),
    plate(
      'corte',
      'Corte de cámara oscura con vela y proyección invertida',
      compact ? -213 : -317,
      compact ? -84 : -51,
      compact ? 426 : 635,
      2,
    ),
  ];
  const links: Link[] = [];
  function callout(
    id: string,
    title: string,
    x: number,
    y: number,
    width: number,
    side: Anchor,
    px: number,
    py: number,
  ) {
    const txt = type(id, title, x, y, width, compact ? 18 : 21, cream, 630);
    if (txt.data.kind === 'text')
      txt.data.align = side === 'east' ? 'right' : side === 'west' ? 'left' : 'center';
    nodes.push(txt);
    links.push({
      ...wire('detalle-' + id, id, 'corte', side, 'north'),
      detail: { x: px / 600, y: py / 300 },
    });
  }
  if (compact) {
    callout('llama', 'Llama', -206, -151, 76, 'south', 66, 112);
    callout('orificio', 'Orificio', -80, -151, 92, 'south', 237, 146.5);
    callout('pantalla', 'Pantalla', 91, -151, 95, 'south', 516, 76);
    callout('invertida', 'Llama invertida', 59, 179, 147, 'north', 510, 202);
  } else {
    callout('llama', 'Llama', -471, 42, 131, 'east', 66, 112);
    callout('orificio', 'Orificio', -198, -115, 119, 'south', 237, 146.5);
    callout('pantalla', 'Pantalla', 347, -8, 125, 'west', 516, 76);
    callout('invertida', 'Llama invertida', 338, 187, 163, 'west', 510, 202);
  }
  return { nodes, links, width: compact ? 450 : 1030, height: compact ? 590 : 525 };
}
