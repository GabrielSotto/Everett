export type NoteFont = 'sans' | 'serif' | 'mono' | `google:${string}`;
export type NotePart = 'title' | 'body';
export interface NoteTextStyle {
  font: NoteFont;
  weight: number;
  italic: boolean;
}
export type NoteTypography = Record<NotePart, NoteTextStyle>;
export interface NoteTypographyEdit {
  part: NotePart;
  style: NoteTextStyle;
}

export function noteTypography(data: {
  font?: NoteFont;
  fontWeight?: number;
  fontItalic?: boolean;
  typography?: NoteTypography;
}): NoteTypography {
  if (data.typography) return data.typography;
  const shared = { font: data.font ?? 'sans', italic: !!data.fontItalic };
  // Conserva la jerarquía de las notas anteriores, incluidas las fuentes remotas.
  return {
    title: { ...shared, weight: data.fontWeight ?? (googleFamily(data.font) ? 400 : 600) },
    body: { ...shared, weight: data.fontWeight ?? 400 },
  };
}

export function validNoteTextStyle(value: unknown): value is NoteTextStyle {
  if (!value || typeof value !== 'object') return false;
  const style = value as NoteTextStyle;
  return (
    validNoteFont(style.font) && validFontWeight(style.weight) && typeof style.italic === 'boolean'
  );
}

export function validNoteTypography(value: unknown): value is NoteTypography {
  if (!value || typeof value !== 'object') return false;
  const typography = value as NoteTypography;
  return validNoteTextStyle(typography.title) && validNoteTextStyle(typography.body);
}

export function validGoogleFamily(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9 -]{0,99}$/.test(value) &&
    value === value.trim() &&
    !value.includes('  ')
  );
}

export function validNoteFont(value: unknown): value is NoteFont {
  return (
    value === 'sans' ||
    value === 'serif' ||
    value === 'mono' ||
    (typeof value === 'string' && value.startsWith('google:') && validGoogleFamily(value.slice(7)))
  );
}

export function googleFamily(font: NoteFont | undefined): string | null {
  return font?.startsWith('google:') && validNoteFont(font) ? font.slice(7) : null;
}

export function validFontWeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1000;
}

export function googleFontUrl(family: string, weight = 400, italic = false): string {
  if (!validGoogleFamily(family)) throw new Error('Nombre de fuente inválido');
  if (!validFontWeight(weight)) throw new Error('Peso de fuente inválido');
  return (
    'https://fonts.googleapis.com/css2?' +
    new URLSearchParams({
      family: italic ? `${family}:ital,wght@1,${weight}` : `${family}:wght@${weight}`,
      display: 'swap',
    })
  );
}
