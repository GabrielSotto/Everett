/** Muestras visuales; los valores en píxeles quedan disponibles para teclado y lectores. */
export function strokePicker(thickness: number): string {
  return `<div class="stroke-picker" role="group" aria-label="Grosor del trazo">${[1, 2, 4, 8].map((value) => `<button type="button" data-action="draw-thickness" data-value="${value}" aria-label="Grosor ${value} px" aria-pressed="${value === thickness}" title="Grosor ${value} px"><svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M4 9h18" stroke="currentColor" stroke-width="${value}" stroke-linecap="round"/></svg></button>`).join('')}</div>`;
}
