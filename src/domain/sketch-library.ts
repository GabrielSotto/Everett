import type { CanvasGroup, Material, Point } from './model';
import { validWireframe, type WireframeContent } from './wireframes';

export interface LibraryPart {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  content: WireframeContent;
}
export interface LibraryComposition {
  name: string;
  width: number;
  height: number;
  parts: LibraryPart[];
}
export function validLibraryComposition(value: LibraryComposition): boolean {
  return (
    !!value &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    value.name.length <= 200 &&
    [value.width, value.height].every((n) => Number.isFinite(n) && n > 0 && n <= 10000) &&
    Array.isArray(value.parts) &&
    value.parts.length > 0 &&
    value.parts.length <= 2000 &&
    value.parts.every(
      (p) =>
        p &&
        typeof p.name === 'string' &&
        p.name.length <= 200 &&
        [p.x, p.y, p.width, p.height].every(Number.isFinite) &&
        p.width >= 4 &&
        p.height >= 4 &&
        p.width <= 10000 &&
        p.height <= 10000 &&
        Math.abs(p.x) <= 10000 &&
        Math.abs(p.y) <= 10000 &&
        validWireframe(p.content) &&
        !!p.content.piece,
    )
  );
}
/** La receta se materializa una vez; editar una copia nunca modifica el catálogo. */
export function instantiateLibrary(
  composition: LibraryComposition,
  id: string,
  center: Point,
): { nodes: Material[]; group?: CanvasGroup } {
  const nodes = composition.parts.map((p, index): Material => ({
    id: index ? `${id}-${index}` : id,
    x: center.x - composition.width / 2 + p.x,
    y: center.y - composition.height / 2 + p.y,
    width: p.width,
    height: p.height,
    owner: null,
    data: { kind: 'wireframe', title: p.name, content: structuredClone(p.content) },
  }));
  return {
    nodes,
    ...(nodes.length > 1
      ? { group: { id: `${id}-group`, name: composition.name, nodes: nodes.map((n) => n.id) } }
      : {}),
  };
}
