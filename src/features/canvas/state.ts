import type { Anchor } from '../../domain/model';
export type Tool =
  | 'select'
  | 'hand'
  | 'note'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'star'
  | 'connect'
  | 'zone'
  | 'drawing'
  | 'comment';
export interface CanvasUi {
  tool: Tool;
  selection: string | null;
  linkStart: { node: string; anchor: Anchor } | null;
  zoneSelection: string | null;
  linkSelection: string | null;
  selections: string[];
  commentTarget: string | null;
  color: string;
  stroke: string;
  thickness: number;
  fill: boolean;
  sampleImageIndex?: number;
  componentEditing?: { group: string; element: string; selected: string };
}

export function createCanvasUi(): CanvasUi {
  return {
    tool: 'select',
    selection: null,
    linkStart: null,
    zoneSelection: null,
    linkSelection: null,
    selections: [],
    commentTarget: null,
    color: '#766ae5',
    stroke: '#44435c',
    thickness: 2,
    fill: true,
  };
}
