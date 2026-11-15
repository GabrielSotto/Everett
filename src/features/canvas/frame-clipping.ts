import {
  frameMasks,
  visiblePolygon,
  type ClipPreview,
  type Polygon,
} from '../../domain/frame-clipping';
import type { WorldSnapshot } from '../../domain/model';
import { around, centerOf, type OrientedRect } from '../../domain/rotation';

/** La máscara está en el Mundo; CSS espera los vértices antes del giro local del material. */
function clipPath(mask: Polygon, node: OrientedRect): string {
  if (!mask.length) return 'inset(50%)';
  const center = centerOf(node);
  return (
    'polygon(' +
    mask
      .map((p) => {
        const local = around(p, center, -(node.rotation ?? 0));
        return local.x - node.x + 'px ' + (local.y - node.y) + 'px';
      })
      .join(',') +
    ')'
  );
}

const geometry = new WeakMap<WorldSnapshot, ReadonlyMap<string, OrientedRect>>();
// El plano se reconstruye al renderizar. Durante un gesto los materiales conservan su DOM.
const targets = new WeakMap<HTMLElement, HTMLElement[]>();
const applied = new WeakMap<HTMLElement, string>();

export function paintFrameClips(
  root: HTMLElement,
  world: WorldSnapshot,
  selection: readonly string[],
  live?: ReadonlyMap<string, OrientedRect>,
  preview?: ClipPreview,
): void {
  if (!frameMasks(world).size) return;
  const masks = frameMasks(world, preview);
  let poses = geometry.get(world);
  if (!poses) {
    poses = new Map(world.nodes.filter((n) => masks.has(n.id)).map((n) => [n.id, n]));
    geometry.set(world, poses);
  }
  let elements = live && targets.get(root);
  if (!elements) {
    elements = [
      ...root.querySelectorAll<HTMLElement>(
        '#canvas-plane > :is([data-node],[data-controls-for],.rotation-frame)',
      ),
    ];
    targets.set(root, elements);
  }
  for (const el of elements) {
    const id =
      el.dataset.node ??
      el.dataset.controlsFor ??
      (selection.length === 1 ? selection[0] : undefined);
    const pose = id && (live?.get(id) ?? poses.get(id)),
      mask = id && masks.get(id);
    if (pose && mask) {
      const hidden = !visiblePolygon(pose, mask).length;
      const path = hidden ? 'inset(50%)' : clipPath(mask, pose);
      if (applied.get(el) !== path) {
        el.style.clipPath = path;
        el.inert = hidden;
        applied.set(el, path);
      }
    } else if (el.classList.contains('rotation-frame')) {
      el.style.removeProperty('clip-path');
      el.inert = false;
      applied.delete(el);
    }
  }
}
