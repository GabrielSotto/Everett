import { newCanvasText } from '../../src/domain/canvas-text';
import type { Material } from '../../src/domain/model';

export function label(
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  color: string,
  weight = 400,
  serif = false,
): Material {
  return {
    id,
    x,
    y,
    width,
    height: Math.ceil(size * 1.4),
    owner: null,
    data: { ...newCanvasText('wrap'), text, size, color, weight, font: serif ? 'serif' : 'sans' },
  };
}
export function note(
  id: string,
  title: string,
  text: string,
  x: number,
  y: number,
  color: string,
): Material {
  return {
    id,
    x,
    y,
    width: 250,
    height: 105,
    owner: null,
    data: { kind: 'note', title, text, color, fontSize: 17 },
  };
}
export function image(
  id: string,
  title: string,
  x: number,
  y: number,
  size: number,
  asset = id,
): Material {
  return {
    id,
    x,
    y,
    width: size,
    height: size,
    owner: null,
    data: { kind: 'image', asset, title, mime: 'image/png', ratio: 1 },
  };
}
