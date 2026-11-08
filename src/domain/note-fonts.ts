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

export function googleFontUrl(family: string): string {
  if (!validGoogleFamily(family)) throw new Error('Nombre de fuente inválido');
  return 'https://fonts.googleapis.com/css2?' + new URLSearchParams({ family, display: 'swap' });
}
