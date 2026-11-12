import { graphicLayouts, type GraphicTextStyle } from './graphic-layouts';
import { clearOrigin } from './visual-placement';
import type { Anchor, Link, Material, Point, Shape, World } from './model';
import { newCanvasText } from './canvas-text';
import { illustrationAssetPrefix } from './illustration-asset';
import { ensure } from './invariants';
import { selectionBounds } from './alignment';
import { visualBounds } from './rotation';

export const graphics = {
  sequence: { name: 'Secuencia', title: 'Del boceto al afiche' },
  cycle: { name: 'Ciclo', title: 'El viaje del agua' },
  comparison: { name: 'Comparación', title: 'Dos maneras de llegar' },
  anatomy: { name: 'Imagen anotada', title: 'Anatomía de una bicicleta' },
  ...graphicLayouts,
} as const;
export type GraphicKind = keyof typeof graphics;
const ink = '#f4eee4',
  muted = '#c1ccd0';
export function graphicParts(kind: GraphicKind, uid: () => string) {
  ensure(Object.hasOwn(graphics, kind), 'GRAPHIC_KIND', 'Elegí una composición disponible.');
  const nodes: Material[] = [],
    links: Link[] = [];
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
  ) => {
    const id = uid();
    nodes.push({
      id,
      owner: null,
      x,
      y,
      width,
      height,
      data: { kind: 'shape', shape: type, title, color, fill: true, stroke: color, thickness: 1 },
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
  ) =>
    links.push({
      id: uid(),
      from,
      to,
      fromAnchor,
      toAnchor,
      thickness: 3,
      direction: 'forward',
      ...(label ? { label } : {}),
    });
  const heading = (width: number) =>
    text(graphics[kind].title, 0, 0, width, 41, { weight: 700, serif: true });
  if (kind === 'sequence') {
    heading(752);
    const stages = [
      ['pencil', 'Bocetar', 'Elegir una idea y\nprobar su silueta.'],
      ['artist-palette', 'Dar color', 'Definir la paleta\ny el contraste.'],
      ['printer', 'Imprimir', 'Llevar el afiche\ndel papel a la pared.'],
    ] as const;
    let last: string | undefined;
    stages.forEach(([key, name, detail], i) => {
      const x = i * 267;
      const id = picture(key, name, x + 55, 88, 100);
      if (last) connect(last, id, 'east', 'west');
      last = id;
      text(name, x, 206, 210, 26, { weight: 650, align: 'center' });
      text(detail, x, 249, 210, 19, { align: 'center', color: muted });
    });
  } else if (kind === 'cycle') {
    heading(750);
    const stages = [
      ['sun', 'Evaporación', 'El agua sube\ncomo vapor.', true, true],
      ['cloud-with-rain', 'Condensación', 'El vapor forma\npequeñas gotas.', false, true],
      ['droplet', 'Precipitación', 'Las gotas caen\na la superficie.', false, false],
      ['water-wave', 'Acumulación', 'El agua vuelve\na ríos y mares.', true, false],
    ] as const;
    const ids = stages.map(([key, name, detail, left, top]) => {
      const y = top ? 86 : 280,
        x = left ? 204 : 470,
        labelX = left ? 0 : 566,
        align = left ? 'right' : 'left';
      const id = picture(key, name, x, y, 76);
      text(name, labelX, y + 1, 185, 22, { weight: 650, align });
      text(detail, labelX, y + 39, 185, 17, { color: muted, align });
      return id;
    });
    connect(ids[0]!, ids[1]!, 'east', 'west');
    connect(ids[1]!, ids[2]!, 'south', 'north');
    connect(ids[2]!, ids[3]!, 'west', 'east');
    connect(ids[3]!, ids[0]!, 'north', 'south');
  } else if (kind === 'comparison') {
    heading(720);
    const columns = [
      ['bicycle', 'Bicicleta', 'Puerta a puerta', 'Elegís la salida', 'Sin boleto'],
      ['train', 'Tren', 'Entre estaciones', 'Según el servicio', 'Con pasaje'],
    ] as const;
    columns.forEach(([key, name, ...values], i) => {
      const x = 212 + 252 * i;
      picture(key, name, x + 61, 78, 82);
      text(name, x, 171, 208, 28, { align: 'center', weight: 650 });
      values.forEach((v, j) => text(v, x, 240 + j * 57, 208, 19, { align: 'center' }));
    });
    ['Recorrido', 'Horario', 'Acceso'].forEach((v, j) =>
      text(v, 0, 240 + j * 57, 168, 19, { weight: 600, color: muted }),
    );
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
    detail('Manubrio', 'Orienta la rueda\ndelantera.', true, 104, 13.5, 9.3);
    detail('Sillín', 'Sostiene a quien\npedalea.', false, 94, 20, 12.7);
    detail('Transmisión', 'Lleva la fuerza del pedal\na la rueda trasera.', false, 284, 20, 23.5);
  } else {
    heading(790);
    graphicLayouts[kind].compose({ text, shape, picture, note, connect });
  }
  return { nodes, links };
}

export function insertGraphic(world: World, kind: GraphicKind, center: Point, uid: () => string) {
  ensure(
    Number.isFinite(center.x) && Number.isFinite(center.y),
    'GEOMETRY',
    'La ubicación del gráfico no es válida.',
  );
  const { nodes, links } = graphicParts(kind, uid);
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
}
