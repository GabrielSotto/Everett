import type { PartData } from './composition-materials';
import { pieceStyleKeys } from './sketch-pieces';
import type { DeepReadonly } from './readonly';
import { wireframeAppearance, type WireframeAppearance } from './wireframes';

type Data = DeepReadonly<PartData>;
type Property = { key: string; label: string; paths: string[] };
const field = (key: string, label: string): Property => ({ key, label, paths: [key] });
const title = field('title', 'Nombre de capa');
const labelFields = (labels: Record<string, string>, prefix = '') =>
  Object.entries(labels).map(([key, label]) => field(prefix + key, label));
const properties: Record<PartData['kind'], Property[]> = {
  image: [
    title,
    { key: 'image', label: 'Imagen', paths: ['asset', 'mime', 'ratio', 'preview', 'source'] },
  ],
  text: [
    title,
    ...labelFields({
      text: 'Texto',
      font: 'Tipografía',
      weight: 'Peso',
      italic: 'Cursiva',
      size: 'Tamaño de letra',
      color: 'Color del texto',
      align: 'Alineación',
      sizing: 'Ajuste del texto',
    }),
  ],
  shape: [
    title,
    ...labelFields({
      shape: 'Forma',
      color: 'Color',
      fill: 'Relleno',
      stroke: 'Borde',
      thickness: 'Grosor',
    }),
  ],
  wireframe: [
    title,
    ...labelFields(
      { text: 'Texto', cells: 'Celdas', placeholder: 'Texto simulado', placeholderLines: 'Líneas' },
      'content.',
    ),
    ...labelFields(
      { fill: 'Relleno', stroke: 'Borde', text: 'Color del texto', radius: 'Radio de esquina' },
      'content.appearance.',
    ),
    ...labelFields(
      {
        symbol: 'Símbolo',
        symbolVariant: 'Variante del símbolo',
        paths: 'Trazado',
        viewBox: 'Encuadre',
        rotation: 'Rotación del símbolo',
        label: 'Rótulo',
        autoInk: 'Tinta automática',
        placeholderColor: 'Color de barras',
        ink: 'Medidas de tinta',
        clip: 'Recorte',
      },
      'content.piece.',
    ),
    ...pieceStyleKeys.map((k) => field('content.piece.style.' + k, styleLabel(k))),
  ],
};

function styleLabel(key: string): string {
  const labels: Record<string, string> = {
    backgroundColor: 'Relleno',
    backgroundImage: 'Imagen de fondo',
    color: 'Color del texto',
    borderRadius: 'Radio de esquina',
    fontSize: 'Tamaño de letra',
    fontWeight: 'Peso',
    fontStyle: 'Estilo de letra',
    lineHeight: 'Interlineado',
    letterSpacing: 'Espaciado entre letras',
    textAlign: 'Alineación',
    textDecorationLine: 'Decoración',
    textTransform: 'Mayúsculas',
    textShadow: 'Sombra de texto',
    opacity: 'Opacidad',
    boxShadow: 'Sombra',
    outline: 'Contorno',
    outlineOffset: 'Distancia del contorno',
  };
  const border = /^border(Top|Right|Bottom|Left)(Width|Color|Style)$/.exec(key);
  if (border)
    return (
      ({ Width: 'Grosor', Color: 'Color', Style: 'Estilo' }[border[2]!] ?? '') +
      ' del borde ' +
      ({ Top: 'superior', Right: 'derecho', Bottom: 'inferior', Left: 'izquierdo' }[border[1]!] ??
        '')
    );
  return labels[key] ?? key;
}
function read(data: Data, path: string): unknown {
  if (
    path === 'content.piece.symbolVariant' &&
    data.kind === 'wireframe' &&
    data.content.piece?.symbol
  )
    return data.content.piece.symbolVariant ?? 'regular';
  if (data.kind === 'wireframe' && path.startsWith('content.appearance.')) {
    return wireframeAppearance(data.content)[
      path.slice('content.appearance.'.length) as keyof WireframeAppearance
    ];
  }
  let value: unknown = data;
  for (const key of path.split('.')) value = (value as Record<string, unknown> | undefined)?.[key];
  return value;
}
function compatible(a: Data, b: Data) {
  return (
    a.kind === b.kind &&
    (a.kind !== 'wireframe' ||
      (b.kind === 'wireframe' &&
        a.content.type === b.content.type &&
        !!a.content.piece === !!b.content.piece))
  );
}
/** Se comparan propiedades contra la revisión aceptada, nunca contra el orden ni el nombre de la capa. */
export function localProperties(base: Data, current: Data, retained: readonly string[] = []) {
  if (!compatible(base, current)) return [];
  return properties[current.kind].filter(
    (p) =>
      retained.includes(p.key) ||
      (!(
        p.key.startsWith('content.appearance.') &&
        base.kind === 'wireframe' &&
        current.kind === 'wireframe' &&
        !base.content.appearance &&
        !current.content.appearance
      ) &&
        p.paths.some(
          (path) => JSON.stringify(read(base, path)) !== JSON.stringify(read(current, path)),
        )),
  );
}
export function copyProperty(target: PartData, source: Data, property: Property) {
  if (!compatible(target, source)) return false;
  if (
    property.key === 'content.piece.symbolVariant' &&
    target.kind === 'wireframe' &&
    !target.content.piece?.symbol
  )
    return false;
  if (
    target.kind === 'wireframe' &&
    property.key.startsWith('content.appearance.') &&
    !target.content.appearance
  ) {
    target.content.appearance = wireframeAppearance(target.content);
  }
  pathLoop: for (const path of property.paths) {
    const keys = path.split('.');
    const last = keys.pop()!;
    let dest = target as unknown as Record<string, unknown>;
    const value = read(source, path);
    for (const key of keys) {
      if (!dest[key]) {
        if (value === undefined) continue pathLoop;
        dest[key] = {};
      }
      dest = dest[key] as Record<string, unknown>;
    }
    if (value === undefined) delete dest[last];
    else dest[last] = structuredClone(value);
  }
  return true;
}
export { compatible as compatiblePartData };
