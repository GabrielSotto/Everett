import { containsPoint, corners, frameMasks, visiblePolygon } from '../../domain/frame-clipping';
import { nodeTitle, type Point, type WorldSnapshot } from '../../domain/model';
import type { ComponentElement } from '../../domain/component-tree';
import type { DeepReadonly } from '../../domain/readonly';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';

export function layersAt(world: WorldSnapshot, point: Point) {
  const masks = frameMasks(world);
  const hits = world.nodes
    .filter(
      (node) =>
        !node.owner &&
        containsPoint(corners(node), point) &&
        (!masks.has(node.id) || containsPoint(masks.get(node.id)!, point)),
    )
    .reverse();
  const ids = new Set(hits.map((node) => node.id));
  const parts = new Map<string, { name?: string; path: string[] }>();
  for (const group of world.canvasGroups ?? []) {
    if (!group.nodes.some((id) => ids.has(id))) continue;
    const visit = (e: DeepReadonly<ComponentElement>, path: string[]) => {
      if (e.material) {
        if (ids.has(e.material)) parts.set(e.material, { name: e.name, path });
      } else e.children.forEach((c) => visit(c, [...path, e.name]));
    };
    if (group.structure) visit(group.structure.root, []);
    else for (const id of group.nodes) if (ids.has(id)) parts.set(id, { path: [group.name] });
  }
  return hits.map((node) => ({
    id: node.id,
    name: parts.get(node.id)?.name ?? nodeTitle(world, node),
    path: parts.get(node.id)?.path.join(' › ') ?? 'Canvas',
    polygon: visiblePolygon(node, masks.get(node.id)),
  }));
}
export type LayerHits = ReturnType<typeof layersAt>;
export function layerMenu(hits: LayerHits, position: string) {
  return `<div class="canvas-context-menu layer-picker" role="menu" aria-label="Seleccionar capa" style="${position}">
    <button type="button" role="menuitem" data-action="layer-back">${icon('chevron-left', 14)}Seleccionar capa</button>
    ${hits.map((hit) => `<button type="button" role="menuitem" data-action="layer-select" data-id="${html(hit.id)}"><span>${html(hit.name)}</span><small>${html(hit.path)}</small></button>`).join('')}</div>`;
}
