import { symbolVariants, type SymbolVariant } from '../domain/sketch-symbols';

export function symbolVariantControl(
  scope: 'picker' | 'editor',
  current: SymbolVariant = 'regular',
): string {
  return `<div class="symbol-variant-control" role="radiogroup" aria-label="Variante del símbolo">${Object.entries(
    symbolVariants,
  )
    .map(
      ([id, label]) =>
        `<label><input type="radio" name="${scope}-symbol-variant" data-symbol-variant value="${id}" ${id === current ? 'checked' : ''}><span>${label}</span></label>`,
    )
    .join('')}</div>`;
}
