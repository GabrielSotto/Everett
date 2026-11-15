import type { Rect } from './model';

/** La foto conserva su proporción y queda centrada en el espacio reservado por el diseño. */
export function fittedImage(box: Rect, ratio: number): Rect {
  const width = Math.min(box.width, box.height * ratio),
    height = width / ratio;
  const scale = Math.max(1, 4 / width, 4 / height);
  return {
    x: box.x + (box.width - width * scale) / 2,
    y: box.y + (box.height - height * scale) / 2,
    width: width * scale,
    height: height * scale,
  };
}
