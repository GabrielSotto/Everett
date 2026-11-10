import { nodeTitle, type Material, type WorldSnapshot } from './model';
import { referenceExcerpt } from './reference-anchors';
import { localText } from './local-content';
import { wireframeText } from './wireframes';
export function materialText(world: WorldSnapshot, material: Material): string {
  const data = material.data;
  if (data.kind === 'wireframe') return wireframeText(data.content);
  if (data.kind === 'local') return localText(data.content);
  if (data.kind === 'note' || data.kind === 'text') return data.text;
  if (data.kind === 'reference') {
    const ref = data.ref;
    if (ref.fragment)
      return (
        referenceExcerpt(world, ref) ??
        'Fragmento no disponible. Revisá la referencia en su origen.'
      );
    return ref.kind === 'document'
      ? (world.docs.find((d) => d.id === ref.id)?.body ?? '')
      : ref.kind === 'task'
        ? [
            world.tasks.find((t) => t.id === ref.id)?.title,
            world.tasks.find((t) => t.id === ref.id)?.description,
          ]
            .filter(Boolean)
            .join('\n')
        : ref.kind === 'file'
          ? (world.files.find((f) => f.id === ref.id)?.text ?? '')
          : (world.agents.find((a) => a.id === ref.id)?.role ?? '');
  }
  if (data.kind === 'link')
    return [data.url, data.metadata?.title, data.metadata?.description ?? data.description]
      .filter(Boolean)
      .join('\n');
  return nodeTitle(world, material);
}
