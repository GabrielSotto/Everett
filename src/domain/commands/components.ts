import { getWorld, need, type State, type Rect } from '../model';
import type { Command } from '../command-types';
import { ensure } from '../invariants';
import {
  elementAt,
  parentOf,
  elementMaterials,
  elementRect,
  treeFromMaterials,
  writeTreeGeometry,
  validComponentTree,
  freeLayout,
  type ComponentElement,
  type ComponentLayout,
  type Sizing,
} from '../component-tree';
import { layoutComponent } from '../component-layout';
import { captureComposition } from '../component-recipes';
import { instantiateLibrary, validLibraryComposition, libraryBounds } from '../sketch-library';
import { resizedComponent } from '../component-resize';
import { groupBounds } from '../manual-groups';

export type ComponentEdit =
  | { kind: 'initialize' }
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
  | { kind: 'duplicate'; element: string }
  | { kind: 'replace'; element: string; material: string }
  | { kind: 'adopt'; parent: string; materials: string[] }
  | { kind: 'nest'; parent: string; group: string }
  | { kind: 'resize'; rect: Rect; scale: boolean };

type ComponentCommand = Extract<
  Command,
  {
    type:
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
    for (const element of mutableElements(result.group!.structure!.root))
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
  group.structure ??= treeFromMaterials(
    world.nodes.filter((n) => group.nodes.includes(n.id)),
    group.name,
  );
  group.component = true;
  const tree = group.structure,
    edit = c.edit;
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
      const scaled = resizedComponent(world, group, edit.rect, true);
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
    const source = need(
      world.canvasGroups?.find((g) => g.id === edit.group),
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
        return n && !n.owner && n.data.kind === 'wireframe' && !!n.data.content.piece;
      }),
      'COMPONENT_CONTENT',
      'Elegí un componente de piezas disponibles.',
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
    const position = elementRect(tree, parent.id)!;
    nested.root.x += nested.origin.x - position.x;
    nested.root.y += nested.origin.y - position.y;
    for (const e of mutableElements(nested.root)) e.id = uid();
    parent.children.push(nested.root);
    group.nodes.push(...source.nodes);
    world.canvasGroups = world.canvasGroups!.filter((g) => g.id !== source.id);
    layoutComponent(tree.root);
  } else if (edit.kind === 'adopt') {
    const parent = need(elementAt(tree.root, edit.parent), 'Contenedor no disponible');
    ensure(
      !parent.material &&
        edit.materials.length > 0 &&
        new Set(edit.materials).size === edit.materials.length,
      'COMPONENT_PARENT',
      'Elegí un contenedor y piezas distintas.',
    );
    const origin = elementRect(tree, parent.id)!;
    for (const id of edit.materials) {
      const node = need(
        world.nodes.find((n) => n.id === id),
        'Pieza no disponible',
      );
      ensure(
        !node.owner &&
          node.data.kind === 'wireframe' &&
          !!node.data.content.piece &&
          !world.canvasGroups?.some((g) => g.nodes.includes(id)),
        'COMPONENT_MEMBERSHIP',
        'La pieza debe estar libre antes de incorporarla.',
      );
      parent.children.push({
        id: uid(),
        name: node.data.kind === 'wireframe' ? node.data.title : 'Pieza',
        material: id,
        x: node.x - origin.x,
        y: node.y - origin.y,
        width: node.width,
        height: node.height,
        widthMode: 'fixed',
        heightMode: 'fixed',
        layout: freeLayout(),
        children: [],
      });
      group.nodes.push(id);
    }
    layoutComponent(tree.root);
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
    if (edit.kind === 'properties') {
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
        const previous = elementRect(tree, element.id)!,
          next = elementRect(tree, destination.id)!;
        parent.children = parent.children.filter((e) => e !== element);
        destination.children.splice(edit.index, 0, element);
        element.x = previous.x - next.x;
        element.y = previous.y - next.y;
        delete element.margin;
        layoutComponent(tree.root);
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
function mutableElements(root: ComponentElement): ComponentElement[] {
  return [root, ...root.children.flatMap(mutableElements)];
}
function elementMaterialsById(root: ComponentElement): [string, string][] {
  return mutableElements(root).flatMap((e) =>
    e.material ? [[e.id, e.material] as [string, string]] : [],
  );
}
