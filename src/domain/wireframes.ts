import type { Material, Point } from './model';

export const wireframeKinds = [
  'screen',
  'block',
  'text',
  'button',
  'input',
  'card',
  'list',
  'image',
  'table',
  'menu',
  'video',
  'carousel',
] as const;
export type WireframeKind = (typeof wireframeKinds)[number];
export interface WireframeAppearance {
  fill: string;
  stroke: string;
  text: string;
  radius: number;
}
export type WireframeContent = (
  | { type: Exclude<WireframeKind, 'table'>; text: string }
  | { type: 'table'; cells: readonly (readonly string[])[] }
) & { appearance?: WireframeAppearance; placeholder?: boolean; placeholderLines?: number };
export function wireframeAppearance(content: WireframeContent): WireframeAppearance {
  return content.appearance ?? { fill: '#fbfaf6', stroke: '#485361', text: '#26323c', radius: 0 };
}

export const wireframeNames: Record<WireframeKind, string> = {
  screen: 'Pantalla',
  block: 'Bloque',
  text: 'Texto',
  button: 'Botón',
  input: 'Campo',
  card: 'Tarjeta',
  list: 'Lista',
  image: 'Imagen',
  table: 'Tabla',
  menu: 'Menú',
  video: 'Video',
  carousel: 'Carrusel',
};
export const tableLimits = { rows: 100, columns: 20, text: 100_000 };
export function validWireframe(value: unknown): value is WireframeContent {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (!wireframeKinds.includes(data.type as WireframeKind)) return false;
  if (data.placeholder !== undefined && typeof data.placeholder !== 'boolean') return false;
  if (
    data.placeholderLines !== undefined &&
    (!Number.isInteger(data.placeholderLines) ||
      Number(data.placeholderLines) < 1 ||
      Number(data.placeholderLines) > 12)
  )
    return false;
  if (data.appearance !== undefined) {
    if (!data.appearance || typeof data.appearance !== 'object') return false;
    const style = data.appearance as Record<string, unknown>;
    if (
      !['fill', 'stroke', 'text'].every(
        (key) => typeof style[key] === 'string' && /^#[\da-f]{6}([\da-f]{2})?$/i.test(style[key]),
      ) ||
      typeof style.radius !== 'number' ||
      !Number.isFinite(style.radius) ||
      style.radius < 0 ||
      style.radius > 10000
    )
      return false;
  }
  if (data.type !== 'table')
    return typeof data.text === 'string' && data.text.length <= tableLimits.text;
  if (!Array.isArray(data.cells) || !data.cells.length || data.cells.length > tableLimits.rows)
    return false;
  const columns = Array.isArray(data.cells[0]) ? data.cells[0].length : 0;
  let characters = 0;
  return (
    columns > 0 &&
    columns <= tableLimits.columns &&
    data.cells.every(
      (row) =>
        Array.isArray(row) &&
        row.length === columns &&
        row.every(
          (cell) => typeof cell === 'string' && (characters += cell.length) <= tableLimits.text,
        ),
    )
  );
}
export function wireframeText(content: WireframeContent): string {
  return content.type === 'table'
    ? content.cells.map((row) => row.join('\t')).join('\n')
    : content.text;
}
export function wireframeMaterial(type: WireframeKind, id: string, center: Point): Material {
  const sizes: Record<WireframeKind, [number, number]> = {
    screen: [720, 480],
    block: [160, 100],
    text: [180, 32],
    button: [150, 44],
    input: [240, 44],
    card: [260, 180],
    list: [240, 150],
    image: [260, 180],
    table: [360, 180],
    menu: [210, 170],
    video: [320, 180],
    carousel: [360, 200],
  };
  const text: Record<Exclude<WireframeKind, 'table'>, string> = {
    screen: 'Pantalla',
    block: '',
    text: 'Escribí tu idea',
    button: 'Continuar',
    input: 'Buscar…',
    card: 'Título de tarjeta\nDescripción de contenido',
    list: 'Primer elemento\nSegundo elemento\nTercer elemento',
    image: 'Imagen',
    menu: 'Inicio\nProyectos\nConfiguración',
    video: 'Video',
    carousel: 'Imagen 1\nImagen 2\nImagen 3',
  };
  const [width, height] = sizes[type];
  return {
    id,
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    owner: null,
    data: {
      kind: 'wireframe',
      title: wireframeNames[type],
      content:
        type === 'table'
          ? {
              type,
              cells: [
                ['Nombre', 'Estado', 'Responsable'],
                ['Elemento', 'Pendiente', 'Sin asignar'],
                ['Otro elemento', 'En curso', 'Sin asignar'],
              ],
            }
          : {
              type,
              text: text[type],
              ...(['text', 'button', 'input', 'card', 'list', 'menu'].includes(type)
                ? { placeholder: true }
                : {}),
            },
    },
  };
}

/** Pegar celdas es atómico: ampliar la matriz sin mutar su entrada ni truncar contenido. */
export function pasteWireframeCells(
  cells: readonly (readonly string[])[],
  row: number,
  column: number,
  text: string,
): string[][] | null {
  // Acotar antes de separar texto recibido del portapapeles.
  if (text.length > tableLimits.text + tableLimits.rows * (tableLimits.columns + 1)) return null;
  const pasted = text
    .replace(/\r\n?/g, '\n')
    .replace(/\n$/, '')
    .split('\n', tableLimits.rows + 1)
    .map((line) => line.split('\t', tableLimits.columns + 1));
  const rows = Math.max(cells.length, row + pasted.length);
  const columns = Math.max(
    cells[0]?.length ?? 1,
    column + Math.max(...pasted.map((line) => line.length)),
  );
  if (
    row < 0 ||
    column < 0 ||
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    rows > tableLimits.rows ||
    columns > tableLimits.columns
  )
    return null;
  const result = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (_, c) => cells[r]?.[c] ?? ''),
  );
  pasted.forEach((line, r) =>
    line.forEach((cell, c) => {
      result[row + r]![column + c] = cell;
    }),
  );
  return validWireframe({ type: 'table', cells: result }) ? result : null;
}
