export type Slot = 'preview' | 'files' | 'images' | 'browser' | 'terminal';
export interface AuxiliaryUi {
  slot: Slot | null;
  lastSlot: Slot;
  tools: boolean;
}

export function createAuxiliaryUi(): AuxiliaryUi {
  return {
    slot: null,
    lastSlot: 'files',
    tools: false,
  };
}
