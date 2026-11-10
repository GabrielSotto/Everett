import { validRotation } from './rotation';
import type { CanvasGroup, Material, Point, Rect, World, WorldSnapshot } from './model';
import type { DeepReadonly } from './readonly';
import { centerOf, rotatedPose } from './rotation';
import { layoutComponent } from './component-layout';

export type Sizing = 'fixed' | 'hug' | 'fill';
export interface ComponentLayout {
  direction: 'free' | 'row' | 'column';
  gap: number;
  padding: number;
  align: 'start' | 'center' | 'end' | 'stretch';
  insets?: [number, number, number, number];
  justify?: 'start' | 'center' | 'end' | 'between';
}
/** Coordenadas locales al padre. Las hojas conservan la identidad del material. */
export interface ComponentElement extends Rect {
  id: string;
  name: string;
  material?: string;
  background?: boolean;
  margin?: [number, number, number, number];
  widthMode: Sizing;
  heightMode: Sizing;
  layout: ComponentLayout;
  children: ComponentElement[];
}
export interface ComponentTree {
  version: 1;
  rotation?: number;
  origin: Point;
  root: ComponentElement;
}
export const freeLayout = (): ComponentLayout => ({
  direction: 'free',
  gap: 12,
  padding: 0,
  align: 'start',
});
export function componentElements(
  root: DeepReadonly<ComponentElement>,
): DeepReadonly<ComponentElement>[] {
  return [root, ...root.children.flatMap(componentElements)];
}
export function elementMaterials(root: DeepReadonly<ComponentElement>): string[] {
  return componentElements(root).flatMap((e) => (e.material ? [e.material] : []));
}
export function elementAt(root: ComponentElement, id: string): ComponentElement | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = elementAt(child, id);
    if (found) return found;
  }
}
export function parentOf(root: ComponentElement, id: string): ComponentElement | undefined {
  if (root.children.some((c) => c.id === id)) return root;
  for (const child of root.children) {
    const found = parentOf(child, id);
    if (found) return found;
  }
}
export function elementRect(tree: DeepReadonly<ComponentTree>, id: string): Rect | null {
  const visit = (e: DeepReadonly<ComponentElement>, origin: Point): Rect | null => {
    const rect = { x: origin.x + e.x, y: origin.y + e.y, width: e.width, height: e.height };
    if (e.id === id) return rect;
    for (const child of e.children) {
      const found = visit(child, rect);
      if (found) return found;
    }
    return null;
  };
  return visit(tree.root, tree.origin);
}
export function validComponentTree(
  value: unknown,
  materials: readonly string[],
): value is ComponentTree {
  if (!value || typeof value !== 'object') return false;
  const t = value as ComponentTree;
  if (
    !validRotation(t.rotation) ||
    t.version !== 1 ||
    !t.origin ||
    ![t.origin.x, t.origin.y].every(Number.isFinite)
  )
    return false;
  const ids = new Set<string>(),
    leaves = new Set<string>();
  let count = 0;
  const visit = (e: ComponentElement, depth: number): boolean => {
    if (
      !e ||
      depth > 48 ||
      ++count > 6000 ||
      typeof e.id !== 'string' ||
      !e.id ||
      ids.has(e.id) ||
      typeof e.name !== 'string' ||
      !e.name ||
      e.name.length > 200 ||
      !Array.isArray(e.children) ||
      ![e.x, e.y, e.width, e.height].every((n) => Number.isFinite(n) && Math.abs(n) <= 1000000) ||
      e.width < 4 ||
      e.height < 4 ||
      !['fixed', 'hug', 'fill'].includes(e.widthMode) ||
      !['fixed', 'hug', 'fill'].includes(e.heightMode) ||
      !e.layout ||
      !['free', 'row', 'column'].includes(e.layout.direction) ||
      !['start', 'center', 'end', 'stretch'].includes(e.layout.align) ||
      ![e.layout.padding, e.layout.gap].every((n) => Number.isFinite(n) && n >= 0 && n <= 10000)
    )
      return false;
    ids.add(e.id);
    if (e.material !== undefined) {
      if (
        typeof e.material !== 'string' ||
        !materials.includes(e.material) ||
        leaves.has(e.material) ||
        e.children.length
      )
        return false;
      leaves.add(e.material);
    }
    if (e.background !== undefined && typeof e.background !== 'boolean') return false;
    for (const edges of [e.margin, e.layout.insets])
      if (
        edges !== undefined &&
        (!Array.isArray(edges) ||
          edges.length !== 4 ||
          !edges.every((n) => Number.isFinite(n) && n >= 0 && n <= 10000))
      )
        return false;
    if (
      e.layout.justify !== undefined &&
      !['start', 'center', 'end', 'between'].includes(e.layout.justify)
    )
      return false;
    return e.children.every((c) => visit(c, depth + 1));
  };
  return visit(t.root, 0) && leaves.size === materials.length;
}
export function treeFromMaterials(
  nodes: readonly DeepReadonly<Material>[],
  name: string,
): ComponentTree {
  const x = Math.min(...nodes.map((n) => n.x)),
    y = Math.min(...nodes.map((n) => n.y));
  return {
    version: 1,
    origin: { x, y },
    root: {
      id: 'root',
      name,
      x: 0,
      y: 0,
      width: Math.max(...nodes.map((n) => n.x + n.width)) - x,
      height: Math.max(...nodes.map((n) => n.y + n.height)) - y,
      widthMode: 'fixed',
      heightMode: 'fixed',
      layout: freeLayout(),
      children: nodes.map((n, i) => ({
        id: `part-${i}`,
        material: n.id,
        name: 'title' in n.data ? n.data.title || 'Pieza' : 'Pieza',
        x: n.x - x,
        y: n.y - y,
        width: n.width,
        height: n.height,
        widthMode: 'fixed',
        heightMode: 'fixed',
        layout: freeLayout(),
        children: [],
      })),
    },
  };
}
export function treeCenter(tree: DeepReadonly<ComponentTree>): Point {
  return centerOf({ ...tree.root, x: tree.origin.x + tree.root.x, y: tree.origin.y + tree.root.y });
}
export function treePosition(tree: DeepReadonly<ComponentTree>, rect: Rect): Rect {
  if (!tree.rotation) return rect;
  const { x, y } = rotatedPose(rect, treeCenter(tree), tree.rotation);
  return { ...rect, x, y };
}
export function writeTreeGeometry(world: World, group: CanvasGroup): void {
  const tree = group.structure!;
  const nodes = new Map(world.nodes.map((n) => [n.id, n]));
  const visit = (e: ComponentElement, parent: Point) => {
    const rect = { x: parent.x + e.x, y: parent.y + e.y, width: e.width, height: e.height };
    if (e.material) Object.assign(nodes.get(e.material)!, treePosition(tree, rect));
    e.children.forEach((c) => visit(c, rect));
  };
  visit(tree.root, tree.origin);
}
/** Los gestos existentes conservan la jerarquía; trasladar la unidad mueve su origen. */
export function reconcileComponentTrees(before: WorldSnapshot, after: World): void {
  for (const group of after.canvasGroups ?? []) {
    if (!group.structure) continue;
    const previous = before.canvasGroups?.find((g) => g.id === group.id);
    if (
      !previous?.structure ||
      JSON.stringify(previous.structure) !== JSON.stringify(group.structure)
    )
      continue;
    const oldNodes = new Map(before.nodes.map((n) => [n.id, n]));
    const nodes = new Map(after.nodes.map((n) => [n.id, n]));
    const tree = group.structure;
    if (group.name !== previous.name) tree.root.name = group.name;
    const members = group.nodes.filter((id) => nodes.has(id));
    if (!members.length) continue;
    const first = members[0]!,
      old = oldNodes.get(first),
      current = nodes.get(first)!;
    if (!old) continue;
    const dx = current.x - old.x,
      dy = current.y - old.y;
    const translated = members.every((id) => {
      const a = oldNodes.get(id)!,
        b = nodes.get(id)!;
      return (
        a &&
        Math.abs(b.x - a.x - dx) < 0.001 &&
        Math.abs(b.y - a.y - dy) < 0.001 &&
        a.width === b.width &&
        a.height === b.height
      );
    });
    if (translated) {
      tree.origin.x += dx;
      tree.origin.y += dy;
    }
    if (
      tree.rotation &&
      translated &&
      members.length === previous.nodes.length &&
      group.name === previous.name &&
      members.every((id) => {
        const a = oldNodes.get(id)!.data,
          b = nodes.get(id)!.data;
        return !('title' in a && 'title' in b) || a.title === b.title;
      })
    )
      continue;
    if (tree.rotation) {
      const pivot = treeCenter(tree),
        prior = treeCenter(previous.structure);
      for (const id of members) {
        const n = nodes.get(id)!,
          old = oldNodes.get(id);
        nodes.set(id, { ...n, ...rotatedPose(n, pivot, -tree.rotation) });
        if (old) oldNodes.set(id, { ...old, ...rotatedPose(old, prior, -tree.rotation) });
      }
    }
    if (!translated) {
      const moveContainer = (e: ComponentElement) => {
        const ids = elementMaterials(e).filter((id) => members.includes(id));
        const first = ids[0],
          a = first ? oldNodes.get(first) : undefined,
          b = first ? nodes.get(first) : undefined;
        if (a && b && !e.material) {
          const x = b.x - a.x,
            y = b.y - a.y;
          if (
            (x || y) &&
            ids.every((id) => {
              const old = oldNodes.get(id),
                node = nodes.get(id);
              return (
                old &&
                node &&
                Math.abs(node.x - old.x - x) < 0.001 &&
                Math.abs(node.y - old.y - y) < 0.001
              );
            })
          ) {
            e.x += x;
            e.y += y;
            return;
          }
        }
        e.children.forEach(moveContainer);
      };
      tree.root.children.forEach(moveContainer);
    }
    const sync = (e: ComponentElement, parent: Point) => {
      e.children = e.children.filter((c) => !c.material || members.includes(c.material));
      if (e.material) {
        const n = nodes.get(e.material)!;
        const old = oldNodes.get(e.material);
        if ('title' in n.data && old && 'title' in old.data && n.data.title !== old.data.title)
          e.name = n.data.title || 'Pieza';
        Object.assign(e, {
          x: n.x - parent.x,
          y: n.y - parent.y,
          width: n.width,
          height: n.height,
        });
      }
      e.children.forEach((c) => sync(c, { x: parent.x + e.x, y: parent.y + e.y }));
    };
    sync(tree.root, tree.origin);
    // Un arrastre dentro de una fila/columna cambia el orden, nunca rompe su espaciado.
    let reordered = false;
    const order = (e: ComponentElement): void => {
      if (
        e.layout.direction !== 'free' &&
        e.children.some((child) =>
          elementMaterials(child).some((id) => {
            const a = oldNodes.get(id),
              b = nodes.get(id);
            return a && b && (a.x !== b.x || a.y !== b.y);
          }),
        )
      ) {
        const axis = e.layout.direction === 'row' ? 'x' : 'y',
          size = axis === 'x' ? 'width' : 'height';
        const content = e.children
          .filter((c) => !c.background)
          .sort((a, b) => a[axis] + a[size] / 2 - b[axis] - b[size] / 2);
        let index = 0;
        e.children = e.children.map((c) => (c.background ? c : content[index++]!));
        reordered = true;
      }
      e.children.forEach(order);
    };
    if (!translated) order(tree.root);
    const resized = members.some((id) => {
      const a = oldNodes.get(id),
        b = nodes.get(id);
      return a && b && (a.width !== b.width || a.height !== b.height);
    });
    if (resized || reordered || members.length !== previous.nodes.length) {
      layoutComponent(tree.root);
      writeTreeGeometry(after, group);
    }
  }
}
