import { type State, getWorld, type Material, need, nodeTitle } from '../model';
import type { Command } from '../command-types';
import { ensure } from '../invariants';
import { releaseZoneMaterials } from '../zone-ownership';
import { restoreMaterialLinks } from '../material-links';

type CanvasCommand = Extract<
  Command,
  {
    type:
      | 'node.create'
      | 'node.move'
      | 'node.edit'
      | 'node.delete'
      | 'link.create'
      | 'link.delete'
      | 'node.resize'
      | 'zone.create'
      | 'zone.edit'
      | 'zone.delete'
      | 'zone.agent'
      | 'canvas.undo'
      | 'canvas.redo'
      | 'assign'
      | 'assignment.ready'
      | 'assignment.revise'
      | 'assignment.finish'
      | 'comment'
      | 'comment.resolve'
      | 'comment.reply';
  }
>;

export function applyCanvasCommand(state: State, command: CanvasCommand): void {
  const world = getWorld(state, command.world);
  const uid = (): string => `e-${++state.seq}`;
  const node = (id: string): Material =>
    need(
      world.nodes.find((material) => material.id === id),
      'Material inexistente',
    );
  switch (command.type) {
    case 'node.create':
      world.nodes.push(command.node);
      break;
    case 'node.move': {
      const x = node(command.id);
      ensure(!x.owner, 'LOCKED', 'El agente está usando el material');
      x.x = command.point.x;
      x.y = command.point.y;
      break;
    }
    case 'node.edit': {
      const x = node(command.id);
      ensure(!x.owner && x.data.kind === 'note', 'EDIT', 'Nota no disponible');
      x.data = { kind: 'note', title: command.title, text: command.text, color: command.color };
      break;
    }
    case 'node.delete': {
      ensure(!node(command.id).owner, 'LOCKED', 'Cancelar el trabajo antes de quitar el material');
      world.nodes = world.nodes.filter((x) => x.id !== command.id);
      world.links = world.links.filter((l) => l.from !== command.id && l.to !== command.id);
      world.comments = world.comments.filter((x) => x.node !== command.id);
      break;
    }
    case 'link.create': {
      const a = node(command.from),
        b = node(command.to);
      ensure(a.id !== b.id && !a.owner && !b.owner, 'LINK', 'Elegir dos materiales disponibles');
      const existing = world.links.some(
        (l) =>
          l.from === a.id &&
          l.to === b.id &&
          l.fromAnchor === command.fromAnchor &&
          l.toAnchor === command.toAnchor,
      );
      if (!existing)
        world.links.push({
          id: uid(),
          from: a.id,
          to: b.id,
          fromAnchor: command.fromAnchor,
          toAnchor: command.toAnchor,
        });
      break;
    }
    case 'link.delete':
      ensure(
        world.links.some((l) => l.id === command.id),
        'LINK',
        'Conexión inexistente',
      );
      world.links = world.links.filter((l) => l.id !== command.id);
      break;
    case 'node.resize':
      ensure(!node(command.id).owner, 'LOCKED', 'El agente está usando el material');
      Object.assign(node(command.id), command.rect);
      break;
    case 'zone.create':
      world.zones.push(command.zone);
      break;
    case 'zone.edit':
      ensure(false, 'ZONE_FIXED', 'La geometría de esta zona queda fijada al crearla');
      break;
    case 'zone.delete': {
      const zone = need(
        world.zones.find((z) => z.id === command.id),
        'Zona inexistente',
      );
      releaseZoneMaterials(world, zone, Date.now());
      world.zones = world.zones.filter((z) => z.id !== command.id);
      break;
    }
    case 'zone.agent': {
      const zone = need(
        world.zones.find((z) => z.id === command.id),
        'Zona inexistente',
      );
      ensure(
        command.agent === null || world.agents.some((a) => a.id === command.agent),
        'AGENT',
        'Agente inexistente',
      );
      if (zone.agent === command.agent) break;
      releaseZoneMaterials(world, zone, Date.now());
      if (command.agent && world.zones.some((z) => z.id !== zone.id && z.agent === command.agent)) {
        const template = need(
          world.agents.find((a) => a.id === command.agent),
          'Agente inexistente',
        );
        const instance = {
          ...structuredClone(template),
          id: uid(),
          templateId: template.templateId ?? template.id,
        };
        world.agents.push(instance);
        zone.agent = instance.id;
        zone.name = instance.name;
      } else {
        zone.agent = command.agent;
        zone.name = command.agent ? world.agents.find((a) => a.id === command.agent)!.name : 'Zona';
      }
      break;
    }
    case 'canvas.undo':
    case 'canvas.redo':
      throw new Error('El historial del Canvas debe ejecutarse desde Store');
    case 'assign': {
      const m = node(command.node),
        a = need(
          world.agents.find((a) => a.id === command.agent),
          'Agente inexistente',
        );
      ensure(!m.owner && a.active, 'ASSIGN', 'Material o agente no disponible');
      const links = world.links.filter((l) => l.from === m.id || l.to === m.id);
      world.links = world.links.filter((l) => !links.includes(l));
      m.owner = a.id;
      const z = world.zones.find((z) => z.agent === a.id);
      world.assignments.push({
        id: uid(),
        agent: a.id,
        node: m.id,
        links,
        phase: 'working',
        revision: 1,
        text: '',
        instruction: command.instruction ?? '',
        returnTo: command.returnTo ?? { x: m.x, y: m.y },
        position: { x: z?.x ?? 300, y: z ? z.y + z.height + 50 : 300 },
      });
      break;
    }
    case 'assignment.ready': {
      const a = world.assignments.find((a) => a.id === command.id);
      if (a && a.revision === command.revision && a.phase === 'working') {
        a.text = command.text;
        a.phase = 'ready';
      }
      break;
    }
    case 'assignment.revise': {
      const a = need(
        world.assignments.find((a) => a.id === command.id),
        'Propuesta inexistente',
      );
      a.revision++;
      a.phase = 'working';
      a.instruction = command.text;
      break;
    }
    case 'assignment.finish': {
      const a = need(
        world.assignments.find((a) => a.id === command.id),
        'Asignación inexistente',
      );
      ensure(
        command.decision !== 'accept' || a.phase === 'ready',
        'NOT_READY',
        'El resultado todavía no está listo',
      );
      const m = node(a.node);
      m.owner = null;
      m.x = a.returnTo.x;
      m.y = a.returnTo.y;
      if (command.decision === 'accept') {
        const result: Material = {
          id: uid(),
          ...a.position,
          width: 270,
          height: 220,
          owner: null,
          data: { kind: 'note', title: nodeTitle(world, m), text: a.text, color: '#e4efdf' },
        };
        world.nodes.push(result);
      }
      world.assignments = world.assignments.filter((x) => x.id !== a.id);
      restoreMaterialLinks(world, a.links);
      break;
    }
    case 'comment':
      world.comments.push({
        id: uid(),
        node: command.node,
        author: state.profile.name,
        text: command.text,
        resolved: false,
        replies: [],
      });
      break;
    case 'comment.resolve': {
      const x = need(
        world.comments.find((x) => x.id === command.id),
        'Comentario inexistente',
      );
      x.resolved = !x.resolved;
      break;
    }
    case 'comment.reply':
      if (command.text.trim())
        need(
          world.comments.find((x) => x.id === command.id),
          'Comentario inexistente',
        ).replies.push(command.text);
      break;
  }
}
