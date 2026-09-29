import { type State, getWorld, need, statuses, type Status } from '../model';
import type { Command } from '../command-types';
import { ensure } from '../invariants';

type BoardCommand = Extract<
  Command,
  {
    type:
      | 'task.shipping'
      | 'task.create'
      | 'task.edit'
      | 'board.view'
      | 'property.add'
      | 'property.remove'
      | 'property.toggle';
  }
>;

export function applyBoardCommand(state: State, command: BoardCommand): void {
  const world = getWorld(state, command.world);
  const uid = (): string => `e-${++state.seq}`;
  switch (command.type) {
    case 'task.shipping':
      need(
        world.tasks.find((t) => t.id === command.id),
        'Tarea inexistente',
      ).shipping = command.role;
      break;
    case 'task.create':
      if (command.title.trim())
        world.tasks.push({
          shipping: world.shipping.active ? 'required' : 'later',
          id: uid(),
          title: command.title.trim(),
          description: '',
          status: 'pending',
          priority: 'Media',
          assignee: '',
          creator: state.profile.name,
          start: '',
          due: '',
          origin: command.origin,
          custom: {},
        });
      break;
    case 'task.edit': {
      const t = need(
        world.tasks.find((t) => t.id === command.id),
        'Tarea inexistente',
      );
      const f = command.field;
      if (
        f === 'title' ||
        f === 'description' ||
        f === 'priority' ||
        f === 'assignee' ||
        f === 'creator' ||
        f === 'start' ||
        f === 'due'
      )
        t[f] = command.value;
      else if (f === 'status') {
        ensure(
          (statuses as readonly string[]).includes(command.value),
          'STATUS',
          'Estado inválido',
        );
        t.status = command.value as Status;
      } else {
        ensure(
          world.properties.some((p) => p.id === f && p.custom),
          'PROPERTY',
          'Propiedad inexistente',
        );
        t.custom[f] = command.value;
      }
      break;
    }
    case 'board.view':
      world.boardView = command.view;
      break;
    case 'property.add':
      ensure(
        !world.properties.some((p) => p.id === command.property.id),
        'PROPERTY',
        'Propiedad duplicada',
      );
      world.properties.push(command.property);
      world.visibleProperties.push(command.property.id);
      break;
    case 'property.remove':
      world.properties = world.properties.filter((p) => p.id !== command.id);
      world.visibleProperties = world.visibleProperties.filter((id) => id !== command.id);
      world.tasks.forEach((t) => delete t.custom[command.id]);
      break;
    case 'property.toggle':
      world.visibleProperties = world.visibleProperties.includes(command.id)
        ? world.visibleProperties.filter((id) => id !== command.id)
        : [...world.visibleProperties, command.id];
      break;
  }
}
