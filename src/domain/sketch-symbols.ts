/** Recursos Phosphor MIT locales compartidos por catálogo y dominio. */
import { symbolVariants, type SymbolVariant } from '../../design/wireframe-library/symbols.js';
export {
  symbolNames as sketchSymbols,
  symbolVariants,
  type SymbolVariant,
} from '../../design/wireframe-library/symbols.js';
export function isSymbolVariant(value: unknown): value is SymbolVariant {
  return typeof value === 'string' && Object.hasOwn(symbolVariants, value);
}
