import { getWorld, type State, type World } from './model';
import type { Command } from './command-types';
import { rebaseAnchor, referenceSource } from './reference-anchors';
import { resolveMedia } from './resolved-media';
import { wireframeAppearance, type WireframeAppearance } from './wireframes';

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
  'group.remove',
  'group.rename',
  'group.ungroup',
  'group.resize',
  'reference.fragment',
  'node.create',
  'node.rename',
  'node.duplicate',
  'nodes.duplicate',
  'nodes.paste',
  'node.local-edit',
  'wireframe.edit',
  'wireframe.compose',
  'wireframe.library',
  'node.publish',
  'node.style',
  'link.label',
  'link.reconnect',
  'zone.instruction',
  'zone.rename',
  'node.move',
  'nodes.move',
  'nodes.order',
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
    if (command.type === 'node.resolve-link') {
      for (const entry of [...t.past, ...t.future])
        for (const snapshot of [entry.before, entry.after])
          for (const material of snapshot.nodes)
            if (material.id === command.id) resolveMedia(material, command.url, command.data);
      return;
    }
    if (command.type === 'node.link-preview') {
      // Metadatos derivados: conservarlos al deshacer posiciones o nombres.
      for (const entry of [...t.past, ...t.future])
        for (const snapshot of [entry.before, entry.after])
          for (const material of snapshot.nodes)
            if (
              material.id === command.id &&
              material.data.kind === 'link' &&
              material.data.url === command.url
            )
              material.data.metadata = structuredClone(command.metadata);
      return;
    }
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
    let action = command.type + ('id' in command ? ':' + command.id : '');
    let typing =
      command.type === 'node.edit' ||
      command.type === 'node.local-edit' ||
      command.type === 'wireframe.edit';
    if (command.type === 'wireframe.edit') {
      const old = a.nodes.find((node) => node.id === command.id)?.data;
      if (old?.kind === 'wireframe') {
        if (JSON.stringify(old.content.appearance) !== JSON.stringify(command.content.appearance)) {
          const oldStyle = wireframeAppearance(old.content),
            newStyle = wireframeAppearance(command.content);
          const changed = (
            ['fill', 'stroke', 'text', 'radius'] as (keyof WireframeAppearance)[]
          ).filter((key) => oldStyle[key] !== newStyle[key]);
          action += ':appearance:' + changed.join(',');
        } else if (
          old.content.placeholder !== command.content.placeholder &&
          old.content.type !== 'table' &&
          command.content.type !== 'table' &&
          old.content.text === command.content.text
        ) {
          action += ':placeholder';
          typing = false;
        } else if (
          old.content.type !== 'table' &&
          command.content.type !== 'table' &&
          ['list', 'menu', 'carousel'].includes(command.content.type)
        ) {
          const before = old.content.text.split('\n'),
            after = command.content.text.split('\n');
          if (before.length !== after.length) typing = false;
          else action += ':item:' + before.findIndex((line, index) => line !== after[index]);
        }
      }
    }
    if (command.type === 'wireframe.edit' && command.content.type === 'table') {
      const old = a.nodes.find((node) => node.id === command.id)?.data;
      const cells = command.content.cells;
      typing = false;
      if (
        old?.kind === 'wireframe' &&
        old.content.type === 'table' &&
        old.content.cells.length === cells.length &&
        old.content.cells[0]!.length === cells[0]!.length
      ) {
        const changed: string[] = [];
        old.content.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (cell !== cells[r]![c]) changed.push(`${r}:${c}`);
          }),
        );
        if (changed.length === 1) {
          typing = true;
          action += ':cell:' + changed[0];
        }
      }
    }
    const at = Date.now(),
      previous = t.past.at(-1);
    // Agrupa una ráfaga de escritura; los arrastres se confirman al soltar el puntero.
    if (typing && previous?.action === action && at - previous.at < 750 && t.future.length === 0) {
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
        if (group === 'referenceAnchors' && a && !b && index >= 0) {
          const anchor = source.referenceAnchors.find((item) => item.id === id)!;
          const retained =
            Object.values(destination.referenceTargets ?? {}).some((ref) => ref.fragment === id) ||
            destination.conversations.some((thread) =>
              thread.messages.some((message) => message.refs.some((ref) => ref.fragment === id)),
            );
          // Quitar una representación o deshacer su precisión no rompe referencias
          // ya compartidas por el chat al documento que todavía existe.
          if (
            retained &&
            referenceSource(destination, { kind: anchor.kind, id: anchor.source }) !== null
          )
            continue;
        }
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
