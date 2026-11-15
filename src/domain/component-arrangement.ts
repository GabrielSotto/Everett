import { arrangements, type Arrangement, arrangementOffsets } from './arrangement';
import { componentElements, type ComponentElement } from './component-tree';
import type { DeepReadonly } from './readonly';
import { visualBounds } from './rotation';

/** En un marco las referencias se miden en coordenadas del padre, incluso si éste está girado. */
export function layerArrangement(root: DeepReadonly<ComponentElement>, ids: ReadonlySet<string>) {
  const parent = componentElements(root).find((p) => p.children.some((c) => ids.has(c.id)));
  if (!parent || !ids.size || parent.layout.direction !== 'free') return;
  const children = parent.children.filter((c) => ids.has(c.id));
  if (children.length !== ids.size || children.some((c) => c.background)) return;
  const reference =
    children.length === 1 ? { x: 0, y: 0, width: parent.width, height: parent.height } : undefined;
  const actions = arrangements.filter((action) => {
    if (action.startsWith('space') && children.length < 3) return false;
    const mode = ['left', 'center-x', 'right', 'space-x'].includes(action)
      ? 'widthMode'
      : 'heightMode';
    return !(reference && parent[mode] === 'hug') && children.every((c) => c[mode] !== 'fill');
  });
  return { parent, children, reference, actions };
}

export function arrangedLayerPositions(
  root: DeepReadonly<ComponentElement>,
  ids: string[],
  action: Arrangement,
) {
  const selection = new Set(ids);
  const scope = layerArrangement(root, selection);
  if (!scope || ids.length !== selection.size || !scope.actions.includes(action)) return;
  const bounds = scope.children.map((child) => ({ ...visualBounds(child), child }));
  return arrangementOffsets(bounds, action, undefined, scope.reference).map(({ item, delta }) => ({
    id: item.child.id,
    x: item.child.x + delta.x,
    y: item.child.y + delta.y,
  }));
}
