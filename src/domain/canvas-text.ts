import { validNoteTextStyle, type NoteTextStyle } from './note-fonts';

export interface CanvasText extends NoteTextStyle {
  kind: 'text';
  title: string;
  text: string;
  sizing: 'auto' | 'wrap';
  size: number;
  align: 'left' | 'center' | 'right';
  color: string | null;
}
export const textLimit = 100_000;
export function newCanvasText(sizing: CanvasText['sizing']): CanvasText {
  return {
    kind: 'text',
    title: '',
    text: '',
    sizing,
    font: 'sans',
    weight: 400,
    italic: false,
    size: 24,
    align: 'left',
    color: null,
  };
}
export function validCanvasText(value: unknown): value is CanvasText {
  if (!validNoteTextStyle(value)) return false;
  const v = value as CanvasText;
  return (
    v.kind === 'text' &&
    typeof v.title === 'string' &&
    typeof v.text === 'string' &&
    v.text.length <= textLimit &&
    ['auto', 'wrap'].includes(v.sizing) &&
    Number.isFinite(v.size) &&
    v.size >= 8 &&
    v.size <= 200 &&
    ['left', 'center', 'right'].includes(v.align) &&
    (v.color === null || (typeof v.color === 'string' && /^#[\da-f]{6}$/i.test(v.color)))
  );
}
