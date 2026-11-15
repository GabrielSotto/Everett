import type { Context } from '../app/context';
import {
  arrangementMoves,
  arrangementUnits,
  arrangements,
  type Arrangement,
} from '../domain/arrangement';
import { icon } from './icons';
import { alignmentScene } from '../domain/alignment-targets';
import { measureBounds, dimensionText } from '../domain/measurements';

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
  const { selections, componentEditing } = ctx.ui.canvas;
  const parts =
    selections.length >= 2
      ? alignmentScene(ctx.world(), new Set(selections), componentEditing).parts
      : [];
  const distance = parts.length === 2 ? measureBounds(parts[0]!, parts[1]!) : undefined;
  const reading = distance
    ? `<div class="distance-reading" role="group" aria-label="Distancia entre los dos elementos"><strong>${distance.kind}</strong>${distance.dimensions.length ? distance.dimensions.map((d) => `<span>${d.label} <b>${dimensionText(d)}</b></span>`).join('') : '<b>0 px</b>'}</div>`
    : '';
  const control = (action: Arrangement) =>
    `<button type="button" role="menuitem" data-action="selection-arrange" data-arrangement="${action}" aria-label="${arrangementNames[action]}" title="${arrangementNames[action]}" ${units.length < (action.startsWith('space') ? 3 : 2) ? 'disabled' : ''}>${icon('arrange-' + action, 18)}</button>`;
  const gap = (axis: 'x' | 'y') => {
    if (units.length < 2) return '';
    const size = axis === 'x' ? 'width' : 'height';
    const sorted = [...units].sort((a, b) => a[axis] - b[axis]);
    const gaps = sorted.slice(1).map((n, i) => n[axis] - sorted[i]![axis] - sorted[i]![size]);
    return gaps[0]! >= 0 && gaps.every((n) => Math.abs(n - gaps[0]!) < 0.01)
      ? Math.round(gaps[0]! * 100) / 100
      : '';
  };
  return `<div class="arrangement-controls" role="group" aria-label="Alineación de la selección"><div class="arrangement-caption"><span class="arrangement-label">Alineación</span><span>${units.length ? `${units.length} ${units.length === 1 ? 'elemento' : 'elementos'}` : 'Sin selección'}</span></div><div class="arrangement-icons">${arrangements
    .filter((a) => !a.startsWith('space'))
    .map(control)
    .join(
      '',
    )}</div>${reading}<span class="arrangement-label">Espaciado</span><div class="arrangement-spacing" role="group" aria-label="Espaciado de la selección">${(['x', 'y'] as const).map((axis) => `<div class="arrangement-axis"><span>${axis === 'x' ? 'Horizontal' : 'Vertical'}</span><div><label title="Espaciado ${axis === 'x' ? 'horizontal' : 'vertical'}"><input type="number" data-spacing="space-${axis}" min="0" max="10000" step="any" value="${gap(axis)}" placeholder="${units.length <= 2 ? '—' : 'Mixto'}" ${units.length < 2 ? 'disabled' : ''} aria-label="Separación ${axis === 'x' ? 'horizontal' : 'vertical'}"><span aria-hidden="true">px</span></label>${control(`space-${axis}`)}</div></div>`).join('')}</div><p class="arrangement-hint">${units.length === 1 ? 'Arrastrá para ver la distancia. Con la pieza quieta, mantené Alt u Opción y señalá otra.' : units.length === 0 ? 'Seleccioná al menos dos elementos para alinear.' : units.length < 3 ? 'Con tres o más podés distribuir el espacio por igual.' : 'Distribuir mantiene los extremos de la selección.'}</p></div>`;
}

export function bindArrangementSpacing(
  root: HTMLElement,
  ctx: Context,
  close: () => void,
  signal: AbortSignal,
): void {
  const cancelled = new WeakSet<HTMLInputElement>();
  const apply = (input: HTMLInputElement) => {
    if (
      cancelled.has(input) ||
      !input.isConnected ||
      !input.value.trim() ||
      !input.reportValidity()
    )
      return;
    const action = input.dataset.spacing;
    const spacing = input.valueAsNumber;
    close();
    arrangeSelection(ctx, action, spacing);
  };
  root.addEventListener(
    'change',
    (event) => {
      if (event.target instanceof HTMLInputElement && event.target.dataset.spacing)
        apply(event.target);
    },
    { signal },
  );
  root.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key === 'Enter' &&
        event.target instanceof HTMLInputElement &&
        event.target.dataset.spacing
      ) {
        event.preventDefault();
        event.stopPropagation();
        apply(event.target);
      }
    },
    { signal },
  );
  // Descartar antes de que el cierre general quite el foco y dispare change.
  window.addEventListener(
    'keydown',
    (event) => {
      const input = event.target;
      if (
        event.key !== 'Escape' ||
        !(input instanceof HTMLInputElement) ||
        !input.dataset.spacing ||
        !root.contains(input)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cancelled.add(input);
      close();
    },
    { signal, capture: true },
  );
}
