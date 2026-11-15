import { validCanvasText } from './canvas-text';
import { linkUrl } from './link-previews';
import type { NodeData, WorldSnapshot, CanvasGroup } from './model';
import type { DeepReadonly } from './readonly';
import { validWireframe } from './wireframes';

export type ImageData = Extract<NodeData, { asset: string }> & { kind: 'image' };
export type NativePartData = ImageData | Extract<NodeData, { kind: 'text' | 'shape' }>;
export type PartData = NativePartData | Extract<NodeData, { kind: 'wireframe' }>;

export function supportsComposition(data: DeepReadonly<NodeData>): boolean {
  return ['image', 'text', 'shape', 'wireframe'].includes(data.kind);
}
export function incompatibleMaterial(
  world: WorldSnapshot,
  group: DeepReadonly<CanvasGroup>,
  index?: ReadonlyMap<string, WorldSnapshot['nodes'][number]>,
) {
  const nodes = index ?? new Map(world.nodes.map((n) => [n.id, n]));
  for (const id of group.nodes) {
    const material = nodes.get(id);
    if (material && !supportsComposition(material.data)) return material;
  }
}
export function validNativePart(data: PartData): boolean {
  if (!data || typeof data !== 'object') return false;
  switch (data.kind) {
    case 'text':
      return validCanvasText(data);
    case 'image':
      return (
        typeof data.asset === 'string' &&
        !!data.asset &&
        typeof data.mime === 'string' &&
        data.mime.startsWith('image/') &&
        typeof data.title === 'string' &&
        Number.isFinite(data.ratio) &&
        data.ratio > 0 &&
        (data.source === undefined || linkUrl(data.source) !== null)
      );
    case 'shape':
      return (
        ['rectangle', 'ellipse', 'triangle', 'star'].includes(data.shape) &&
        typeof data.color === 'string' &&
        (data.title === undefined || typeof data.title === 'string') &&
        (data.thickness === undefined || (Number.isFinite(data.thickness) && data.thickness > 0)) &&
        (data.fill === undefined || typeof data.fill === 'boolean') &&
        (data.stroke === undefined || typeof data.stroke === 'string')
      );
    case 'wireframe':
      return typeof data.title === 'string' && validWireframe(data.content);
    default:
      return false;
  }
}
