import { getWorld, need, type State, type Rect, type CanvasGroup, type World } from '../model';
import type { Command } from '../command-types';
import { ensure } from '../invariants';
import {
  componentElements,
  elementAt,
  parentOf,
  elementMaterials,
  treeFromMaterials,
  writeTreeGeometry,
  validComponentTree,
  freeLayout,
  type ComponentElement,
  type ComponentLayout,
  type ComponentTree,
  type Sizing,
} from '../component-tree';
import { layoutComponent } from '../component-layout';
import { captureComposition } from '../component-recipes';
import { instantiateLibrary, validLibraryComposition, libraryBounds } from '../sketch-library';
import { resizedComponent } from '../component-resize';
import { groupBounds } from '../manual-groups';
import {
  adoptMaterials,
  frameFromMaterial,
  frameInterior,
  orderFrameBackgrounds,
  restoreFrameGuides,
  transferFramePart,
} from '../canvas-frames';
import { componentPoses, localPose } from '../component-geometry';
import { flatLayers, restackLayer } from '../component-layers';
import type { Arrangement } from '../arrangement';
import { arrangedLayerPositions } from '../component-arrangement';

export type ComponentEdit =
  | { kind: 'position'; element: string; axis: 'x' | 'y'; value: number }
  | { kind: 'arrange'; elements: string[]; action: Arrangement }
  | { kind: 'stack'; element: string; target: string; side: 'above' | 'below' | 'inside' }
  | { kind: 'clip'; element: string; enabled: boolean }
  | { kind: 'initialize' }
  | { kind: 'collect-interior' }
  | {
      kind: 'properties';
      element: string;
      name?: string;
      layout?: ComponentLayout;
      widthMode?: Sizing;
      heightMode?: Sizing;
      width?: number;
      height?: number;
      background?: boolean;
    }
  | { kind: 'reparent'; element: string; parent: string; index: number }
  | { kind: 'container'; elements: string[]; name: string }
  | { kind: 'detach'; element: string }
  | { kind: 'transfer'; element: string; frame: string }
  | { kind: 'duplicate'; element: string }
  | { kind: 'replace'; element: string; material: string }
  | { kind: 'adopt'; parent: string; materials: string[] }
  | { kind: 'nest'; parent: string; group: string }
  | { kind: 'resize'; rect: Rect; scale: boolean };

/** Una traslación libre no debe redondear ni recalcular las capas ajenas al gesto. */
function placeChildren(
  world: World,
  group: CanvasGroup,
  positions: { id: string; x: number; y: number }[],
) {
  if (!positions.length) return;
  const tree = group.structure!;
  const parent = parentOf(tree.root, positions[0]!.id)!;
  const children = new Map(parent.children.map((child) => [child.id, child]));
  const moved = new Set<string>();
  let needsLayout = false;
  for (const { id, x, y } of positions) {
    const child = children.get(id)!;
    if (x === child.x && y === child.y) continue;
    needsLayout ||=
      (x !== child.x && (child.widthMode === 'fill' || parent.widthMode === 'hug')) ||
      (y !== child.y && (child.heightMode === 'fill' || parent.heightMode === 'hug'));
    child.x = x;
    child.y = y;
    for (const material of elementMaterials(child)) moved.add(material);
  }
  if (needsLayout) layoutComponent(tree.root);
  writeTreeGeometry(world, group, needsLayout ? undefined : moved);
}

function nestGroup(
  world: World,
  group: CanvasGroup,
  parent: ComponentElement,
  sourceId: string,
  uid: () => string,
) {
  const source = need(
    world.canvasGroups?.find((g) => g.id === sourceId),
    'Componente no disponible',
  );
  ensure(
    source !== group && !parent.material,
    'COMPONENT_CYCLE',
    'Elegí otro componente para anidar.',
  );
  ensure(
    source.nodes.every((id) => {
      const n = world.nodes.find((n) => n.id === id);
      return n && !n.owner;
    }),
    'COMPONENT_CONTENT',
    'Devolvé los materiales del agente antes de anidar este conjunto.',
  );
  ensure(
    !world.screenFlows?.some((f) => f.from === source.id || f.to === source.id),
    'COMPONENT_FLOW',
    'Este componente tiene recorridos de pantalla. Retiralos antes de anidarlo.',
  );
  const nested = structuredClone(
    source.structure ??
      treeFromMaterials(
        world.nodes.filter((n) => source.nodes.includes(n.id)),
        source.name,
      ),
  );
  const placement = localPose(
    componentPoses(group.structure!).get(parent.id)!,
    componentPoses(nested).get(nested.root.id)!,
  );
  Object.assign(nested.root, placement);
  for (const e of componentElements(nested.root)) e.id = uid();
  parent.children.push(nested.root);
  orderFrameBackgrounds(world, group.structure!.root);
  restoreFrameGuides(world, source);
  group.nodes.push(...source.nodes);
  world.canvasGroups = world.canvasGroups!.filter((g) => g.id !== source.id);
}

/** Una sola transacción conserva los materiales y la jerarquía de cada grupo incorporado. */
function collectInterior(world: World, frame: CanvasGroup, uid: () => string) {
  const root = frame.structure!.root;
  ensure(root.frame === true, 'FRAME_TARGET', 'Elegí un marco para incorporar sus capas.');
  const interior = frameInterior(world, frame);
  if (interior.materials.length) adoptMaterials(world, frame, root, interior.materials, uid);
  for (const id of interior.groups) nestGroup(world, frame, root, id, uid);
  if (root.layout.direction !== 'free' && (interior.groups.length || interior.materials.length)) {
    layoutComponent(root);
    writeTreeGeometry(world, frame);
  }
}

type ComponentCommand = Extract<
  Command,
  {
    type:
      | 'frame.create'
      | 'component.edit'
      | 'composition.save'
      | 'composition.insert'
      | 'composition.update'
      | 'screen-flow.set';
  }
>;
export function applyComponentCommand(state: State, c: ComponentCommand): void {
  const world = getWorld(state, c.world),
    uid = () => `e-${++state.seq}`;
  if (c.type === 'frame.create') {
    const background = need(
      world.nodes.find((n) => n.id === c.background),
      'El fondo ya no está disponible.',
    );
    ensure(
      !world.canvasGroups?.some((g) => g.nodes.includes(background.id)),
      'FRAME_MEMBERSHIP',
      'Separá el fondo de su contenedor antes de crear otro marco.',
    );
    const frame = frameFromMaterial(world, background, uid());
    (world.canvasGroups ??= []).push(frame);
    if (c.includeInterior) collectInterior(world, frame, uid);
    else if (c.members.length) adoptMaterials(world, frame, frame.structure!.root, c.members, uid);
    return;
  }
  if (c.type === 'composition.insert') {
    const saved = need(
      world.compositions?.find((s) => s.id === c.id),
      'Composición no disponible',
    );
    const result = instantiateLibrary(saved.composition, uid(), c.center, true);
    if (result.group && c.linked) result.group.recipe = { id: saved.id, revision: saved.revision };
    world.nodes.push(...result.nodes);
    if (result.group) (world.canvasGroups ??= []).push(result.group);
    return;
  }
  if (c.type === 'screen-flow.set') {
    const group = world.canvasGroups?.find((g) => g.id === c.from);
    ensure(!!group, 'FLOW_SOURCE', 'La pantalla de origen ya no está disponible.');
    ensure(
      !c.part || (!!group?.structure && !!elementAt(group.structure.root, c.part)),
      'FLOW_PART',
      'La pieza de origen ya no está disponible.',
    );
    ensure(
      c.to === null || (c.to !== c.from && !!world.canvasGroups?.some((g) => g.id === c.to)),
      'FLOW_TARGET',
      'Elegí otra pantalla de destino.',
    );
    ensure(
      typeof c.label === 'string' && c.label.length <= 100,
      'FLOW_LABEL',
      'El nombre del recorrido es demasiado largo.',
    );
    world.screenFlows = (world.screenFlows ?? []).filter(
      (f) => f.from !== c.from || f.part !== c.part,
    );
    if (c.to)
      world.screenFlows.push({
        id: uid(),
        from: c.from,
        to: c.to,
        ...(c.part ? { part: c.part } : {}),
        label: c.label.trim() || 'Continuar',
      });
    return;
  }
  const group = need(
    world.canvasGroups?.find((g) => g.id === c.id),
    'Componente no disponible',
  );
  ensure(
    group.nodes.every((id) => world.nodes.some((n) => n.id === id && !n.owner)),
    'LOCKED',
    'El agente está usando partes de este componente.',
  );
  if (c.type === 'composition.save') {
    const composition = captureComposition(world, group);
    composition.name = c.name.trim();
    ensure(
      validLibraryComposition(composition),
      'COMPOSITION',
      'La composición no se puede guardar con ese nombre o contenido.',
    );
    const existing = c.replace
      ? need(
          world.compositions?.find((s) => s.id === c.replace),
          'Composición no disponible',
        )
      : undefined;
    if (existing) {
      existing.composition = composition;
      existing.name = composition.name;
      existing.revision++;
    } else
      (world.compositions ??= []).push({
        id: uid(),
        name: composition.name,
        revision: 1,
        composition,
      });
    return;
  }
  if (c.type === 'composition.update') {
    const saved = need(
      world.compositions?.find((s) => s.id === group.recipe?.id),
      'Esta copia es independiente.',
    );
    const bounds = groupBounds(world, group),
      nextBounds = libraryBounds(saved.composition),
      result = instantiateLibrary(
        saved.composition,
        uid(),
        {
          x: bounds.x + nextBounds.width / 2,
          y: bounds.y + nextBounds.height / 2,
        },
        true,
      );
    ensure(!!result.group, 'COMPOSITION', 'No se pudo actualizar la composición.');
    // Mantener la identidad de las partes supervivientes preserva cables, comentarios
    // y acciones. Una parte eliminada permanece suelta si todavía tiene referencias.
    const oldParts = new Map(group.structure ? elementMaterialsById(group.structure.root) : []);
    const remap = new Map<string, string>();
    for (const [part, material] of elementMaterialsById(result.group!.structure!.root)) {
      const oldId = oldParts.get(part);
      if (oldId) remap.set(material, oldId);
    }
    for (const node of result.nodes) node.id = remap.get(node.id) ?? node.id;
    for (const element of componentElements(result.group!.structure!.root))
      if (element.material) element.material = remap.get(element.material) ?? element.material;
    result.group!.nodes = result.nodes.map((n) => n.id);
    const replaced = new Set(result.group!.nodes),
      removed = new Set(group.nodes);
    world.nodes = world.nodes.filter(
      (n) =>
        !replaced.has(n.id) &&
        (!removed.has(n.id) ||
          world.links.some((l) => l.from === n.id || l.to === n.id) ||
          world.comments.some((c) => c.node === n.id)),
    );
    world.nodes.push(...result.nodes);
    Object.assign(group, {
      nodes: result.group!.nodes,
      structure: result.group!.structure,
      recipe: { id: saved.id, revision: saved.revision },
    });
    return;
  }
  if (!group.structure && c.edit.kind === 'stack') {
    const { element, target, side } = c.edit;
    const root = flatLayers(world, group);
    const source = need(
      root.children.find((e) => e.id === element),
      'Capa no disponible.',
    );
    const neighbor = need(
      root.children.find((e) => e.id === target),
      'Capa no disponible.',
    );
    ensure(
      source !== neighbor && (side === 'above' || side === 'below'),
      'COMPONENT_STACK',
      'Elegí otra capa del conjunto.',
    );
    restackLayer(world, root, source, neighbor, side);
    return;
  }
  group.structure ??= treeFromMaterials(
    world.nodes.filter((n) => group.nodes.includes(n.id)),
    group.name,
  );
  group.component = true;
  const tree = group.structure,
    edit = c.edit;
  if (edit.kind === 'collect-interior') {
    collectInterior(world, group, uid);
    return;
  }
  if (edit.kind === 'initialize') {
    ensure(
      group.nodes.every((id) => {
        const n = world.nodes.find((n) => n.id === id)!;
        return n.data.kind === 'wireframe' && !!n.data.content.piece;
      }),
      'COMPONENT_CONTENT',
      'Elegí un conjunto de piezas de bosquejo.',
    );
    return;
  }
  if (edit.kind === 'resize') {
    ensure(
      [edit.rect.x, edit.rect.y, edit.rect.width, edit.rect.height].every(Number.isFinite) &&
        edit.rect.width >= 4 &&
        edit.rect.height >= 4,
      'COMPONENT_SIZE',
      'Tamaño de componente inválido.',
    );
    if (edit.scale) {
      const bounds = groupBounds(world, group),
        sx = edit.rect.width / bounds.width,
        sy = edit.rect.height / bounds.height;
      const { nodes: scaled } = resizedComponent(world, group, edit.rect, true);
      for (const node of scaled)
        Object.assign(
          world.nodes.find((n) => n.id === node.id)!,
          node,
        );
      const scale = (e: ComponentElement) => {
        e.x *= sx;
        e.y *= sy;
        e.width *= sx;
        e.height *= sy;
        e.layout.gap *= Math.min(sx, sy);
        e.layout.padding *= Math.min(sx, sy);
        if (e.layout.insets)
          e.layout.insets = e.layout.insets.map((n, i) => n * (i % 2 ? sx : sy)) as [
            number,
            number,
            number,
            number,
          ];
        if (e.margin)
          e.margin = e.margin.map((n, i) => n * (i % 2 ? sx : sy)) as [
            number,
            number,
            number,
            number,
          ];
        e.children.forEach(scale);
      };
      scale(tree.root);
    } else {
      tree.root.width = edit.rect.width;
      tree.root.height = edit.rect.height;
      tree.root.widthMode = tree.root.heightMode = 'fixed';
      layoutComponent(tree.root);
    }
    tree.origin = { x: edit.rect.x - tree.root.x, y: edit.rect.y - tree.root.y };
  } else if (edit.kind === 'nest') {
    const parent = need(elementAt(tree.root, edit.parent), 'Contenedor no disponible');
    nestGroup(world, group, parent, edit.group, uid);
    layoutComponent(tree.root);
  } else if (edit.kind === 'adopt') {
    const parent = need(elementAt(tree.root, edit.parent), 'Contenedor no disponible');
    adoptMaterials(world, group, parent, edit.materials, uid);
    layoutComponent(tree.root);
  } else if (edit.kind === 'arrange') {
    const positions = arrangedLayerPositions(tree.root, edit.elements, edit.action);
    ensure(
      positions !== undefined,
      'COMPONENT_ARRANGEMENT',
      'Elegí capas que se puedan mover en el mismo contenedor libre.',
    );
    placeChildren(world, group, positions!);
    return;
  } else if (edit.kind === 'container') {
    ensure(
      edit.elements.length > 0 && new Set(edit.elements).size === edit.elements.length,
      'COMPONENT_SELECTION',
      'Seleccioná piezas distintas.',
    );
    const parent = parentOf(tree.root, edit.elements[0]!);
    ensure(
      !!parent && edit.elements.every((id) => parentOf(tree.root, id) === parent),
      'COMPONENT_PARENT',
      'Elegí piezas del mismo contenedor.',
    );
    const children = parent!.children.filter((e) => edit.elements.includes(e.id));
    const x = Math.min(...children.map((e) => e.x)),
      y = Math.min(...children.map((e) => e.y));
    const container: ComponentElement = {
      id: uid(),
      name: edit.name.trim() || 'Contenedor',
      x,
      y,
      width: Math.max(...children.map((e) => e.x + e.width)) - x,
      height: Math.max(...children.map((e) => e.y + e.height)) - y,
      widthMode: 'fixed',
      heightMode: 'fixed',
      layout: freeLayout(),
      children,
    };
    const index = parent!.children.indexOf(children[0]!);
    children.forEach((e) => {
      e.x -= x;
      e.y -= y;
      // El desplazamiento previo ya está incorporado en las coordenadas locales.
      delete e.margin;
    });
    parent!.children = parent!.children.filter((e) => !edit.elements.includes(e.id));
    parent!.children.splice(index, 0, container);
    layoutComponent(tree.root);
  } else {
    const element = need(elementAt(tree.root, edit.element), 'Pieza no disponible');
    if (edit.kind === 'stack') {
      const parent = need(parentOf(tree.root, element.id), 'Elegí una capa del contenedor.');
      const target = need(elementAt(tree.root, edit.target), 'Elegí una capa del componente.');
      const destination =
        edit.side === 'inside'
          ? target
          : need(parentOf(tree.root, target.id), 'Elegí una capa del contenedor.');
      ensure(
        target !== element &&
          (edit.side === 'above' ||
            edit.side === 'below' ||
            (edit.side === 'inside' && !target.material)) &&
          !!elementMaterials(element).length &&
          (edit.side === 'inside' || !!elementMaterials(target).length) &&
          !elementAt(element, destination.id),
        'COMPONENT_STACK',
        'Elegí dos capas distintas con contenido.',
      );
      ensure(
        !(parent.frame && element.background) &&
          !(destination.frame && target.background && edit.side === 'below'),
        'FRAME_BACKGROUND',
        'El fondo del marco queda debajo de sus capas.',
      );
      if (parent !== destination) {
        const neighbor = destination.children.indexOf(target);
        movePart(
          tree,
          element,
          parent,
          destination,
          edit.side === 'inside'
            ? destination.children.length
            : neighbor + Number(edit.side === 'above'),
        );
        writeTreeGeometry(world, group);
      }
      restackLayer(world, destination, element, target, edit.side);
      return;
    }
    if (edit.kind === 'position') {
      ensure(
        (edit.axis === 'x' || edit.axis === 'y') && Number.isFinite(edit.value),
        'COMPONENT_POSITION',
        'Ingresá una coordenada válida.',
      );
      if (element === tree.root) tree.origin[edit.axis] = edit.value - element[edit.axis];
      else {
        const parent = parentOf(tree.root, element.id);
        ensure(
          parent?.layout.direction === 'free' && !element.background,
          'COMPONENT_POSITION',
          'La posición de esta capa la determina su contenedor.',
        );
        placeChildren(world, group, [
          { id: element.id, x: element.x, y: element.y, [edit.axis]: edit.value },
        ]);
        return;
      }
    } else if (edit.kind === 'clip') {
      ensure(
        element.frame === true && typeof edit.enabled === 'boolean',
        'FRAME_CLIP',
        'Elegí un marco para recortar su contenido.',
      );
      element.clipContent = edit.enabled;
      return;
    } else if (edit.kind === 'properties') {
      const { kind: _, element: __, ...patch } = edit;
      Object.assign(element, structuredClone(patch));
      ensure(
        validComponentTree(tree, group.nodes),
        'COMPONENT_STRUCTURE',
        'Las medidas o la distribución no son válidas.',
      );
      // Un padre ajustado al contenido no puede depender de un hijo que lo rellena.
      const check = (e: ComponentElement): boolean =>
        e.children.every(
          (child) =>
            (child.background ||
              (!(e.widthMode === 'hug' && child.widthMode === 'fill') &&
                !(e.heightMode === 'hug' && child.heightMode === 'fill'))) &&
            check(child),
        );
      ensure(
        check(tree.root),
        'COMPONENT_SIZING',
        'Un contenedor ajustado al contenido no puede rellenarse a sí mismo. Usá tamaño fijo en ese eje.',
      );
      if (edit.name !== undefined) {
        if (element === tree.root) group.name = element.name;
        if (element.material) {
          const node = world.nodes.find((n) => n.id === element.material)!;
          if ('title' in node.data) node.data.title = element.name;
        }
      }
      layoutComponent(tree.root);
    } else if (edit.kind === 'replace') {
      const target = need(
        world.nodes.find((n) => n.id === element.material),
        'Elegí una pieza individual.',
      );
      const source = need(
        world.nodes.find((n) => n.id === edit.material),
        'Pieza de reemplazo no disponible',
      );
      ensure(
        !source.owner && source.data.kind === 'wireframe' && !!source.data.content.piece,
        'COMPONENT_REPLACEMENT',
        'Elegí una pieza de bosquejo.',
      );
      target.data = structuredClone(source.data);
      element.name = source.data.kind === 'wireframe' ? source.data.title : element.name;
    } else {
      const parent = need(
        parentOf(tree.root, element.id),
        'Elegí una parte interna del componente.',
      );
      if (edit.kind === 'reparent') {
        const destination = need(elementAt(tree.root, edit.parent), 'Contenedor no disponible');
        ensure(
          !destination.material && destination !== element && !elementAt(element, destination.id),
          'COMPONENT_CYCLE',
          'Una pieza no puede contenerse a sí misma.',
        );
        ensure(
          Number.isInteger(edit.index) &&
            edit.index >= 0 &&
            edit.index <= destination.children.length,
          'COMPONENT_ORDER',
          'Posición no válida.',
        );
        movePart(tree, element, parent, destination, edit.index);
      } else if (edit.kind === 'transfer') {
        transferFramePart(world, group, parent, element, edit.frame, uid);
      } else if (edit.kind === 'detach') {
        const ids = elementMaterials(element);
        parent.children = parent.children.filter((e) => e !== element);
        group.nodes = group.nodes.filter((id) => !ids.includes(id));
        ensure(
          group.nodes.length > 0,
          'COMPONENT_EMPTY',
          'Usá Desagrupar para separar todas las piezas.',
        );
        layoutComponent(tree.root);
      } else {
        const copy = structuredClone(element);
        const clone = (e: ComponentElement) => {
          e.id = uid();
          if (e.material) {
            const node = structuredClone(world.nodes.find((n) => n.id === e.material)!);
            node.id = uid();
            e.material = node.id;
            world.nodes.push(node);
            group.nodes.push(node.id);
          }
          e.children.forEach(clone);
        };
        clone(copy);
        if (parent.layout.direction === 'free') {
          copy.x += 16;
          copy.y += 16;
        }
        parent.children.splice(parent.children.indexOf(element) + 1, 0, copy);
        layoutComponent(tree.root);
      }
    }
  }
  writeTreeGeometry(world, group);
}
function elementMaterialsById(root: ComponentElement): [string, string][] {
  return componentElements(root).flatMap((e) =>
    e.material ? [[e.id, e.material] as [string, string]] : [],
  );
}
function movePart(
  tree: ComponentTree,
  element: ComponentElement,
  parent: ComponentElement,
  destination: ComponentElement,
  index: number,
): void {
  const poses = componentPoses(tree);
  const placement = localPose(poses.get(destination.id)!, poses.get(element.id)!);
  parent.children = parent.children.filter((e) => e !== element);
  destination.children.splice(index, 0, element);
  element.x = placement.x;
  element.y = placement.y;
  if (!element.material && placement.rotation !== undefined) element.rotation = placement.rotation;
  delete element.margin;
  layoutComponent(tree.root);
}
