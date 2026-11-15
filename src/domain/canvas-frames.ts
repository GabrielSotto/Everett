import {
  componentElements,
  elementMaterials,
  writeTreeGeometry,
  freeLayout,
  treeFromMaterials,
  type ComponentElement,
} from './component-tree';
import { componentPoses, localPose } from './component-geometry';
import { remapInstanceLayers } from './nested-instances';
import { corners, containsPoint } from './frame-clipping';
import type { OrientedRect } from './rotation';
import type { DeepReadonly } from './readonly';
import { layoutComponent } from './component-layout';
import { ensure } from './invariants';
import {
  need,
  nodeTitle,
  type CanvasGroup,
  type Material,
  type World,
  type WorldSnapshot,
} from './model';

export function canBeFrame(node: DeepReadonly<Pick<Material, 'data' | 'owner'>>): boolean {
  return (
    !node.owner &&
    ((node.data.kind === 'shape' && node.data.shape === 'rectangle') ||
      (node.data.kind === 'wireframe' && ['screen', 'block'].includes(node.data.content.type)))
  );
}

/** La pertenencia se resuelve al enmarcar. Mover una pieza sobre un marco no cambia su padre. */
export function frameInterior(world: WorldSnapshot, frame: DeepReadonly<CanvasGroup>) {
  const tree = frame.structure!;
  const bounds: OrientedRect = {
    x: tree.origin.x + tree.root.x,
    y: tree.origin.y + tree.root.y,
    width: tree.root.width,
    height: tree.root.height,
    rotation: tree.rotation,
  };
  const polygon = corners(bounds);
  const inside = (box: OrientedRect) => corners(box).every((p) => containsPoint(polygon, p));
  const enclosed = new Set(world.nodes.filter((n) => !n.owner && inside(n)).map((n) => n.id));
  const groups = world.canvasGroups ?? [];
  const grouped = new Set(groups.flatMap((g) => g.nodes));
  const routed = new Set(world.screenFlows?.flatMap((route) => [route.from, route.to]));
  return {
    materials: [...enclosed].filter((id) => !grouped.has(id)),
    groups: groups
      .filter(
        (g) =>
          g.id !== frame.id &&
          !g.structure?.root.frame &&
          !g.recipe &&
          !g.layoutGuides &&
          !routed.has(g.id) &&
          g.nodes.length > 0 &&
          g.nodes.every((id) => enclosed.has(id)) &&
          (!g.structure || inside(componentPoses(g.structure).get(g.structure.root.id)!)),
      )
      .map((g) => g.id),
  };
}

/** El fondo conserva su material, editor, cables y coordenadas al convertirse en marco. */
export function frameFromMaterial(world: World, background: Material, id: string): CanvasGroup {
  ensure(
    canBeFrame(background),
    'FRAME_BACKGROUND',
    'Elegí una pantalla o un rectángulo disponible.',
  );
  const name = nodeTitle(world, background).slice(0, 200);
  const structure = treeFromMaterials([background], name);
  structure.root.frame = true;
  structure.root.children[0]!.name = 'Fondo';
  structure.root.children[0]!.background = true;
  if (background.rotation) {
    structure.rotation = background.rotation;
    delete structure.root.children[0]!.rotation;
  }
  const group: CanvasGroup = { id, name, component: true, nodes: [background.id], structure };
  if (background.layoutGuides) {
    group.layoutGuides = background.layoutGuides;
    delete background.layoutGuides;
  }
  return group;
}

/** Al disolver el marco, su fondo vuelve a ser el soporte editable de la retícula. */
export function restoreFrameGuides(world: World, group: CanvasGroup): void {
  const root = group.structure?.root;
  if (!root?.frame || !group.layoutGuides) return;
  const id = root.children.find((part) => part.background && part.material)?.material;
  const background = world.nodes.find((n) => n.id === id);
  if (background) background.layoutGuides = group.layoutGuides;
}

/** Los fondos de marcos quedan debajo de sus piezas, incluso si se dibujaron más tarde. */
export function orderFrameBackgrounds(world: World, root: ComponentElement): void {
  // Resolver los marcos internos antes que sus padres conserva el apilado anidado.
  for (const frame of componentElements(root).reverse()) {
    if (!frame.frame) continue;
    const backgrounds = new Set(
      frame.children.filter((e) => e.background).flatMap(elementMaterials),
    );
    if (!backgrounds.size) continue;
    const members = new Set(elementMaterials(frame));
    const first = world.nodes.findIndex((n) => members.has(n.id) && !backgrounds.has(n.id));
    if (first < 0) continue;
    const later = world.nodes.slice(first).filter((n) => backgrounds.has(n.id));
    if (!later.length) continue;
    const ids = new Set(later.map((n) => n.id));
    world.nodes = world.nodes.filter((n) => !ids.has(n.id));
    world.nodes.splice(first, 0, ...later);
  }
}

/** Incorporación explícita en coordenadas locales. El lienzo conserva la pose al cambiar de padre. */
export function adoptMaterials(
  world: World,
  group: CanvasGroup,
  parent: ComponentElement,
  ids: readonly string[],
  uid: () => string,
): void {
  const tree = group.structure!;
  ensure(
    !parent.material && ids.length > 0 && new Set(ids).size === ids.length,
    'COMPONENT_PARENT',
    'Elegí un contenedor y materiales distintos.',
  );
  const origin = componentPoses(tree).get(parent.id)!;
  const grouped = new Set(world.canvasGroups?.flatMap((g) => g.nodes));
  const nodes = new Map(world.nodes.map((n) => [n.id, n]));
  for (const id of ids) {
    const node = need(nodes.get(id), 'El material ya no está disponible.');
    ensure(
      !node.owner && !grouped.has(id),
      'COMPONENT_MEMBERSHIP',
      'El material debe estar libre antes de incorporarlo.',
    );
    const point = localPose(origin, node);
    parent.children.push({
      id: uid(),
      name: nodeTitle(world, node).slice(0, 200),
      material: id,
      x: point.x,
      y: point.y,
      width: node.width,
      height: node.height,
      widthMode: 'fixed',
      heightMode: 'fixed',
      layout: freeLayout(),
      children: [],
    });
    group.nodes.push(id);
  }
  orderFrameBackgrounds(world, tree.root);
}

export function transferFramePart(
  world: World,
  group: CanvasGroup,
  parent: ComponentElement,
  element: ComponentElement,
  frame: string,
  uid: () => string,
): void {
  const destination = need(
    world.canvasGroups?.find((g) => g.id === frame),
    'El marco de destino ya no está disponible.',
  );
  const destinationTree = destination.structure;
  ensure(
    destination !== group &&
      !!destinationTree?.root.frame &&
      destination.nodes.every((id) => !world.nodes.find((n) => n.id === id)?.owner),
    'FRAME_TARGET',
    'Elegí otro marco disponible.',
  );
  const parts = componentElements(element);
  const members = new Set(elementMaterials(element));
  ensure(
    members.size < group.nodes.length && members.size > 0,
    'FRAME_EMPTY',
    'Elegí una parte del marco.',
  );
  // Las rutas se conservan al mover la pieza entre pantallas. Una ruta que
  // apuntaría a su propia pantalla requiere elegir otro destino primero.
  const flows =
    world.screenFlows?.filter((f) => f.from === group.id && parts.some((p) => p.id === f.part)) ??
    [];
  ensure(
    !flows.some((f) => f.to === destination.id),
    'FRAME_FLOW',
    'Cambiá el destino del recorrido antes de mover la pieza a esa pantalla.',
  );
  const root = destinationTree!.root;
  const placement = localPose(
    componentPoses(destinationTree!).get(root.id)!,
    componentPoses(group.structure!).get(element.id)!,
  );
  const used = new Set(componentElements(root).map((e) => e.id));
  const remap = new Map<string, string>();
  for (const part of parts) {
    const old = part.id;
    while (used.has(part.id)) part.id = uid();
    used.add(part.id);
    remap.set(old, part.id);
  }
  remapInstanceLayers(element, remap);
  for (const flow of flows) {
    flow.from = destination.id;
    flow.part = remap.get(flow.part!)!;
  }
  parent.children = parent.children.filter((child) => child !== element);
  group.nodes = group.nodes.filter((id) => !members.has(id));
  element.x = placement.x;
  element.y = placement.y;
  if (!element.material) element.rotation = placement.rotation ?? 0;
  delete element.background;
  delete element.margin;
  root.children.push(element);
  destination.nodes.push(...members);
  orderFrameBackgrounds(world, root);
  layoutComponent(root);
  writeTreeGeometry(world, destination);
  layoutComponent(group.structure!.root);
}
