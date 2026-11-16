import type { CanvasGroup, CompositionLink, Material, World } from './model';
import { componentElements, type ComponentElement } from './component-tree';
import { componentPoses } from './component-geometry';
import { fittedImage } from './image-fit';
import { normalizedAngle } from './rotation';
import { copyProperty, localProperties, compatiblePartData } from './component-overrides';
import { supportsComposition, type PartData } from './composition-materials';
import {
  instantiateLibrary,
  libraryBounds,
  partData,
  type SavedRecipe,
  type SavedPart,
} from './sketch-library';
import type { SavedComposition } from './component-recipes';
import type { DeepReadonly } from './readonly';
import { ensure } from './invariants';

export function recipeRevision(saved: DeepReadonly<SavedComposition>, revision: number) {
  return saved.revision === revision
    ? saved.composition
    : saved.previous?.find((p) => p.revision === revision)?.composition;
}
function partsById(recipe: DeepReadonly<SavedRecipe>) {
  const parts = new Map<string, DeepReadonly<SavedPart>>();
  if (recipe.structure) {
    for (const e of componentElements(recipe.structure.root))
      if (e.material !== undefined) parts.set(e.id, recipe.parts[Number(e.material)]!);
  } else recipe.parts.forEach((part, i) => parts.set('part-' + i, part));
  return parts;
}
export function instanceProperties(
  saved: DeepReadonly<SavedComposition>,
  link: DeepReadonly<CompositionLink>,
  element: string,
  data: DeepReadonly<Material['data']>,
) {
  const base = partsById(recipeRevision(saved, link.revision) ?? saved.composition).get(element);
  const keys = link.overrides?.find((o) => o.part === element)?.keys;
  return base && supportsComposition(data)
    ? localProperties(partData(base), data as DeepReadonly<PartData>, keys)
    : [];
}

export function resetInstanceProperty(
  world: World,
  group: CanvasGroup,
  saved: SavedComposition,
  element: ComponentElement,
  key: string,
  link: CompositionLink,
  part: string,
) {
  const base = partsById(recipeRevision(saved, link.revision) ?? saved.composition).get(part);
  const node = world.nodes.find((n) => n.id === element.material);
  ensure(
    !!base && !!node && supportsComposition(node.data),
    'COMPONENT_OVERRIDE',
    'Esta propiedad ya no está disponible.',
  );
  const source = partData(base!),
    target = node!.data as PartData;
  const retained = link.overrides?.find((o) => o.part === part);
  const field = localProperties(source, target, retained?.keys).find((p) => p.key === key);
  ensure(!!field, 'COMPONENT_OVERRIDE', 'Esta propiedad ya usa el valor de la composición.');
  copyProperty(target, source, field!);
  if (retained) {
    retained.keys = retained.keys.filter((k) => k !== key);
    if (!retained.keys.length) link.overrides = link.overrides!.filter((o) => o !== retained);
    if (!link.overrides?.length) delete link.overrides;
  }
  if (key === 'title') element.name = source.title || base!.name;
  if (key === 'image' && target.kind === 'image') {
    const original = base!;
    const rect = fittedImage(
      {
        x: element.x + (element.width - original.width) / 2,
        y: element.y + (element.height - original.height) / 2,
        width: original.width,
        height: original.height,
      },
      target.ratio,
    );
    Object.assign(element, rect);
    const pose = componentPoses(group.structure!).get(element.id)!;
    Object.assign(node!, { x: pose.x, y: pose.y, width: rect.width, height: rect.height });
  }
}

export function refreshInstance(
  world: World,
  group: CanvasGroup,
  saved: SavedComposition,
  uid: () => string,
  linkedParts?: ReadonlySet<string | undefined>,
) {
  const tree = group.structure!;
  const bounds = libraryBounds(saved.composition);
  const result = instantiateLibrary(
    saved.composition,
    uid(),
    {
      x: tree.origin.x + tree.root.x + bounds.width / 2,
      y: tree.origin.y + tree.root.y + bounds.height / 2,
    },
    true,
  );
  const next = result.group!.structure!;
  const revision = recipeRevision(saved, group.recipe!.revision);
  // Las copias antiguas pueden llegar sin su revisión histórica. Conservar sus diferencias de contenido.
  const baseParts = partsById(revision ?? saved.composition);
  const nodes = new Map(world.nodes.map((n) => [n.id, n]));
  const oldParts = new Map(
    componentElements(tree.root)
      .filter((e) => e.material)
      .map((e) => [e.id, nodes.get(e.material!)!]),
  );
  const nextNodes = new Map(result.nodes.map((n) => [n.id, n]));
  const retained = new Set<string>();
  const previousOverrides = new Map(group.recipe!.overrides?.map((o) => [o.part, o.keys]));
  const overrides: NonNullable<CompositionLink['overrides']> = [];
  const references = new Set([
    ...world.links.flatMap((l) => [l.from, l.to]),
    ...world.comments.map((c) => c.node),
  ]);
  const hasFlow =
    linkedParts ??
    new Set(world.screenFlows?.filter((f) => f.from === group.id).map((f) => f.part));
  const oldRotation = revision?.structure?.rotation ?? 0;
  const delta = normalizedAngle((tree.rotation ?? 0) - oldRotation);
  next.rotation = normalizedAngle((next.rotation ?? 0) + delta);
  for (const leaf of componentElements(next.root)) {
    if (!leaf.material) continue;
    const node = nextNodes.get(leaf.material)!;
    const old = oldParts.get(leaf.id);
    if (!old) continue;
    const target = node.data as PartData;
    const source = old.data as PartData;
    const base = baseParts.get(leaf.id);
    if (!base || !supportsComposition(source) || !compatiblePartData(target, source)) continue;
    const fields = localProperties(partData(base), source, previousOverrides.get(leaf.id)).filter(
      (property) => copyProperty(target, source, property),
    );
    if (fields.length) overrides.push({ part: leaf.id, keys: fields.map((field) => field.key) });
    if (fields.some((p) => p.key === 'title')) leaf.name = source.title || leaf.name;
    if (target.kind === 'image' && Math.abs(leaf.width / leaf.height - target.ratio) > 0.000001)
      Object.assign(leaf, fittedImage(leaf, target.ratio));
    node.id = leaf.material = old.id;
    oldParts.delete(leaf.id);
  }
  for (const [part, old] of oldParts) {
    const base = baseParts.get(part);
    if (
      !base ||
      !supportsComposition(old.data) ||
      !compatiblePartData(partData(base), old.data as PartData) ||
      localProperties(partData(base), old.data as PartData, previousOverrides.get(part)).length ||
      references.has(old.id) ||
      hasFlow.has(part)
    )
      retained.add(old.id);
  }
  const poses = componentPoses(next);
  const materials = new Map(result.nodes.map((n) => [n.id, n]));
  for (const leaf of componentElements(next.root)) {
    if (!leaf.material) continue;
    const node = materials.get(leaf.material)!;
    const pose = poses.get(leaf.id)!;
    Object.assign(node, { x: pose.x, y: pose.y, width: pose.width, height: pose.height });
    // La geometría del catálogo histórico puede guardar el giro solo en el material.
    const angle = normalizedAngle((node.rotation ?? 0) + delta);
    if (angle) node.rotation = angle;
    else delete node.rotation;
  }
  // Sustituir en los espacios anteriores conserva el apilado respecto de materiales externos.
  const members = new Set(group.nodes);
  const ordered: Material[] = [];
  let cursor = 0;
  const last = world.nodes.findLast((n) => members.has(n.id));
  for (const node of world.nodes) {
    if (!members.has(node.id) || retained.has(node.id)) ordered.push(node);
    if (members.has(node.id) && !retained.has(node.id) && cursor < result.nodes.length)
      ordered.push(result.nodes[cursor++]!);
    if (node === last) ordered.push(...result.nodes.slice(cursor));
  }
  world.nodes = ordered;
  group.nodes = result.nodes.map((n) => n.id);
  group.structure = next;
  group.recipe = {
    id: saved.id,
    revision: saved.revision,
    ...(overrides.length ? { overrides } : {}),
  };
}
