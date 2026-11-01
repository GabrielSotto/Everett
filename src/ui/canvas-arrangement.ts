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

export function arrangeSelection(
  ctx: Context,
  action: string | undefined,
  spacing?: number,
): boolean {
  if (!arrangements.includes(action as Arrangement)) return false;
  const route = ctx.store.get().route;
  if (route.kind !== 'surface' || route.surface !== 'canvas') return false;
  const nodes = arrangementMoves(
    arrangementUnits(ctx.world(), ctx.ui.canvas.selections),
    action as Arrangement,
    spacing,
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
  return `<div role="group" aria-label="Alineación de la selección">${arrangements.map((action) => `<button type="button" role="menuitem" data-action="selection-arrange" data-arrangement="${action}" ${units.length >= (action.startsWith('space') ? 3 : 2) ? '' : 'disabled'}>${icon('arrange-' + action, 16)}${arrangementNames[action]}</button>`).join('')}</div><small class="arrangement-help">${units.length < 2 ? 'Seleccioná dos o más piezas para alinear; tres o más para distribuir automáticamente.' : units.length < 3 ? 'La distribución automática requiere tres piezas. Podés fijar una separación entre dos.' : 'La distribución automática conserva los extremos. La separación exacta conserva la primera pieza.'}</small><fieldset class="arrangement-spacing" ${units.length < 2 ? 'disabled' : ''}><legend>Separación exacta · px</legend>${(['x', 'y'] as const).map((axis) => `<label>${axis === 'x' ? 'Horizontal' : 'Vertical'}<input type="number" min="0" max="10000" step="any" value="16" aria-label="Separación ${axis === 'x' ? 'horizontal' : 'vertical'}"><button type="button" data-action="selection-spacing" data-arrangement="space-${axis}" aria-label="Aplicar separación ${axis === 'x' ? 'horizontal' : 'vertical'}">${icon('check', 14)}</button></label>`).join('')}</fieldset>`;
}

export function spacingValue(button: HTMLElement): number | undefined {
  const input = button.closest('label')?.querySelector('input');
  if (!input || !input.reportValidity() || !input.value.trim()) return undefined;
  return input.valueAsNumber;
}
