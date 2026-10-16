import type { Command } from '../command-types';
import { getWorld, need, type State } from '../model';
import { ensure } from '../invariants';
import { referenceSource } from '../reference-anchors';

type OrganizationCommand = Extract<
  Command,
  { type: 'group.create' | 'group.rename' | 'group.ungroup' | 'reference.fragment' }
>;
export function applyOrganizationCommand(state: State, c: OrganizationCommand): void {
  const world = getWorld(state, c.world);
  if (c.type === 'group.create') {
    ensure(
      c.nodes.length >= 2 &&
        new Set(c.nodes).size === c.nodes.length &&
        c.nodes.every((id) => world.nodes.some((n) => n.id === id && !n.owner)),
      'GROUP',
      'Elegí al menos dos materiales disponibles',
    );
    ensure(
      !world.canvasGroups?.some((g) => g.nodes.some((id) => c.nodes.includes(id))),
      'GROUP',
      'Separá primero los conjuntos existentes',
    );
    ensure(!!c.name.trim(), 'GROUP', 'Ingresá un nombre para el conjunto');
    (world.canvasGroups ??= []).push({
      id: `group-${++state.seq}`,
      name: c.name.trim(),
      nodes: [...c.nodes],
    });
  } else if (c.type === 'group.rename' || c.type === 'group.ungroup') {
    const group = need(
      world.canvasGroups?.find((g) => g.id === c.id),
      'Conjunto inexistente',
    );
    if (c.type === 'group.rename') {
      ensure(!!c.name.trim(), 'GROUP', 'Ingresá un nombre para el conjunto');
      group.name = c.name.trim();
    } else world.canvasGroups = world.canvasGroups!.filter((g) => g.id !== c.id);
  } else {
    const node = need(
      world.nodes.find((n) => n.id === c.id),
      'Material inexistente',
    );
    ensure(
      !node.owner &&
        node.data.kind === 'reference' &&
        ['document', 'file'].includes(node.data.ref.kind),
      'FRAGMENT',
      'Elegí una referencia disponible a Docs o Code',
    );
    if (node.data.kind !== 'reference') return;
    if (c.range === null) {
      delete node.data.ref.fragment;
      return;
    }
    const source = referenceSource(world, node.data.ref);
    ensure(
      source !== null &&
        Number.isInteger(c.range.start) &&
        Number.isInteger(c.range.end) &&
        c.range.start >= 0 &&
        c.range.end > c.range.start &&
        c.range.end <= source.length,
      'FRAGMENT',
      'Seleccioná un fragmento del contenido actual',
    );
    const id = `fragment-${++state.seq}`;
    (world.referenceAnchors ??= []).push({
      id,
      kind: node.data.ref.kind as 'document' | 'file',
      source: node.data.ref.id,
      start: c.range.start,
      end: c.range.end,
      quote: source!.slice(c.range.start, c.range.end),
      status: 'attached',
    });
    node.data.ref.fragment = id;
  }
}
