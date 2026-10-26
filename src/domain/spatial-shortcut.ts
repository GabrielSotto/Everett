export const spatialModifiers = ['Alt', 'Control', 'Shift', 'Meta'] as const;
export type SpatialModifier = (typeof spatialModifiers)[number];

export function spatialModifier(value: unknown): SpatialModifier {
  return spatialModifiers.includes(value as SpatialModifier) ? (value as SpatialModifier) : 'Alt';
}

/** La rueda local solo se desacopla mientras está pulsado el modificador elegido. */
export function spatialWheel(
  event: Pick<MouseEvent, 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey'>,
  value: unknown,
): boolean {
  const keys = { Alt: 'altKey', Control: 'ctrlKey', Shift: 'shiftKey', Meta: 'metaKey' } as const;
  return event[keys[spatialModifier(value)]];
}

export function spatialHint(value: unknown): string {
  return (
    { Alt: 'Alt', Control: 'Ctrl', Shift: 'Mayús', Meta: 'Meta' }[spatialModifier(value)] +
    ' + rueda'
  );
}
