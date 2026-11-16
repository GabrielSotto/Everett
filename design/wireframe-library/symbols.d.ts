export const symbolNames: Record<string, string>;
export const symbolVariants: { readonly regular: string; readonly fill: string };
export type SymbolVariant = keyof typeof symbolVariants;
export function symbolAsset(id: string, variant?: SymbolVariant): string;
