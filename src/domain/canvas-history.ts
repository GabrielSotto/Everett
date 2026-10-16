import { getWorld, type State, type World } from './model';
import type { Command } from './command-types';
import { rebaseAnchor, referenceSource } from './reference-anchors';

type CanvasSnapshot = Required<
  Pick<
    World,
    | 'nodes'
    | 'links'
    | 'zones'
    | 'comments'
    | 'docs'
    | 'tasks'
    | 'files'
    | 'agents'
    | 'canvasGroups'
    | 'referenceAnchors'
  >
>;
interface Entry {
  before: CanvasSnapshot;
  after: CanvasSnapshot;
  action: string;
  at: number;
}
interface Timeline {
  past: Entry[];
  future: Entry[];
}
const reversible = new Set<Command['type']>([
  'group.create',
  'group.rename',
  'group.ungroup',
  'reference.fragment',
  'node.create',
  'node.rename',
  'node.duplicate',
  'node.style',
  'link.label',
  'link.reconnect',
  'zone.instruction',
  'zone.rename',
  'node.move',
  'nodes.move',
  'nodes.delete',
  'node.resize',
  'node.edit',
  'node.delete',
  'link.create',
  'link.delete',
  'zone.create',
  'zone.edit',
  'zone.delete',
  'zone.agent',
  'comment',
  'comment.reply',
  'comment.resolve',
]);
const barriers = new Set<Command['type']>(['assign', 'nodes.assign', 'assignment.finish']);
function capture(w: World): CanvasSnapshot {
  return structuredClone({
    nodes: w.nodes,
    links: w.links,
    zones: w.zones,
    comments: w.comments,
    docs: w.docs,
    tasks: w.tasks,
    files: w.files,
    agents: w.agents,
    canvasGroups: w.canvasGroups ?? [],
    referenceAnchors: w.referenceAnchors ?? [],
  });
}

/** El historial conserva ediciones del Canvas. Los traspasos de materiales cierran la secuencia reversible. */
export class CanvasHistory {
  private timelines = new Map<string, Timeline>();
  private timeline(world: string): Timeline {
    let t = this.timelines.get(world);
    if (!t) {
      t = { past: [], future: [] };
      this.timelines.set(world, t);
    }
    return t;
  }
  status(world: string): { undo: number; redo: number } {
    const t = this.timeline(world);
    return { undo: t.past.length, redo: t.future.length };
  }
  record(before: State, after: State, command: Command): void {
    if (!('world' in command)) return;
    const t = this.timeline(command.world);
    const oldWorld = getWorld(before, command.world);
    if (command.type === 'asset.preview') {
      // El fotograma es una caché del archivo inmutable, independiente de las ediciones.
      for (const entry of [...t.past, ...t.future])
        for (const snapshot of [entry.before, entry.after])
          for (const material of snapshot.nodes)
            if (
              material.data.kind === 'video' &&
              material.data.asset === command.asset &&
              !material.data.preview
            )
              material.data.preview = command.preview;
      return;
    }
    const zoneAgent =
      command.type === 'zone.delete' || command.type === 'zone.agent'
        ? oldWorld.zones.find((z) => z.id === command.id)?.agent
        : null;
    const releasesOwnership =
      !!zoneAgent &&
      (command.type === 'zone.delete' || command.type === 'zone.agent') &&
      (oldWorld.nodes.some((n) => n.owner === zoneAgent) ||
        oldWorld.assignments.some((a) => a.agent === zoneAgent));
    if (barriers.has(command.type) || releasesOwnership) {
      t.past = [];
      t.future = [];
      return;
    }
    if (!reversible.has(command.type)) return;
    const a = capture(getWorld(before, command.world)),
      b = capture(getWorld(after, command.world));
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    const action = command.type + ('id' in command ? ':' + command.id : '');
    const at = Date.now(),
      previous = t.past.at(-1);
    // Agrupa una ráfaga de escritura; los arrastres se confirman al soltar el puntero.
    if (
      command.type === 'node.edit' &&
      previous?.action === action &&
      at - previous.at < 750 &&
      t.future.length === 0
    ) {
      previous.after = b;
      previous.at = at;
    } else t.past.push({ before: a, after: b, action, at });
    t.future = [];
    if (t.past.length > 100) t.past.shift();
  }
  candidate(state: State, world: string, direction: 'undo' | 'redo'): State {
    const t = this.timeline(world),
      e = (direction === 'undo' ? t.past : t.future).at(-1);
    if (!e) return state;
    const next = structuredClone(state);
    const destination = getWorld(next, world);
    const source = direction === 'undo' ? e.after : e.before;
    const target = direction === 'undo' ? e.before : e.after;
    // Aplicar solo el delta de registros compartidos; no rebobinar ediciones ajenas.
    destination.referenceAnchors ??= [];
    for (const group of ['docs', 'tasks', 'files', 'agents', 'referenceAnchors'] as const) {
      const sourceItems = source[group] as unknown as {
        id: string;
        [key: string]: unknown;
      }[];
      const targetItems = target[group] as unknown as { id: string; [key: string]: unknown }[];
      const currentItems = destination[group] as unknown as {
        id: string;
        [key: string]: unknown;
      }[];
      for (const id of new Set([...sourceItems, ...targetItems].map((item) => item.id))) {
        const a = sourceItems.find((item) => item.id === id),
          b = targetItems.find((item) => item.id === id);
        if (JSON.stringify(a) === JSON.stringify(b)) continue;
        const index = currentItems.findIndex((item) => item.id === id);
        if (!b && index >= 0) currentItems.splice(index, 1);
        else if (!a && b && index < 0) currentItems.push(structuredClone(b));
        else if (a && b && index >= 0)
          for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
            if (JSON.stringify(a[key]) !== JSON.stringify(b[key]))
              currentItems[index]![key] = structuredClone(b[key]);
          }
      }
    }
    const {
      docs: _docs,
      tasks: _tasks,
      files: _files,
      agents: _agents,
      referenceAnchors: _anchors,
      ...canvas
    } = target;
    Object.assign(destination, structuredClone(canvas));
    for (const anchor of destination.referenceAnchors ?? []) {
      if (getWorld(state, world).referenceAnchors?.some((a) => a.id === anchor.id)) continue;
      const ref = { kind: anchor.kind, id: anchor.source };
      const before = referenceSource(
        { ...destination, docs: target.docs, files: target.files },
        ref,
      );
      const after = referenceSource(destination, ref);
      if (before !== null && after !== null) rebaseAnchor(anchor, before, after);
    }
    return next;
  }
  commit(world: string, direction: 'undo' | 'redo', state: State): void {
    const t = this.timeline(world),
      source = direction === 'undo' ? t.past : t.future,
      destination = direction === 'undo' ? t.future : t.past;
    const entry = source.pop();
    if (!entry) return;
    const current = getWorld(state, world),
      from = direction === 'undo' ? entry.after : entry.before,
      to = direction === 'undo' ? entry.before : entry.after;
    // Al retirar un registro creado por Canvas, conservar sus últimas ediciones
    // compartidas para la próxima restauración. Solo confirmar tras validar el estado.
    for (const group of ['docs', 'tasks', 'files', 'agents', 'referenceAnchors'] as const) {
      const items = from[group] as unknown as { id: string }[];
      for (let index = 0; index < items.length; index++) {
        const item = items[index]!;
        if (to[group].some((other) => other.id === item.id)) continue;
        const live = current[group]?.find((other) => other.id === item.id);
        if (live) items[index] = structuredClone(live);
      }
    }
    destination.push(entry);
  }
}
