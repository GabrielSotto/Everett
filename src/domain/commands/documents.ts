import { type State, getWorld, need } from '../model';
import type { Command } from '../command-types';
import { ensure } from '../invariants';

type DocumentsCommand = Extract<
  Command,
  { type: 'document.create' | 'document.edit' | 'sheet.edit' }
>;

export function applyDocumentsCommand(state: State, command: DocumentsCommand): void {
  const world = getWorld(state, command.world);
  const uid = (): string => `e-${++state.seq}`;
  switch (command.type) {
    case 'document.create':
      world.docs.push({
        id: uid(),
        title: 'Sin título',
        body: '',
        sheet: command.sheet ? Array.from({ length: 10 }, () => ['', '', '', '']) : null,
      });
      break;
    case 'document.edit': {
      const d = need(
        world.docs.find((d) => d.id === command.id),
        'Documento inexistente',
      );
      d.title = command.title;
      d.body = command.body;
      break;
    }
    case 'sheet.edit': {
      const d = need(
        world.docs.find((d) => d.id === command.id),
        'Hoja inexistente',
      );
      ensure(Number.isInteger(command.row) && command.row >= 0, 'ROW', 'Fila inválida');
      const row = need(d.sheet?.[command.row], 'Fila inválida');
      ensure(
        Number.isInteger(command.col) && command.col >= 0 && command.col < row.length,
        'CELL',
        'Celda inválida',
      );
      row[command.col] = command.value;
      break;
    }
  }
}
