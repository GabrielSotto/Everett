import type { Material } from './model';
export type Density = 'previews' | 'types' | 'summary';
export interface MaterialGroup {
  kind: string;
  ids: string[];
}
/** Los umbrales reorganizan la presentación conservando identidad y responsable. */
export function materialDensity(count: number): Density {
  return count <= 6 ? 'previews' : count <= 15 ? 'types' : 'summary';
}
export function materialGroups(materials: readonly Material[]): MaterialGroup[] {
  const groups = new Map<string, string[]>();
  for (const material of materials) {
    const kind = material.data.kind === 'reference' ? material.data.ref.kind : material.data.kind;
    const ids = groups.get(kind) ?? [];
    ids.push(material.id);
    groups.set(kind, ids);
  }
  return [...groups].map(([kind, ids]) => ({ kind, ids }));
}
