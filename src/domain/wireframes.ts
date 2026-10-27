import type { Material, Point } from './model';

export const wireframeKinds = [
  'screen',
  'text',
  'button',
  'input',
  'card',
  'list',
  'image',
  'table',
  'menu',
] as const;
export type WireframeKind = (typeof wireframeKinds)[number];
export type WireframeContent =
  | { type: Exclude<WireframeKind, 'table'>; text: string }
  | { type: 'table'; cells: readonly (readonly string[])[] };

export const wireframeNames: Record<WireframeKind, string> = {
  screen: 'Pantalla',
  text: 'Texto',
  button: 'Botón',
  input: 'Campo',
  card: 'Tarjeta',
  list: 'Lista',
  image: 'Imagen',
  table: 'Tabla',
  menu: 'Menú',
};
export const tableLimits = { rows: 100, columns: 20, text: 100_000 };
export function validWireframe(value: unknown): value is WireframeContent {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (!wireframeKinds.includes(data.type as WireframeKind)) return false;
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
    text: [260, 80],
    button: [150, 44],
    input: [240, 44],
    card: [260, 180],
    list: [240, 150],
    image: [260, 180],
    table: [360, 180],
    menu: [210, 170],
  };
  const text: Record<Exclude<WireframeKind, 'table'>, string> = {
    screen: 'Pantalla',
    text: 'Escribí tu idea',
    button: 'Continuar',
    input: 'Buscar…',
    card: 'Título de tarjeta\nDescripción de contenido',
    list: 'Primer elemento\nSegundo elemento\nTercer elemento',
    image: 'Imagen',
    menu: 'Inicio\nProyectos\nConfiguración',
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
          : { type, text: text[type] },
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
