import { linkDirections, type LinkDirection } from '../../domain/link-stroke';

import type { LabelPlacement } from '../../domain/cable-labels';

export function labelPlacementPicker(current: LabelPlacement = 'center') {
  const names = { start: 'Inicio', center: 'Centro', end: 'Final' } satisfies Record<
    LabelPlacement,
    string
  >;
  return `<label>Etiqueta<select data-label-placement aria-label="Ubicación de la etiqueta">${Object.entries(
    names,
  )
    .map(
      ([value, name]) =>
        `<option value="${value}" ${value === current ? 'selected' : ''}>${name}</option>`,
    )
    .join('')}</select></label>`;
}

const directionLabels = {
  none: 'Sin flechas',
  forward: 'Flecha al destino',
  backward: 'Flecha al origen',
  both: 'Flechas en ambos extremos',
};
export function directionPicker(current: LinkDirection = 'none') {
  return `<div class="stroke-picker cable-directions" role="group" aria-label="Sentido de la conexión">${linkDirections
    .map((value) => {
      const from = value === 'backward' || value === 'both',
        to = value === 'forward' || value === 'both';
      return `<button type="button" data-action="link-direction" data-value="${value}" aria-pressed="${value === current}" aria-label="${directionLabels[value]}" title="${directionLabels[value]}"><svg width="20" height="18" viewBox="0 0 22 18" aria-hidden="true"><path d="M3 9h16${from ? 'M7 5 3 9l4 4' : ''}${to ? 'M15 5l4 4-4 4' : ''}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    })
    .join('')}</div>`;
}
/** Muestras visuales; los valores en píxeles quedan disponibles para teclado y lectores. */
export function strokePicker(
  thickness: number,
  action: 'draw-thickness' | 'link-thickness' = 'draw-thickness',
  values: readonly number[] = [1, 2, 4, 8],
): string {
  return `<div class="stroke-picker" role="group" aria-label="Grosor del trazo">${values.map((value) => `<button type="button" data-action="${action}" data-value="${value}" aria-label="Grosor ${value} px" aria-pressed="${value === thickness}" title="Grosor ${value} px"><svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M4 9h18" stroke="currentColor" stroke-width="${value}" stroke-linecap="round"/></svg></button>`).join('')}</div>`;
}
