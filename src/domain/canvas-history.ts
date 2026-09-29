import { getWorld, type State, type World } from './model';
import type { Command } from './command-types';

type CanvasSnapshot = Pick<World, 'nodes' | 'links' | 'zones' | 'comments'>;
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
  'node.create',
  'node.move',
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
const barriers = new Set<Command['type']>(['assign', 'assignment.finish']);
function capture(w: World): CanvasSnapshot {
  return structuredClone({ nodes: w.nodes, links: w.links, zones: w.zones, comments: w.comments });
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
    Object.assign(
      getWorld(next, world),
      structuredClone(direction === 'undo' ? e.before : e.after),
    );
    return next;
  }
  commit(world: string, direction: 'undo' | 'redo'): void {
    const t = this.timeline(world),
      source = direction === 'undo' ? t.past : t.future,
      destination = direction === 'undo' ? t.future : t.past;
    const entry = source.pop();
    if (entry) destination.push(entry);
  }
}
