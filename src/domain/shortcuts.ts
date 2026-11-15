export const canvasDefaults: Record<string, string> = {
  select: 'V',
  hand: 'H',
  note: 'N',
  text: 'T',
  illustrations: 'I',
  comment: 'C',
  connect: 'L',
  rename: '',
  duplicate: 'Ctrl+D',
  frame: 'Ctrl+Alt+G',
  layoutGuides: 'Shift+G',
};
export const shortcutNames: Record<string, string> = {
  select: 'Seleccionar',
  hand: 'Panear',
  note: 'Crear nota',
  text: 'Escribir texto',
  illustrations: 'Abrir ilustraciones',
  comment: 'Comentar',
  connect: 'Conectar',
  rename: 'Renombrar',
  duplicate: 'Duplicar selección',
  frame: 'Usar como marco',
  layoutGuides: 'Mostrar u ocultar retículas',
};
export const reservedShortcuts = new Set([
  'Ctrl+K',
  'Ctrl+Shift+D',
  'Ctrl+Z',
  'Ctrl+Shift+Z',
  'Ctrl+Y',
  'Ctrl+C',
  'Ctrl+V',
  'Escape',
  'Enter',
  'Delete',
  'Backspace',
]);
export function shortcutCombination(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'> & {
    code?: string;
  },
): string {
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) return '';
  // Con Option, macOS puede entregar «©» como key de la combinación ⌘⌥G.
  const key =
    event.metaKey &&
    event.altKey &&
    !/^[a-z]$/i.test(event.key) &&
    /^Key[A-Z]$/.test(event.code ?? '')
      ? event.code!.slice(3)
      : event.key;
  return [
    event.ctrlKey || event.metaKey ? 'Ctrl' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    key.length === 1 ? key.toUpperCase() : key,
  ]
    .filter(Boolean)
    .join('+');
}
export function shortcutConflict(
  shortcuts: Record<string, string>,
  action: string,
  combination: string,
): string | null {
  if (!combination) return null;
  if (reservedShortcuts.has(combination)) return 'global';
  return (
    Object.keys(shortcuts).find((key) => key !== action && shortcuts[key] === combination) ?? null
  );
}
