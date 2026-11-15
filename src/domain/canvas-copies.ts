import { validBarRows } from './bar-chart';
import { validDetail } from './cable-geometry';
import { validRotation } from './rotation';
import {
  need,
  nodeTitle,
  type CanvasClipboard,
  type Material,
  type NodeData,
  type Point,
  type World,
  type WorldSnapshot,
} from './model';
import { ensure } from './invariants';
import { referenceExcerpt } from './reference-anchors';
import { validLocalContent } from './local-content';
import { validWireframe } from './wireframes';
import { validLabelPlacement } from './cable-labels';
import { validLinkDirection, validLinkWeight } from './link-stroke';
import { validArrowPoints } from './free-arrow';
import { validCanvasText } from './canvas-text';
import { validNoteFont, validFontWeight, validNoteTypography } from './note-fonts';
import { validLinkPreview, linkUrl } from './link-previews';
import { isComponent } from './manual-groups';
import { validLayoutGuides } from './layout-guides';
import { validComponentTree, componentElements, type ComponentElement } from './component-tree';

export const canvasClipboardMime = 'application/x-everett-canvas';
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const color = (v: unknown): boolean =>
  typeof v === 'string' && /^(#[\da-f]{3,8}|rgba?\([\d.,%\s]+\))$/i.test(v);
const point = (v: unknown): boolean => record(v) && Number.isFinite(v.x) && Number.isFinite(v.y);

function validData(v: unknown): v is NodeData {
  if (!record(v) || typeof v.title !== 'string') return false;
  switch (v.kind) {
    case 'bars':
      return validBarRows(v.rows);
    case 'text':
      return validCanvasText(v);
    case 'wireframe':
      return validWireframe(v.content);
    case 'note':
      return (
        typeof v.text === 'string' &&
        color(v.color) &&
        (v.font === undefined || validNoteFont(v.font)) &&
        (v.fontWeight === undefined || validFontWeight(v.fontWeight)) &&
        (v.fontItalic === undefined || typeof v.fontItalic === 'boolean') &&
        (v.typography === undefined || validNoteTypography(v.typography))
      );
    case 'local':
      return validLocalContent(v.content);
    case 'shape':
      return (
        ['rectangle', 'ellipse', 'triangle', 'star'].includes(String(v.shape)) &&
        color(v.color) &&
        (v.stroke === undefined || color(v.stroke)) &&
        (v.fill === undefined || typeof v.fill === 'boolean') &&
        (v.thickness === undefined ||
          (typeof v.thickness === 'number' && v.thickness > 0 && Number.isFinite(v.thickness)))
      );
    case 'drawing':
      return (
        Array.isArray(v.points) &&
        validArrowPoints(v.arrow, v.points.length) &&
        v.points.length > 0 &&
        v.points.every(point) &&
        color(v.color) &&
        typeof v.thickness === 'number' &&
        Number.isFinite(v.thickness) &&
        v.thickness > 0
      );
    case 'image':
    case 'video':
    case 'pdf':
      return (
        typeof v.asset === 'string' &&
        v.asset.length > 0 &&
        typeof v.mime === 'string' &&
        typeof v.ratio === 'number' &&
        v.ratio > 0 &&
        Number.isFinite(v.ratio) &&
        (v.source === undefined || (typeof v.source === 'string' && linkUrl(v.source) !== null)) &&
        (v.preview === undefined ||
          (typeof v.preview === 'string' &&
            /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(v.preview)))
      );
    case 'link':
      return (
        typeof v.url === 'string' &&
        linkUrl(v.url) !== null &&
        (v.metadata === undefined || validLinkPreview(v.metadata))
      );
    default:
      return false;
  }
}

/** Validación estricta antes de admitir un lote del portapapeles como contenido del proyecto. */
export function parseCanvasClipboard(text: string): CanvasClipboard {
  ensure(
    text.length <= 16 * 1024 * 1024,
    'CLIPBOARD_LIMIT',
    'La selección copiada es demasiado grande. Copiá menos materiales a la vez.',
  );
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    ensure(false, 'CLIPBOARD_JSON', 'Los materiales copiados tienen un formato inválido.');
  }
  ensure(record(value), 'CLIPBOARD_FORMAT', 'No se reconocen los materiales copiados.');
  const v = value as Record<string, unknown>;
  ensure(
    v.format === 'everett-canvas' &&
      v.version === 1 &&
      Array.isArray(v.nodes) &&
      v.nodes.length > 0 &&
      v.nodes.length <= 1000 &&
      Array.isArray(v.links) &&
      v.links.length <= 5000 &&
      Array.isArray(v.groups) &&
      v.groups.length <= 1000,
    'CLIPBOARD_FORMAT',
    'No se reconoce esta versión de los materiales copiados.',
  );
  const nodes = v.nodes as unknown[];
  ensure(
    nodes.every(
      (n) =>
        record(n) &&
        typeof n.id === 'string' &&
        point(n) &&
        typeof n.width === 'number' &&
        Number.isFinite(n.width) &&
        n.width >= 4 &&
        typeof n.height === 'number' &&
        Number.isFinite(n.height) &&
        n.height >= 4 &&
        n.owner === null &&
        validRotation(n.rotation) &&
        (n.layoutGuides === undefined || validLayoutGuides(n.layoutGuides)) &&
        validData(n.data),
    ),
    'CLIPBOARD_MATERIAL',
    'La selección contiene un material inválido.',
  );
  const parsed = v as unknown as CanvasClipboard;
  const ids = new Set(parsed.nodes.map((n) => n.id));
  ensure(
    ids.size === parsed.nodes.length,
    'CLIPBOARD_ID',
    'La selección tiene identificadores repetidos.',
  );
  ensure(
    parsed.links.every(
      (l) =>
        record(l) &&
        typeof l.id === 'string' &&
        typeof l.from === 'string' &&
        ids.has(l.from) &&
        typeof l.to === 'string' &&
        ids.has(l.to) &&
        l.from !== l.to &&
        ['north', 'east', 'south', 'west'].includes(String(l.fromAnchor)) &&
        ['north', 'east', 'south', 'west'].includes(String(l.toAnchor)) &&
        (l.path === undefined || l.path === 'straight') &&
        (l.detail === undefined ||
          (validDetail(l.detail) &&
            parsed.nodes.find((n) => n.id === l.to)?.data.kind === 'image')) &&
        (l.labelPlacement === undefined || validLabelPlacement(l.labelPlacement)) &&
        (l.direction === undefined || validLinkDirection(l.direction)) &&
        (l.thickness === undefined || validLinkWeight(l.thickness)) &&
        (l.label === undefined || typeof l.label === 'string'),
    ),
    'CLIPBOARD_LINK',
    'La selección contiene una conexión inválida.',
  );
  const grouped = new Set<string>();
  ensure(
    parsed.groups.every(
      (g) =>
        record(g) &&
        typeof g.id === 'string' &&
        typeof g.name === 'string' &&
        (g.layoutGuides === undefined || validLayoutGuides(g.layoutGuides)) &&
        (g.component === undefined || typeof g.component === 'boolean') &&
        Array.isArray(g.nodes) &&
        (g.structure === undefined || validComponentTree(g.structure, g.nodes)) &&
        g.nodes.length > 0 &&
        g.nodes.every((id) => {
          if (typeof id !== 'string' || !ids.has(id) || grouped.has(id)) return false;
          grouped.add(id);
          return true;
        }),
    ),
    'CLIPBOARD_GROUP',
    'La selección contiene un conjunto inválido.',
  );
  return structuredClone(parsed);
}

function independentData(world: WorldSnapshot, node: Material): NodeData {
  const data = node.data;
  if (data.kind !== 'reference') {
    const copy = structuredClone(data);
    if (copy.kind === 'shape') copy.title ??= nodeTitle(world, node);
    return copy;
  }
  const ref = data.ref;
  const excerpt = ref.fragment ? referenceExcerpt(world, ref) : undefined;
  ensure(
    excerpt !== null,
    'FRAGMENT_UNAVAILABLE',
    'El fragmento ya no está disponible. Revisá su origen antes de copiarlo.',
  );
  let content: Extract<NodeData, { kind: 'local' }>['content'];
  if (ref.kind === 'document') {
    const doc = need(
      world.docs.find((item) => item.id === ref.id),
      'Documento no disponible',
    );
    content = {
      kind: 'document',
      body: excerpt ?? doc.body,
      sheet: ref.fragment ? null : structuredClone(doc.sheet),
    };
  } else if (ref.kind === 'file') {
    const file = need(
      world.files.find((item) => item.id === ref.id),
      'Archivo no disponible',
    );
    content = { kind: 'file', text: excerpt ?? file.text };
  } else if (ref.kind === 'task') {
    const {
      id: _id,
      title: _title,
      ...task
    } = structuredClone(
      need(
        world.tasks.find((item) => item.id === ref.id),
        'Tarea no disponible',
      ),
    );
    content = { kind: 'task', task };
  } else {
    const {
      id: _id,
      name: _name,
      ...agent
    } = structuredClone(
      need(
        world.agents.find((item) => item.id === ref.id),
        'Agente no disponible',
      ),
    );
    content = { kind: 'agent', agent };
  }
  return { kind: 'local', title: nodeTitle(world, node), content };
}

/** Captura el contenido ahora; editar el original después de copiar no cambia el lote. */
export function captureCanvasCopies(
  world: WorldSnapshot,
  selected: readonly string[],
): CanvasClipboard {
  const ids = new Set(selected);
  ensure(ids.size > 0, 'COPY_EMPTY', 'Seleccioná al menos un material.');
  const nodes = world.nodes.filter((n) => ids.has(n.id));
  ensure(
    nodes.length === ids.size && nodes.every((n) => !n.owner),
    'COPY_LOCKED',
    'La selección contiene un material no disponible o usado por un agente.',
  );
  return {
    format: 'everett-canvas',
    version: 1,
    nodes: nodes.map((node) => ({
      ...structuredClone(node),
      data: independentData(world, node),
      owner: null,
    })),
    links: structuredClone(world.links.filter((link) => ids.has(link.from) && ids.has(link.to))),
    groups: (world.canvasGroups ?? [])
      .filter((group) => group.nodes.length > 0 && group.nodes.every((id) => ids.has(id)))
      .map((group) => ({
        id: group.id,
        name: group.name,
        nodes: [...group.nodes],
        component: isComponent(world, group),
        ...(group.structure
          ? {
              structure: structuredClone(group.structure) as NonNullable<
                import('./model').CanvasGroup['structure']
              >,
            }
          : {}),
        ...(group.layoutGuides ? { layoutGuides: structuredClone(group.layoutGuides) } : {}),
      })),
  };
}

export function insertCanvasCopies(
  world: World,
  clipboard: CanvasClipboard,
  uid: () => string,
  offset: Point,
): string[] {
  const copied = parseCanvasClipboard(JSON.stringify(clipboard));
  ensure(
    Number.isFinite(offset.x) && Number.isFinite(offset.y),
    'GEOMETRY',
    'Posición de pegado inválida.',
  );
  const map = new Map(copied.nodes.map((node) => [node.id, uid()]));
  for (const node of copied.nodes) {
    node.id = map.get(node.id)!;
    node.x += offset.x;
    node.y += offset.y;
    if (node.data.kind !== 'reference') node.data.title = nodeTitle(world, node) + ' — copia';
    world.nodes.push(node);
  }
  for (const link of copied.links)
    world.links.push({ ...link, id: uid(), from: map.get(link.from)!, to: map.get(link.to)! });
  for (const group of copied.groups) {
    delete group.recipe;
    if (group.structure) {
      group.structure.origin.x += offset.x;
      group.structure.origin.y += offset.y;
      for (const element of componentElements(group.structure.root)) {
        delete (element as ComponentElement).instance;
        if (element.material) (element as ComponentElement).material = map.get(element.material)!;
      }
    }
    (world.canvasGroups ??= []).push({
      ...group,
      id: uid(),
      name: group.name + ' — copia',
      nodes: group.nodes.map((id) => map.get(id)!),
    });
  }
  return [...map.values()];
}
