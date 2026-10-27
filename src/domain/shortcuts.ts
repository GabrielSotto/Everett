export const canvasDefaults: Record<string, string> = {
  select: 'V',
  hand: 'H',
  note: 'N',
  comment: 'C',
  connect: 'L',
  rename: '',
  duplicate: 'Ctrl+D',
};
export const shortcutNames: Record<string, string> = {
  select: 'Seleccionar',
  hand: 'Panear',
  note: 'Crear nota',
  comment: 'Comentar',
  connect: 'Conectar',
  rename: 'Renombrar',
  duplicate: 'Duplicar selección',
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
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
): string {
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) return '';
  return [
    event.ctrlKey || event.metaKey ? 'Ctrl' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    event.key.length === 1 ? event.key.toUpperCase() : event.key,
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
