import type { Context } from '../app/context';
import {
  arrangementMoves,
  arrangementUnits,
  arrangements,
  type Arrangement,
} from '../domain/arrangement';
import { icon } from './icons';

export const arrangementNames: Record<Arrangement, string> = {
  left: 'Alinear a la izquierda',
  'center-x': 'Centrar horizontalmente',
  right: 'Alinear a la derecha',
  top: 'Alinear arriba',
  'center-y': 'Centrar verticalmente',
  bottom: 'Alinear abajo',
  'space-x': 'Espaciar horizontalmente',
  'space-y': 'Espaciar verticalmente',
};

export function arrangeSelection(ctx: Context, action: string | undefined): boolean {
  if (!arrangements.includes(action as Arrangement)) return false;
  const route = ctx.store.get().route;
  if (route.kind !== 'surface' || route.surface !== 'canvas') return false;
  const nodes = arrangementMoves(
    arrangementUnits(ctx.world(), ctx.ui.canvas.selections),
    action as Arrangement,
  );
  return (
    nodes.length > 0 &&
    ctx.act(
      { type: 'nodes.move', world: ctx.world().id, nodes },
      arrangementNames[action as Arrangement],
      'C08-ARRANGE-01',
    )
  );
}

export function arrangementMarkup(ctx: Context): string {
  const units = arrangementUnits(ctx.world(), ctx.ui.canvas.selections);
  return `<div role="group" aria-label="Alineación de la selección">${arrangements.map((action) => `<button type="button" role="menuitem" data-action="selection-arrange" data-arrangement="${action}" ${arrangementMoves(units, action).length ? '' : 'disabled'}>${icon('arrange-' + action, 16)}${arrangementNames[action]}</button>`).join('')}</div><small class="arrangement-help">Los conjuntos completos se mueven como una pieza. Espaciar mantiene los extremos y requiere tres piezas con espacio entre ellas.</small>`;
}
