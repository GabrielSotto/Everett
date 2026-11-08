export type NoteFont = 'sans' | 'serif' | 'mono' | `google:${string}`;

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
