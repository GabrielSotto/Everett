import type { AgentRun } from './operations';
import type { DeepReadonly } from './readonly';
export const surfaces = ['session', 'canvas', 'docs', 'code', 'board', 'agents'] as const;
export type Surface = (typeof surfaces)[number];
export const surfaceNames: Record<Surface, string> = {
  session: 'Session',
  canvas: 'Canvas',
  docs: 'Docs',
  code: 'Code',
  board: 'Board',
  agents: 'Agents',
};
export const statuses = ['pending', 'planned', 'progress', 'review', 'done'] as const;
export type Status = (typeof statuses)[number];
export const statusNames: Record<Status, string> = {
  pending: 'Pendiente',
  planned: 'Planificado',
  progress: 'En curso',
  review: 'En revisión',
  done: 'Completado',
};
export interface Point {
  x: number;
  y: number;
}
export interface Camera extends Point {
  z: number;
}
export interface Rect extends Point {
  width: number;
  height: number;
}
export type Route =
  | {
      kind: 'universe';
    }
  | {
      kind: 'world';
      world: string;
    }
  | {
      kind: 'surface';
      world: string;
      surface: Surface;
      entity: string | null;
    }
  | {
      kind: 'note';
      world: string;
      entity: string;
    }
  | { kind: 'material'; world: string; entity: string };
export interface Frame {
  route: Route;
  camera: Camera;
}
export type Reference = {
  kind: 'document' | 'file' | 'task' | 'agent';
  id: string;
};
export type Anchor = 'north' | 'east' | 'south' | 'west';
export type Shape = 'rectangle' | 'ellipse' | 'triangle' | 'star';
export type NodeData =
  | {
      kind: 'note';
      title: string;
      text: string;
      color: string;
    }
  | {
      kind: 'shape';
      shape: Shape;
      title?: string;
      color: string;
      fill?: boolean;
      stroke?: string;
      thickness?: number;
    }
  | { kind: 'drawing'; title: string; points: readonly Point[]; color: string; thickness: number }
  | {
      kind: 'image' | 'video' | 'pdf';
      title: string;
      asset: string;
      mime: string;
      ratio: number;
      preview?: string;
      duration?: number;
    }
  | { kind: 'link'; title: string; url: string; description?: string; preview?: string }
  | {
      kind: 'reference';
      ref: Reference;
    };
export interface Material extends Rect {
  id: string;
  data: NodeData;
  owner: string | null;
}
export interface Link {
  id: string;
  from: string;
  to: string;
  fromAnchor: Anchor;
  toAnchor: Anchor;
  label?: string;
}
export interface Zone extends Rect {
  id: string;
  agent: string | null;
  name: string;
  instruction?: string;
}
export interface Assignment {
  id: string;
  agent: string;
  node: string;
  links: Link[];
  phase: 'working' | 'ready' | 'interrupted';
  revision: number;
  text: string;
  instruction: string;
  returnTo: Point;
  position: Point;
  feedback?: string;
  dueAt?: number;
  runId?: string;
  input?: string;
}
export interface Document {
  id: string;
  title: string;
  body: string;
  sheet: string[][] | null;
}
export interface CodeFile {
  id: string;
  name: string;
  text: string;
  saved: string;
  revision: number;
}
export type ShippingRole = 'blocker' | 'required' | 'later';
export interface ShippingState {
  active: boolean;
  changedAt: number | null;
  source: 'board' | 'agent' | null;
}
export interface Task {
  shipping: ShippingRole;
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: string;
  assignee: string;
  creator: string;
  start: string;
  due: string;
  origin: Surface;
  custom: Record<string, string>;
}
export interface Property {
  id: string;
  name: string;
  type: 'text' | 'date' | 'number';
  custom: boolean;
}
export interface Agent {
  templateId?: string;
  id: string;
  name: string;
  role: string;
  color: string;
  active: boolean;
  capabilities: string[];
  memory: string[];
}
export interface Message {
  id: string;
  role: 'user' | 'agent';
  name: string;
  text: string;
  plan: string[] | null;
  refs: Reference[];
  materialIds?: string[];
}
export interface Comment {
  id: string;
  node: string;
  author: string;
  text: string;
  resolved: boolean;
  replies: string[];
}
export interface Proposal {
  file: string;
  before: string;
  after: string;
  revision: number;
  summary: string;
}
export interface Conversation {
  id: string;
  name: string;
  origin: Surface;
  participants: string[];
  messages: Message[];
}
export interface World extends Point {
  conversations: Conversation[];
  shipping: ShippingState;
  id: string;
  name: string;
  region: string;
  seed: number;
  archived: boolean;
  objective: string;
  docs: Document[];
  files: CodeFile[];
  tasks: Task[];
  agents: Agent[];
  nodes: Material[];
  referenceTargets?: Record<string, Reference>;
  links: Link[];
  zones: Zone[];
  assignments: Assignment[];
  comments: Comment[];
  messages: Message[];
  chat: Message[];
  participants: string[];
  codeMessages: Message[];
  runs: AgentRun[];
  proposal: Proposal | null;
  properties: Property[];
  visibleProperties: string[];
  boardView: 'kanban' | 'table' | 'calendar';
  branch: string;
  activity: {
    action: string;
    at: string;
  }[];
}
export interface Profile {
  id?: string;
  name: string;
  bio: string;
  language: 'es-AR' | 'es-ES';
}
export interface State {
  profile: Profile;
  version: 1;
  worlds: World[];
  route: Route;
  camera: Camera;
  history: Frame[];
  seq: number;
}
export type WorldSnapshot = DeepReadonly<World>;
export function need<T>(x: T | undefined | null, description: string): T {
  if (x === undefined || x === null) throw new Error(description);
  return x;
}
export function getWorld(s: State, id: string): World;
export function getWorld(s: DeepReadonly<State>, id: string): DeepReadonly<World>;
export function getWorld(s: DeepReadonly<State>, id: string): DeepReadonly<World> {
  return need(
    s.worlds.find((w) => w.id === id),
    'Mundo inexistente',
  );
}
export function activeWorld(s: DeepReadonly<State>): DeepReadonly<World> | null {
  return s.route.kind === 'universe' ? null : getWorld(s, s.route.world);
}
export function routeKey(r: Route): string {
  return r.kind === 'universe'
    ? 'universe'
    : r.kind === 'world'
      ? `world/${r.world}`
      : r.kind === 'note' || r.kind === 'material'
        ? `${r.world}/${r.kind}/${r.entity}`
        : `${r.world}/${r.surface}/${r.entity ?? ''}`;
}
export function nodeTitle(w: DeepReadonly<World>, n: Material): string {
  if (n.data.kind !== 'reference') return n.data.title?.trim() || 'Sin nombre';
  return referenceTitle(w, n.data.ref) ?? 'Referencia';
}
function referenceTitle(w: DeepReadonly<World>, ref: Reference): string | null {
  const title =
    ref.kind === 'document'
      ? w.docs.find((d) => d.id === ref.id)?.title
      : ref.kind === 'file'
        ? w.files.find((f) => f.id === ref.id)?.name
        : ref.kind === 'task'
          ? w.tasks.find((t) => t.id === ref.id)?.title
          : w.agents.find((a) => a.id === ref.id)?.name;
  return title === undefined ? null : title.trim() ? title : 'Sin nombre';
}
/** Una referencia del chat conserva el registro compartido al retirar su representación. */
export function materialTitle(w: DeepReadonly<World>, id: string): string {
  const node = w.nodes.find((n) => n.id === id),
    ref = w.referenceTargets?.[id];
  return node ? nodeTitle(w, node) : (ref && referenceTitle(w, ref)) || 'Material no disponible';
}
export function referenceRoute(world: string, ref: Reference): Route {
  return {
    kind: 'surface',
    world,
    surface:
      ref.kind === 'document'
        ? 'docs'
        : ref.kind === 'file'
          ? 'code'
          : ref.kind === 'task'
            ? 'board'
            : 'agents',
    entity: ref.id,
  };
}
export function materialRoute(s: DeepReadonly<State>, world: string, id: string): Route | null {
  const source = getWorld(s, world),
    n = source.nodes.find((n) => n.id === id);
  if (!n) {
    const ref = source.referenceTargets?.[id];
    return ref && referenceTitle(source, ref) !== null ? referenceRoute(world, ref) : null;
  }
  return n.owner
    ? null
    : n.data.kind === 'note'
      ? { kind: 'note', world, entity: id }
      : n.data.kind === 'reference'
        ? referenceRoute(world, n.data.ref)
        : ['image', 'video', 'pdf', 'link'].includes(n.data.kind)
          ? { kind: 'material', world, entity: id }
          : null;
}
