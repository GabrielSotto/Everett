import type { CanvasGroup, Point, WorldSnapshot } from './model';
import { around, centerOf, type OrientedRect } from './rotation';
import { componentPoses } from './component-geometry';
import {
  componentElements,
  elementMaterials,
  type ComponentElement,
  type ComponentTree,
} from './component-tree';
import type { DeepReadonly } from './readonly';

export type Polygon = readonly Point[];
export type FrameMasks = ReadonlyMap<string, Polygon>;

export function corners(rect: OrientedRect): Point[] {
  const { x, y, width, height } = rect;
  const center = centerOf(rect);
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ].map((p) => around(p, center, rect.rotation ?? 0));
}

const side = (a: Point, b: Point, p: Point) =>
  (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);

export function containsPoint(polygon: Polygon, point: Point): boolean {
  return (
    polygon.length >= 3 &&
    polygon.every((a, i) => side(a, polygon[(i + 1) % polygon.length]!, point) >= -1e-7)
  );
}

/** Intersección de polígonos convexos en coordenadas del Mundo (Sutherland–Hodgman). */
export function intersectPolygons(subject: Polygon, window: Polygon): Point[] {
  if (window.length < 3) return [];
  let result = [...subject];
  for (let i = 0; i < window.length && result.length; i++) {
    const a = window[i]!,
      b = window[(i + 1) % window.length]!,
      input = result;
    result = [];
    let previous = input.at(-1)!,
      from = side(a, b, previous);
    for (const p of input) {
      const to = side(a, b, p);
      if (from < 0 !== to < 0) {
        const t = from / (from - to);
        result.push({
          x: previous.x + t * (p.x - previous.x),
          y: previous.y + t * (p.y - previous.y),
        });
      }
      if (to >= 0) result.push(p);
      previous = p;
      from = to;
    }
  }
  // Dos bordes que solo se tocan no exponen una superficie seleccionable.
  if (result.length < 3) return [];
  const start = result[0]!;
  const area = result.slice(1, -1).reduce((sum, p, i) => sum + side(start, p, result[i + 2]!), 0);
  return area > 1e-7 ? result : [];
}

interface ClippingFrame {
  pose: OrientedRect;
  members: string[];
  parent: ClippingFrame | undefined;
}
interface ClipTree {
  frames: ClippingFrame[];
  leaves: Map<string, ClippingFrame>;
}
const trees = new WeakMap<DeepReadonly<ComponentTree>, ClipTree>();
function clipTree(tree: DeepReadonly<ComponentTree>): ClipTree {
  const cached = trees.get(tree);
  if (cached) return cached;
  const index: ClipTree = { frames: [], leaves: new Map() };
  if (componentElements(tree.root).some((e) => e.clipContent)) {
    const poses = componentPoses(tree);
    const visit = (e: DeepReadonly<ComponentElement>, parent?: ClippingFrame) => {
      if (e.clipContent) {
        parent = { pose: poses.get(e.id)!, members: elementMaterials(e), parent };
        index.frames.push(parent);
      }
      if (e.material && parent) index.leaves.set(e.material, parent);
      for (const child of e.children) visit(child, parent);
    };
    visit(tree.root);
  }
  trees.set(tree, index);
  return index;
}

export interface ClipPreview {
  resized?: { group: string; tree: ComponentTree };
  transform?: (frame: ClippingFrame, group: DeepReadonly<CanvasGroup>) => OrientedRect;
}
const savedMasks = new WeakMap<WorldSnapshot, FrameMasks>();
export function frameMasks(world: WorldSnapshot, preview?: ClipPreview): FrameMasks {
  const cached = !preview && savedMasks.get(world);
  if (cached) return cached;
  const masks = new Map<string, Polygon>();
  for (const group of world.canvasGroups ?? []) {
    const tree = preview?.resized?.group === group.id ? preview.resized.tree : group.structure;
    if (!tree) continue;
    const index = clipTree(tree);
    const windows = new Map<ClippingFrame, Polygon>();
    for (const frame of index.frames) {
      const polygon = corners(preview?.transform?.(frame, group) ?? frame.pose);
      windows.set(
        frame,
        frame.parent ? intersectPolygons(polygon, windows.get(frame.parent)!) : polygon,
      );
    }
    for (const [id, frame] of index.leaves) masks.set(id, windows.get(frame)!);
  }
  if (!preview) savedMasks.set(world, masks);
  return masks;
}

export function visiblePolygon(rect: OrientedRect, mask?: Polygon): Polygon {
  const box = corners(rect);
  return mask ? intersectPolygons(box, mask) : box;
}
