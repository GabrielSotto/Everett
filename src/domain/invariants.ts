import { getWorld, need, type State } from './model';
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
export function ensure(ok: boolean, code: string, message: string): void {
  if (!ok) throw new DomainError(code, message);
}
export function validate(s: State): void {
  ensure(
    new Set(s.worlds.map((w) => w.id)).size === s.worlds.length,
    'DUPLICATE_WORLD',
    'Identificador de mundo duplicado',
  );
  ensure(
    Number.isFinite(s.camera.x) &&
      Number.isFinite(s.camera.y) &&
      Number.isFinite(s.camera.z) &&
      s.camera.z > 0,
    'CAMERA',
    'Cámara inválida',
  );
  ensure(!!s.profile.name.trim(), 'PROFILE', 'Nombre de perfil requerido');
  for (const w of s.worlds) {
    ensure(typeof w.shipping.active === 'boolean', 'SHIPPING', 'Estado Shipping inválido');
    for (const task of w.tasks)
      ensure(
        ['blocker', 'required', 'later'].includes(task.shipping),
        'SHIPPING_ROLE',
        'Prioridad de lanzamiento inválida',
      );
    const boundAgents = w.zones.map((z) => z.agent).filter(Boolean);
    ensure(
      new Set(boundAgents).size === boundAgents.length,
      'ZONE_INSTANCE',
      'Cada zona utiliza una instancia independiente',
    );
    for (const group of [
      w.nodes,
      w.docs,
      w.files,
      w.tasks,
      w.agents,
      w.assignments,
      w.links,
      w.zones,
      w.runs,
    ])
      ensure(
        new Set(group.map((x) => x.id)).size === group.length,
        'DUPLICATE_ENTITY',
        'Identificador duplicado',
      );
    const assigned = new Set<string>();
    for (const a of w.assignments) {
      const node = need(
        w.nodes.find((n) => n.id === a.node),
        'Material asignado inexistente',
      );
      ensure(!assigned.has(a.node), 'DOUBLE_ASSIGN', 'El material tiene dos responsables');
      assigned.add(a.node);
      ensure(node.owner === a.agent, 'OWNERSHIP', 'Propiedad y asignación inconsistentes');
      ensure(
        w.agents.some((agent) => agent.id === a.agent),
        'AGENT',
        'Agente inexistente',
      );
    }
    for (const n of w.nodes) {
      ensure(
        [n.x, n.y, n.width, n.height].every(Number.isFinite) && n.width >= 4 && n.height >= 4,
        'GEOMETRY',
        'Geometría inválida',
      );
      if (n.owner) ensure(assigned.has(n.id), 'ORPHAN', 'Material bloqueado sin trabajo');
      if (n.data.kind === 'reference') {
        const r = n.data.ref;
        ensure(
          r.kind === 'document'
            ? w.docs.some((d) => d.id === r.id)
            : r.kind === 'file'
              ? w.files.some((f) => f.id === r.id)
              : r.kind === 'task'
                ? w.tasks.some((t) => t.id === r.id)
                : w.agents.some((a) => a.id === r.id),
          'REFERENCE',
          'Referencia sin destino',
        );
      }
    }
    for (const z of w.zones) {
      ensure(
        [z.x, z.y, z.width, z.height].every(Number.isFinite) && z.width >= 4 && z.height >= 4,
        'ZONE_GEOMETRY',
        'Geometría de zona inválida',
      );
      ensure(
        z.agent === null || w.agents.some((a) => a.id === z.agent),
        'ZONE_AGENT',
        'Agente de zona inexistente',
      );
    }
    for (const run of w.runs) {
      ensure(
        w.agents.some((a) => a.id === run.agent),
        'RUN_AGENT',
        'Agente de ejecución inexistente',
      );
      ensure(
        Number.isFinite(run.startedAt) &&
          (run.finishedAt === null ||
            (Number.isFinite(run.finishedAt) && run.finishedAt >= run.startedAt)),
        'RUN_TIME',
        'Tiempos de ejecución inválidos',
      );
      ensure(
        run.costUsd === null || (Number.isFinite(run.costUsd) && run.costUsd >= 0),
        'RUN_COST',
        'Coste inválido',
      );
      ensure(
        run.tokens === null || (Number.isFinite(run.tokens) && run.tokens >= 0),
        'RUN_TOKENS',
        'Consumo inválido',
      );
    }
    for (const l of w.links) {
      ensure(
        ['north', 'east', 'south', 'west'].includes(l.fromAnchor) &&
          ['north', 'east', 'south', 'west'].includes(l.toAnchor),
        'LINK_ANCHOR',
        'Punto de anclaje inválido',
      );
      const a = w.nodes.find((n) => n.id === l.from),
        b = w.nodes.find((n) => n.id === l.to);
      ensure(
        !!a && !!b && !a.owner && !b.owner && a.id !== b.id,
        'LINK',
        'Conexión sin dos materiales disponibles',
      );
    }
  }
  for (const r of [s.route, ...s.history.map((f) => f.route)]) {
    if (r.kind === 'universe') continue;
    const w = getWorld(s, r.world);
    if (r.kind === 'note')
      ensure(
        w.nodes.some((n) => n.id === r.entity && n.data.kind === 'note' && !n.owner),
        'NOTE_ROUTE',
        'Nota no disponible',
      );
    if (r.kind === 'surface' && r.entity)
      ensure(
        r.surface === 'docs'
          ? w.docs.some((d) => d.id === r.entity)
          : r.surface === 'code'
            ? w.files.some((f) => f.id === r.entity)
            : r.surface === 'board'
              ? w.tasks.some((t) => t.id === r.entity)
              : r.surface === 'agents'
                ? w.agents.some((a) => a.id === r.entity)
                : false,
        'ROUTE',
        'Objeto de destino inexistente',
      );
  }
}
