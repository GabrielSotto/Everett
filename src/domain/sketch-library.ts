import { validRotation } from './rotation';
import type { CanvasGroup, Material, Point, Rect } from './model';
import { validWireframe, type WireframeContent } from './wireframes';
import {
  validComponentTree,
  treeFromMaterials,
  componentElements,
  type ComponentTree,
} from './component-tree';

export interface LibraryPart {
  rotation?: number;
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
  component?: boolean;
  structure?: ComponentTree;
}
export function validLibraryComposition(value: LibraryComposition): boolean {
  return (
    !!value &&
    typeof value.name === 'string' &&
    (value.component === undefined || typeof value.component === 'boolean') &&
    value.name.length > 0 &&
    value.name.length <= 200 &&
    [value.width, value.height].every((n) => Number.isFinite(n) && n > 0 && n <= 10000) &&
    Array.isArray(value.parts) &&
    value.parts.length > 0 &&
    value.parts.length <= 2000 &&
    (value.structure === undefined ||
      validComponentTree(
        value.structure,
        value.parts.map((_, i) => String(i)),
      )) &&
    value.parts.every(
      (p) =>
        p &&
        validRotation(p.rotation) &&
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
/** El espacio reservado por el catálogo no forma parte del material insertado. */
export function libraryBounds(composition: LibraryComposition): Rect {
  if (composition.structure) return { ...composition.structure.root };
  const x = Math.min(...composition.parts.map((p) => p.x));
  const y = Math.min(...composition.parts.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...composition.parts.map((p) => p.x + p.width)) - x,
    height: Math.max(...composition.parts.map((p) => p.y + p.height)) - y,
  };
}

/** La receta se materializa una vez; editar una copia nunca modifica el catálogo. */
export function instantiateLibrary(
  composition: LibraryComposition,
  id: string,
  center: Point,
  forceGroup = false,
): { nodes: Material[]; group?: CanvasGroup } {
  const bounds = libraryBounds(composition);
  const nodes = composition.parts.map((p, index): Material => ({
    id: index ? `${id}-${index}` : id,
    x: center.x - bounds.width / 2 + p.x - bounds.x,
    y: center.y - bounds.height / 2 + p.y - bounds.y,
    width: p.width,
    height: p.height,
    ...(p.rotation ? { rotation: p.rotation } : {}),
    owner: null,
    data: { kind: 'wireframe', title: p.name, content: structuredClone(p.content) },
  }));
  const structure = composition.structure
    ? structuredClone(composition.structure)
    : treeFromMaterials(nodes, composition.name);
  if (composition.structure) {
    for (const element of componentElements(structure.root))
      if (element.material !== undefined)
        (element as import('./component-tree').ComponentElement).material =
          nodes[Number(element.material)]!.id;
    structure.origin = {
      x: center.x - bounds.width / 2 - bounds.x,
      y: center.y - bounds.height / 2 - bounds.y,
    };
  }
  return {
    nodes,
    ...(nodes.length > 1 || forceGroup
      ? {
          group: {
            id: `${id}-group`,
            name: composition.name,
            nodes: nodes.map((n) => n.id),
            component: composition.component ?? true,
            structure,
          },
        }
      : {}),
  };
}
