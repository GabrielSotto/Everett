import type { Anchor } from '../../domain/model';
export type Tool =
  'select' | 'hand' | 'note' | 'rectangle' | 'ellipse' | 'triangle' | 'star' | 'connect' | 'zone';
export interface CanvasUi {
  tool: Tool;
  selection: string | null;
  linkStart: { node: string; anchor: Anchor } | null;
  zoneSelection: string | null;
  linkSelection: string | null;
}

export function createCanvasUi(): CanvasUi {
  return {
    tool: 'select',
    selection: null,
    linkStart: null,
    zoneSelection: null,
    linkSelection: null,
  };
}
