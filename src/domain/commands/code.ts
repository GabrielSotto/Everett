import { type State, getWorld, need } from '../model';
import type { Command } from '../command-types';
import { ensure } from '../invariants';

type CodeCommand = Extract<
  Command,
  { type: 'file.create' | 'file.edit' | 'file.save' | 'branch' | 'code.propose' | 'code.accept' }
>;

export function applyCodeCommand(state: State, command: CodeCommand): void {
  const world = getWorld(state, command.world);
  const uid = (): string => `e-${++state.seq}`;
  switch (command.type) {
    case 'file.create': {
      const name = command.name.trim();
      ensure(
        !!name &&
          !name.includes('..') &&
          !name.startsWith('/') &&
          !/[<>:"|?*\\]/.test(name) &&
          !world.files.some((f) => f.name === name),
        'FILE_NAME',
        'Usar una ruta relativa única',
      );
      world.files.push({ id: uid(), name, text: '', saved: '', revision: 0 });
      break;
    }
    case 'file.edit': {
      const f = need(
        world.files.find((f) => f.id === command.id),
        'Archivo inexistente',
      );
      f.text = command.text;
      f.revision++;
      break;
    }
    case 'file.save': {
      const f = need(
        world.files.find((f) => f.id === command.id),
        'Archivo inexistente',
      );
      f.saved = f.text;
      break;
    }
    case 'branch':
      world.branch = command.name.trim() || 'main';
      break;
    case 'code.propose':
      ensure(!world.proposal, 'PENDING', 'Revisar la propuesta pendiente');
      world.proposal = command.proposal;
      break;
    case 'code.accept': {
      const p = need(world.proposal, 'Propuesta inexistente'),
        f = need(
          world.files.find((f) => f.id === p.file),
          'Archivo inexistente',
        );
      if (command.accept) {
        ensure(
          f.revision === p.revision && f.text === p.before,
          'STALE',
          'El archivo cambió después de la propuesta',
        );
        f.text = p.after;
        f.revision++;
      }
      world.proposal = null;
      break;
    }
  }
}
