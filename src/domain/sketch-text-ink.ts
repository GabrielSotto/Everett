import type { Material, WorldSnapshot } from './model';
import { wireframeAppearance, type WireframeContent } from './wireframes';

function rgba(value: string): number[] | null {
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join('');
    if (hex.length !== 6 && hex.length !== 8) return null;
    return [0, 2, 4]
      .map((i) => parseInt(hex.slice(i, i + 2), 16))
      .concat(hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1);
  }
  const parts = value
    .match(/^rgba?\(([^)]+)\)$/)?.[1]
    ?.split(/[, /]+/)
    .map(Number);
  return parts && parts.length >= 3 ? [...parts.slice(0, 3), parts[3] ?? 1] : null;
}
const luminance = (rgb: readonly number[]) =>
  rgb.slice(0, 3).reduce((sum, c, i) => {
    const v = c / 255;
    return (
      sum + (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i]!
    );
  }, 0);

/** Texto básico sin placa: elegir tinta según los fondos planos detrás de él.
 * Un color elegido por el usuario siempre tiene prioridad. No altera el contenido guardado. */
export function sketchTextInk(material: Material, world: WorldSnapshot): WireframeContent {
  if (material.data.kind !== 'wireframe') throw new Error('Se esperaba un bosquejo.');
  const content = material.data.content;
  if (!content.piece?.autoInk || content.appearance) return content;
  const { color, textShadow } = canvasTextInk(material, world);
  return {
    ...content,
    piece: {
      ...content.piece,
      style: { ...content.piece.style, color, textShadow },
      placeholderColor: color,
    },
  };
}
export function canvasTextInk(material: Material, world: WorldSnapshot) {
  // Muestrear extremos y centro: el texto puede cruzar dos fondos distintos.
  const points = [
    [material.x + 1, material.y + 1],
    [material.x + material.width - 1, material.y + 1],
    [material.x + 1, material.y + material.height - 1],
    [material.x + material.width - 1, material.y + material.height - 1],
    [material.x + material.width / 2, material.y + material.height / 2],
  ];
  const backgrounds = points.map(([x, y]) => {
    let background = [37, 42, 48]; // Fondo del Canvas (#252a30).
    for (const node of world.nodes) {
      if (node.id === material.id) break;
      if (
        node.owner ||
        x! < node.x ||
        y! < node.y ||
        x! > node.x + node.width ||
        y! > node.y + node.height
      )
        continue;
      const data = node.data;
      const fill =
        data.kind === 'wireframe'
          ? wireframeAppearance(data.content).fill
          : data.kind === 'shape' && data.fill !== false
            ? data.color
            : data.kind === 'note'
              ? data.color
              : undefined;
      const color = fill && rgba(fill);
      if (!color) continue;
      const opacity =
        color[3]! *
        (data.kind === 'wireframe' ? Number(data.content.piece?.style.opacity ?? 1) : 1);
      background = background.map((c, i) => color[i]! * opacity + c * (1 - opacity));
    }
    return luminance(background);
  });
  const contrast = (color: string) => {
    const ink = luminance(rgba(color)!);
    return Math.min(
      ...backgrounds.map((light) => (Math.max(light, ink) + 0.05) / (Math.min(light, ink) + 0.05)),
    );
  };
  const dark = '#26323c',
    light = '#e0e7ed';
  const mixed = Math.max(contrast(dark), contrast(light)) < 4.5;
  const color = mixed || contrast(light) >= contrast(dark) ? light : dark;
  const textShadow = mixed ? '0 0 2px #26323c,0 0 2px #26323c,0 0 1px #26323c' : 'none';
  return { color, textShadow };
}
