import type { Task, WorldSnapshot, ShippingRole } from './model';
export const shippingLabels: Record<ShippingRole, string> = {
  blocker: 'Bloquea lanzamiento',
  required: 'Para lanzar',
  later: 'Después',
};
export function shippingTasks(world: WorldSnapshot): Task[] {
  if (!world.shipping.active) return [...world.tasks];
  const rank = { blocker: 0, required: 1, later: 4 };
  return [...world.tasks].sort(
    (a, b) =>
      rank[a.shipping] +
      (a.status === 'done' ? 2 : 0) -
      (rank[b.shipping] + (b.status === 'done' ? 2 : 0)),
  );
}
export function releaseSummary(world: WorldSnapshot): {
  blockers: Task[];
  remaining: Task[];
  ready: number;
  total: number;
} {
  const scoped = world.tasks.filter((t) => t.shipping !== 'later');
  return {
    blockers: scoped.filter((t) => t.shipping === 'blocker' && t.status !== 'done'),
    remaining: scoped.filter((t) => t.status !== 'done'),
    ready: scoped.filter((t) => t.status === 'done').length,
    total: scoped.length,
  };
}
export type ShippingIntent =
  | { type: 'set'; active: boolean }
  | { type: 'query' }
  | { type: 'task'; role: ShippingRole; query: string };
/** Gramática de las instrucciones simuladas de Shipping admitidas por el prototipo. */
export function parseShippingIntent(text: string): ShippingIntent | null {
  const q = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (
    /(?:saca|sal[ií]?|desactiva|deshabilita|apaga|desconecta|quita).*(?:shipping|modo lanzamiento)|(?:shipping).*(?:off|desactivado)/.test(
      q,
    )
  )
    return { type: 'set', active: false };
  if (
    /(?:pone|pon |pasa|activa|habilita|enciende|entra|inicia).*(?:shipping|modo lanzamiento)|(?:shipping).*(?:on|activado)/.test(
      q,
    )
  )
    return { type: 'set', active: true };
  if (
    /(?:que falta|que .*bloque|que nos .*bloque|estado del|como va).*(?:ship|lanz)|(?:bloqueantes|bloqueos)/.test(
      q,
    )
  )
    return { type: 'query' };
  const quoted = /["“](.+?)["”]/.exec(text)?.[1];
  if (quoted && /(?:shipping|lanzamiento|para despues|bloque)/.test(q)) {
    const role: ShippingRole = /(?:despues|no bloquea|quita)/.test(q)
      ? 'later'
      : /bloquea|bloqueante/.test(q)
        ? 'blocker'
        : 'required';
    return { type: 'task', role, query: quoted };
  }
  return null;
}
