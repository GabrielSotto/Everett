import { type State, getWorld, need } from '../model';
import type { Command } from '../command-types';
import { ensure } from '../invariants';

type AgentsCommand = Extract<
  Command,
  {
    type: 'agent.run.start' | 'agent.run.finish' | 'agent.create' | 'agent.toggle' | 'agent.memory';
  }
>;

export function applyAgentsCommand(state: State, command: AgentsCommand): void {
  const world = getWorld(state, command.world);
  const uid = (): string => `e-${++state.seq}`;
  switch (command.type) {
    case 'agent.run.start':
      world.runs.push(command.run);
      break;
    case 'agent.run.finish': {
      const run = need(
        world.runs.find((r) => r.id === command.id),
        'Ejecución inexistente',
      );
      run.finishedAt = command.at;
      run.status = command.status;
      run.error = command.error;
      break;
    }
    case 'agent.create':
      world.agents.push({
        id: uid(),
        name: command.name.trim() || 'Agente',
        role: 'Trabajo del mundo',
        color: '#a596c5',
        active: true,
        capabilities: ['Organizar materiales', 'Preparar propuestas'],
        memory: [],
      });
      break;
    case 'agent.toggle': {
      ensure(
        !world.assignments.some((a) => a.agent === command.id) &&
          !world.runs.some((r) => r.agent === command.id && r.status === 'running'),
        'BUSY',
        'Cancelar su trabajo antes de pausarlo',
      );
      const a = need(
        world.agents.find((a) => a.id === command.id),
        'Agente inexistente',
      );
      a.active = !a.active;
      break;
    }
    case 'agent.memory': {
      const a = need(
        world.agents.find((a) => a.id === command.id),
        'Agente inexistente',
      );
      if (command.remove !== null) {
        ensure(
          Number.isInteger(command.remove) &&
            command.remove >= 0 &&
            command.remove < a.memory.length,
          'MEMORY_INDEX',
          'Memoria inexistente',
        );
        a.memory.splice(command.remove, 1);
      } else if (command.text.trim()) a.memory.push(command.text.trim());
      break;
    }
  }
}
