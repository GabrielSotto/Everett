import { sketchSymbols } from './sketch-symbols';
/** Apariencia resuelta de una pieza de la biblioteca. Sin HTML ni CSS ejecutable persistido. */
export const pieceStyleKeys = [
  'backgroundColor',
  'backgroundImage',
  'color',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'borderRadius',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textDecorationLine',
  'textTransform',
  'textShadow',
  'opacity',
  'boxShadow',
  'outline',
  'outlineOffset',
] as const;
export type PieceStyleKey = (typeof pieceStyleKeys)[number];
export interface SketchPiece {
  style: Partial<Record<PieceStyleKey, string>>;
  symbol?: string;
  paths?: readonly { d: string; fill: string; stroke: string; width: number }[];
  viewBox?: string;
  rotation?: number;
  label?: boolean;
  autoInk?: boolean;
  placeholderColor?: string;
  ink?: { width: number; height: number };
  clip?: readonly [number, number, number, number];
}
const color = /^(?:transparent|currentcolor|none|#[\da-f]{3,8}|rgba?\([\d.,% /]+\))$/i;
export function validSketchPiece(value: unknown): value is SketchPiece {
  if (!value || typeof value !== 'object') return false;
  const piece = value as SketchPiece;
  if (!piece.style || typeof piece.style !== 'object' || Array.isArray(piece.style)) return false;
  if (
    !Object.entries(piece.style).every(([key, v]) => {
      if (
        !(pieceStyleKeys as readonly string[]).includes(key) ||
        typeof v !== 'string' ||
        v.length > 300
      )
        return false;
      if (key.endsWith('Color') || key === 'color') return color.test(v);
      // Valores calculados, nunca selectores, URLs ni declaraciones concatenadas.
      return /^[\w\s.,%()#/-]+$/.test(v) && !/url|expression|var\(/i.test(v);
    })
  )
    return false;
  if (
    piece.symbol !== undefined &&
    (typeof piece.symbol !== 'string' || !Object.hasOwn(sketchSymbols, piece.symbol))
  )
    return false;
  if (
    piece.rotation !== undefined &&
    (!Number.isFinite(piece.rotation) || Math.abs(piece.rotation) > 360)
  )
    return false;
  if (piece.label !== undefined && typeof piece.label !== 'boolean') return false;
  if (piece.autoInk !== undefined && typeof piece.autoInk !== 'boolean') return false;
  if (
    piece.placeholderColor !== undefined &&
    (typeof piece.placeholderColor !== 'string' || !color.test(piece.placeholderColor))
  )
    return false;
  if (
    piece.ink &&
    ![piece.ink.width, piece.ink.height].every((n) => Number.isFinite(n) && n > 0 && n <= 1)
  )
    return false;
  if (
    piece.clip &&
    (!Array.isArray(piece.clip) ||
      piece.clip.length !== 4 ||
      !piece.clip.every((n) => Number.isFinite(n) && n >= 0 && n <= 100))
  )
    return false;
  if (
    piece.viewBox !== undefined &&
    (typeof piece.viewBox !== 'string' || !/^[-\d. ]{1,100}$/.test(piece.viewBox))
  )
    return false;
  if (
    piece.paths !== undefined &&
    (!Array.isArray(piece.paths) ||
      piece.paths.length > 32 ||
      !piece.paths.every(
        (p) =>
          p &&
          typeof p.d === 'string' &&
          p.d.length <= 20000 &&
          /^[MmZzLlHhVvCcSsQqTtAaEe\d., +\-]+$/.test(p.d) &&
          color.test(p.fill) &&
          color.test(p.stroke) &&
          Number.isFinite(p.width) &&
          p.width >= 0 &&
          p.width <= 100,
      ))
  )
    return false;
  return true;
}
