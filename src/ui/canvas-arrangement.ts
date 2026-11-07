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
  if (units.length < 2)
    return '<p class="arrangement-help">Seleccioná dos o más elementos para alinearlos y ajustar su espaciado.</p>';
  const control = (action: Arrangement) =>
    `<button type="button" role="menuitem" data-action="selection-arrange" data-arrangement="${action}" aria-label="${arrangementNames[action]}" title="${arrangementNames[action]}" ${action.startsWith('space') && units.length < 3 ? 'disabled' : ''}>${icon('arrange-' + action, 18)}</button>`;
  const gap = (axis: 'x' | 'y') => {
    const size = axis === 'x' ? 'width' : 'height';
    const sorted = [...units].sort((a, b) => a[axis] - b[axis]);
    const gaps = sorted.slice(1).map((n, i) => n[axis] - sorted[i]![axis] - sorted[i]![size]);
    return gaps[0]! >= 0 && gaps.every((n) => Math.abs(n - gaps[0]!) < 0.01)
      ? Math.round(gaps[0]! * 100) / 100
      : '';
  };
  return `<div class="arrangement-controls" role="group" aria-label="Alineación de la selección"><span class="arrangement-label">Alineación</span><div class="arrangement-icons">${arrangements
    .filter((a) => !a.startsWith('space'))
    .map(control)
    .join(
      '',
    )}</div><div class="arrangement-distribution"><span>Distribuir</span>${control('space-x')}${control('space-y')}</div><div class="arrangement-spacing" role="group" aria-label="Espaciado de la selección">${(['x', 'y'] as const).map((axis) => `<label title="Espaciado ${axis === 'x' ? 'horizontal' : 'vertical'}">${icon('arrange-space-' + axis, 16)}<input type="number" data-spacing="space-${axis}" min="0" max="10000" step="any" value="${gap(axis)}" placeholder="Mixto" aria-label="Separación ${axis === 'x' ? 'horizontal' : 'vertical'}"><span aria-hidden="true">px</span></label>`).join('')}</div></div>`;
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
