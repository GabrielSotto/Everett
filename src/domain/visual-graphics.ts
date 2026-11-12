import { graphicLayouts, type GraphicTextStyle } from './graphic-layouts';
import { clearOrigin } from './visual-placement';
import type { Anchor, CanvasGroup, Link, Material, Point, Shape, World } from './model';
import { newCanvasText } from './canvas-text';
import { illustrationAssetPrefix } from './illustration-asset';
import { ensure } from './invariants';
import { selectionBounds } from './alignment';
import { visualBounds } from './rotation';

export const graphics = {
  sequence: { name: 'Secuencia', title: 'Del boceto al afiche' },
  cycle: { name: 'Ciclo', title: 'La vuelta del vaso retornable' },
  comparison: { name: 'Comparación', title: 'Dos maneras de llegar' },
  anatomy: { name: 'Imagen anotada', title: 'Antes de salir en bicicleta' },
  ...graphicLayouts,
} as const;
export type GraphicKind = keyof typeof graphics;
const ink = '#f4eee4',
  muted = '#c1ccd0';
export function graphicParts(kind: GraphicKind, uid: () => string) {
  ensure(Object.hasOwn(graphics, kind), 'GRAPHIC_KIND', 'Elegí una composición disponible.');
  const nodes: Material[] = [],
    links: Link[] = [],
    groups: CanvasGroup[] = [];
  const text = (
    value: string,
    x: number,
    y: number,
    width: number,
    size: number,
    style: GraphicTextStyle = {},
  ) => {
    const id = uid();
    nodes.push({
      id,
      owner: null,
      x,
      y,
      width,
      height: Math.ceil(size * 1.45) * value.split('\n').length,
      data: {
        ...newCanvasText('wrap'),
        text: value,
        color: style.color ?? ink,
        weight: style.weight ?? 400,
        font: style.serif ? 'serif' : 'sans',
        align: style.align ?? 'left',
        size,
      },
    });
    return id;
  };
  const picture = (key: string, title: string, x: number, y: number, size: number) => {
    const id = uid();
    nodes.push({
      id,
      owner: null,
      x,
      y,
      width: size,
      height: size,
      data: {
        kind: 'image',
        asset: illustrationAssetPrefix + key,
        mime: 'image/svg+xml',
        ratio: 1,
        title,
      },
    });
    return id;
  };
  const shape = (
    type: Shape,
    title: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    appearance?: { fill?: boolean; stroke?: string; thickness?: number },
  ) => {
    const id = uid();
    nodes.push({
      id,
      owner: null,
      x,
      y,
      width,
      height,
      data: {
        kind: 'shape',
        shape: type,
        title,
        color,
        fill: true,
        stroke: color,
        thickness: 1,
        ...appearance,
      },
    });
    return id;
  };
  const note = (
    title: string,
    body: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) => {
    const id = uid();
    nodes.push({
      id,
      owner: null,
      x,
      y,
      width,
      height,
      data: { kind: 'note', title, text: body, color },
    });
    return id;
  };
  const connect = (
    from: string,
    to: string,
    fromAnchor: Anchor,
    toAnchor: Anchor,
    label?: string,
    style?: Pick<Link, 'direction' | 'path'>,
  ) =>
    links.push({
      id: uid(),
      from,
      to,
      fromAnchor,
      toAnchor,
      thickness: 3,
      direction: 'forward',
      ...style,
      ...(label ? { label } : {}),
    });
  const heading = (width: number) =>
    text(graphics[kind].title, 0, 0, width, 41, { weight: 700, serif: true });
  if (kind === 'sequence') {
    heading(752);
    const stages = [
      ['pencil', 'Bocetar', 'Probar la silueta\na tamaño de afiche.'],
      ['artist-palette', 'Dar color', 'Preparar el archivo\ncon la paleta elegida.'],
      ['clipboard', 'Aprobar la prueba', 'El cliente firma\nla muestra impresa.'],
      ['printer', 'Imprimir', 'La imprenta recibe\nla prueba firmada.'],
    ] as const;
    let last: string | undefined;
    stages.forEach(([key, name, detail], i) => {
      const x = i * 231;
      const id = picture(key, name, x + 63, 103, 90);
      if (last) connect(last, id, 'east', 'west');
      last = id;
      text(name, x, 224, 218, 22, { weight: 650, align: 'center' });
      text(detail, x, 274, 218, 18, { color: muted, align: 'center' });
    });
    shape('rectangle', 'Franja de control', 0, 390, 8, 76, '#efb87c');
    text('Si la prueba sale oscura', 26, 390, 370, 23, { weight: 650 });
    text('Volvé a color y presentá otra muestra antes de autorizar la tirada.', 26, 435, 822, 19);
  } else if (kind === 'cycle') {
    heading(780);
    const stages = [
      [
        'glass-of-milk',
        'Entregar',
        'La barra recibe el depósito\ny presta un vaso limpio.',
        true,
        true,
      ],
      [
        'hot-beverage',
        'Usar',
        'La persona conserva el vaso\nmientras recorre la feria.',
        false,
        true,
      ],
      [
        'basket',
        'Devolver',
        'El puesto de retorno recibe\nel vaso y reintegra la seña.',
        false,
        false,
      ],
      ['soap', 'Lavar', 'Lavar, secar y revisar\nantes de volver a la barra.', true, false],
    ] as const;
    const ids = stages.map(([key, name, detail, left, top]) => {
      const y = top ? 116 : 337,
        x = left ? 265 : 482,
        labelX = left ? 0 : 586,
        align = left ? 'right' : 'left';
      const id = picture(key, name, x, y, 76);
      text(name, labelX, y + 1, 248, 22, { weight: 650, align });
      text(detail, labelX, y + 39, 248, 17, { color: muted, align });
      return id;
    });
    connect(ids[0]!, ids[1]!, 'east', 'west');
    connect(ids[1]!, ids[2]!, 'south', 'north');
    connect(ids[2]!, ids[3]!, 'west', 'east');
    connect(ids[3]!, ids[0]!, 'north', 'south');
    text('Salida del circuito', 0, 484, 230, 22, { color: '#efb87c', weight: 650 });
    text('Si aparece una fisura en el lavado, apartar el vaso para reposición.', 254, 484, 565, 19);
  } else if (kind === 'comparison') {
    heading(720);
    const columns = [
      [
        'bicycle',
        'Bicicleta',
        'Puerta a puerta',
        'Elegís la salida',
        'Sin boleto',
        '35 min en total',
        'Se puede salir ya',
      ],
      [
        'train',
        'Tren',
        'Entre estaciones',
        'Según el servicio',
        'Con pasaje',
        '22 min + espera',
        'Parte a las 08:40',
      ],
    ] as const;
    columns.forEach(([key, name, ...values], i) => {
      const x = 212 + 252 * i;
      picture(key, name, x + 61, 78, 82);
      text(name, x, 171, 208, 28, { align: 'center', weight: 650 });
      values.forEach((v, j) => text(v, x, 240 + j * 57, 208, 19, { align: 'center' }));
    });
    ['Recorrido', 'Horario', 'Acceso', 'Trayecto', 'Salida hoy'].forEach((v, j) =>
      text(v, 0, 240 + j * 57, 168, 19, { weight: 600, color: muted }),
    );
    text('Turno de las 09:00', 0, 563, 252, 24, { color: '#efb87c', weight: 650 });
    text('Son las 08:20. ¿Qué opción permite llegar a tiempo?', 226, 563, 503, 20);
  } else if (kind === 'anatomy') {
    heading(772);
    // Los tres destinos son puntos concretos del dibujo de bicicleta en su viewBox de 32 × 32.
    const x = 240,
      y = 66,
      size = 288;
    const bike = picture('bicycle', 'Bicicleta', x, y, size);
    const detail = (
      name: string,
      desc: string,
      left: boolean,
      top: number,
      tx: number,
      ty: number,
    ) => {
      const labelX = left ? 0 : 555,
        align = left ? 'right' : 'left';
      const caption = text(name, labelX, top, 202, 24, { weight: 650, align });
      text(desc, labelX, top + 35, 202, 17, { color: muted, align });
      links.push({
        id: uid(),
        from: caption,
        to: bike,
        fromAnchor: left ? 'east' : 'west',
        toAnchor: left ? 'west' : 'east',
        direction: 'forward',
        thickness: 3,
        detail: { x: tx / 32, y: ty / 32 },
      });
    };
    detail('Manubrio', 'Alineado con la rueda\ny sin juego al girar.', true, 104, 13.5, 9.3);
    detail('Sillín', 'Firme al tirar de él;\nrevisar la abrazadera.', false, 94, 20, 12.7);
    detail('Transmisión', 'Al pedalear, la cadena\ndebe correr sin saltos.', false, 284, 20, 23.5);
    text('Prueba en parado', 0, 399, 241, 24, { color: '#efb87c', weight: 650 });
    text(
      'Si la cadena salta o el manubrio tiene juego, corregilo antes de pedalear.',
      255,
      399,
      524,
      19,
    );
  } else {
    heading(904);
    graphicLayouts[kind].compose({
      text,
      shape,
      picture,
      note,
      connect,
      group(name, members) {
        groups.push({ id: uid(), name, nodes: members });
      },
      bars(title, rows, x, y, width, height) {
        nodes.push({
          id: uid(),
          owner: null,
          x,
          y,
          width,
          height,
          data: { kind: 'bars', title, rows: structuredClone(rows) },
        });
      },
    });
  }
  return { nodes, links, groups };
}

export function insertGraphic(world: World, kind: GraphicKind, center: Point, uid: () => string) {
  ensure(
    Number.isFinite(center.x) && Number.isFinite(center.y),
    'GEOMETRY',
    'La ubicación del gráfico no es válida.',
  );
  const { nodes, links, groups } = graphicParts(kind, uid);
  const bounds = selectionBounds(nodes);
  const visible = new Map(world.nodes.filter((n) => !n.owner).map((n) => [n.id, n]));
  const origin = clearOrigin(
    { x: center.x - bounds.width / 2, y: center.y - bounds.height / 2 },
    bounds,
    [
      ...Array.from(visible.values(), visualBounds),
      ...world.zones,
      ...(world.canvasGroups ?? []).flatMap((g) => {
        const members = g.nodes.flatMap((id) => visible.get(id) ?? []);
        return members.length ? [selectionBounds(members)] : [];
      }),
    ],
    48,
  );
  for (const n of nodes) {
    n.x += origin.x - bounds.x;
    n.y += origin.y - bounds.y;
  }
  world.nodes.push(...nodes);
  world.links.push(...links);
  if (groups.length) (world.canvasGroups ??= []).push(...groups);
}
