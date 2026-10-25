import type { Material, NodeData } from './model';
/** Actualización derivada que respeta nombre manual, posición, identidad y propietario. */
export function resolveMedia(
  material: Material,
  url: string,
  data: Extract<NodeData, { kind: 'image' | 'video' | 'pdf' }>,
): void {
  if (material.data.kind !== 'link' || material.data.url !== url) return;
  const address = new URL(url);
  const title =
    material.data.title === address.hostname + address.pathname ? data.title : material.data.title;
  material.data = { ...structuredClone(data), title, source: url };
  material.height = material.width / data.ratio;
}
