import { type State, getWorld, type World, need } from '../model';
import type { Command } from '../command-types';
import { ensure } from '../invariants';
import { profileLimits } from '../profile';
import { nextWorldPosition } from '../world-layout';
import { emptyWorld } from '../seed';
import { enterRoute, leaveRoute } from '../navigation';

type WorkspaceCommand = Extract<
  Command,
  {
    type:
      | 'world.shipping'
      | 'profile.edit'
      | 'navigate'
      | 'back'
      | 'universe'
      | 'camera'
      | 'world.create'
      | 'world.rename'
      | 'world.archive';
  }
>;

export function applyWorkspaceCommand(state: State, command: WorkspaceCommand): void {
  const world = (): World =>
    'world' in command ? getWorld(state, command.world) : need<World>(undefined, 'Mundo requerido');
  const uid = (): string => `e-${++state.seq}`;
  switch (command.type) {
    case 'world.shipping':
      world().shipping = { active: command.active, changedAt: command.at, source: command.source };
      break;
    case 'profile.edit':
      ensure(
        command.profile.name.length <= profileLimits.name,
        'PROFILE_NAME',
        `El nombre admite hasta ${profileLimits.name} caracteres.`,
      );
      ensure(
        command.profile.bio.length <= profileLimits.bio,
        'PROFILE_BIO',
        `La biografía admite hasta ${profileLimits.bio} caracteres.`,
      );
      state.profile = { ...command.profile, name: command.profile.name.trim() || 'Gabi' };
      break;
    case 'navigate':
      Object.assign(state, enterRoute(state, command.route, command.camera));
      break;
    case 'back':
      Object.assign(state, leaveRoute(state));
      break;
    case 'universe':
      Object.assign(state, enterRoute(state, { kind: 'universe' }, state.camera));
      break;
    case 'camera':
      state.camera = command.camera;
      break;
    case 'world.create': {
      const id = uid(),
        position = nextWorldPosition(id, state.worlds);
      const w = emptyWorld(id, command.name, state.seq, position.x, position.y);
      state.worlds.push(w);
      Object.assign(state, enterRoute(state, { kind: 'world', world: w.id }, state.camera));
      break;
    }
    case 'world.rename':
      world().name = command.name.trim() || 'Sin título';
      break;
    case 'world.archive':
      world().archived = !world().archived;
      break;
  }
}
