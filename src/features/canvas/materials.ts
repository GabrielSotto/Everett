import {
  nodeTitle,
  type Material,
  type WorldSnapshot,
  type Zone,
  type Point,
  type Link,
  type Anchor,
} from '../../domain/model';
import { anchorPoint, linkPath, shapeVertices } from '../../domain/geometry';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { materialDensity, materialGroups } from '../../domain/material-density';
const anchors: Anchor[] = ['north', 'east', 'south', 'west'];
export function shapeMarkup(material: Material): string {
  if (material.data.kind !== 'shape') return '';
  const { shape, color } = material.data;
  const content =
    shape === 'ellipse'
      ? '<ellipse cx="50" cy="50" rx="49.5" ry="49.5"/>'
      : shape === 'rectangle'
        ? '<rect x=".5" y=".5" width="99" height="99" rx="1"/>'
        : `<polygon points="${shapeVertices(shape)
            .map((p) => `${p.x * 100},${p.y * 100}`)
            .join(' ')}"/>`;
  return `<svg class="shape-art ${shape}" viewBox="0 0 100 100" preserveAspectRatio="none" fill="${color}" aria-hidden="true">${content}</svg>`;
}
export function resizeHandles(kind: 'node' | 'zone', id: string): string {
  return ['nw', 'ne', 'se', 'sw']
    .map(
      (corner) =>
        `<button type="button" class="resize-handle ${corner}" data-resize="${kind}" data-id="${id}" data-corner="${corner}" aria-label="Redimensionar ${corner}"></button>`,
    )
    .join('');
}
export function materialMarkup(
  w: WorldSnapshot,
  material: Material,
  selected: boolean,
  connect: boolean,
): string {
  const d = material.data;
  let content: string;
  if (d.kind === 'note') content = `<h3>${html(d.title)}</h3><p>${html(d.text)}</p>`;
  else if (d.kind === 'shape') content = shapeMarkup(material);
  else {
    const ref = d.ref;
    const detail =
      ref.kind === 'document'
        ? w.docs.find((doc) => doc.id === ref.id)?.body
        : ref.kind === 'file'
          ? w.files.find((f) => f.id === ref.id)?.text
          : ref.kind === 'task'
            ? w.tasks.find((t) => t.id === ref.id)?.description
            : w.agents.find((a) => a.id === ref.id)?.role;
    content = `<div class="reference-type">${icon(ref.kind === 'document' ? 'docs' : ref.kind === 'file' ? 'code' : ref.kind === 'task' ? 'board' : 'agents', 17)}</div><h3>${html(nodeTitle(w, material))}</h3><${ref.kind === 'file' ? 'pre' : 'p'}>${html(detail)}</${ref.kind === 'file' ? 'pre' : 'p'}>`;
  }
  const comment = w.comments.find((c) => c.node === material.id && !c.resolved);
  const ports = connect
    ? anchors
        .map((anchor) => {
          const point = anchorPoint(material, anchor);
          return `<button type="button" class="connection-port ${anchor}" data-anchor="${anchor}" data-anchor-node="${material.id}" aria-label="Anclaje ${anchor}" style="left:${point.x - material.x}px;top:${point.y - material.y}px"></button>`;
        })
        .join('')
    : '';
  return `<article class="material ${d.kind === 'shape' ? 'shape-material' : d.kind} ${selected ? 'selected' : ''}" data-node="${material.id}" style="left:${material.x}px;top:${material.y}px;width:${material.width}px;height:${material.height}px;${d.kind === 'note' ? 'background:' + d.color : ''}">${content}${selected && !connect ? resizeHandles('node', material.id) : ''}${ports}${comment ? `<button type="button" class="comment-marker" aria-label="Comentario de ${html(comment.author)}">${icon('comment', 13)}<span class="comment-preview" role="tooltip"><strong>${html(comment.author)}</strong>${html(comment.text)}</span></button>` : ''}</article>`;
}
const materialKinds: Record<string, { label: string; icon: Parameters<typeof icon>[0] }> = {
  note: { label: 'Notas', icon: 'note' },
  document: { label: 'Documentos', icon: 'docs' },
  file: { label: 'Archivos', icon: 'code' },
  task: { label: 'Tareas', icon: 'board' },
  shape: { label: 'Formas', icon: 'shape' },
  agent: { label: 'Agentes', icon: 'agents' },
};
function assignedPreview(w: WorldSnapshot, n: Material): string {
  const d = n.data,
    kind = d.kind === 'reference' ? d.ref.kind : d.kind,
    meta = materialKinds[kind] ?? materialKinds.note!;
  const text =
    d.kind === 'note'
      ? d.text
      : d.kind === 'reference'
        ? d.ref.kind === 'document'
          ? w.docs.find((doc) => doc.id === d.ref.id)?.body
          : d.ref.kind === 'file'
            ? w.files.find((file) => file.id === d.ref.id)?.text
            : d.ref.kind === 'task'
              ? w.tasks.find((task) => task.id === d.ref.id)?.description
              : ''
        : '';
  return `<div class="assigned-preview" data-assigned-id="${n.id}"><strong>${icon(meta.icon, 13)}<span>${html(nodeTitle(w, n))}</span></strong>${d.kind === 'shape' ? shapeMarkup(n) : `<p>${html(text)}</p>`}</div>`;
}
function assignedMaterials(w: WorldSnapshot, nodes: Material[]): string {
  if (!nodes.length) return '<span class="drop-label">Arrastrá un material acá</span>';
  const mode = materialDensity(nodes.length),
    groups = materialGroups(nodes);
  const grouped = groups
    .map((group) => {
      const meta = materialKinds[group.kind] ?? materialKinds.note!;
      return `<details class="assigned-type" data-material-type="${group.kind}"><summary>${icon(meta.icon, 15)}<span>${meta.label}</span><b>${group.ids.length}</b></summary><div>${group.ids
        .map(
          (id) =>
            `<span>${html(
              nodeTitle(
                w,
                nodes.find((n) => n.id === id)!,
              ),
            )}</span>`,
        )
        .join('')}</div></details>`;
    })
    .join('');
  return `<div class="assigned-layout ${mode}" data-density="${mode}" data-material-count="${nodes.length}">${
    mode === 'previews'
      ? nodes.map((n) => assignedPreview(w, n)).join('')
      : mode === 'types'
        ? grouped
        : `<details class="assigned-summary"><summary><strong>${nodes.length} materiales</strong><span>${groups
            .slice(0, 5)
            .map((g) => icon((materialKinds[g.kind] ?? materialKinds.note!).icon, 17))
            .join(
              '',
            )}${groups.length > 5 ? `<b>+${groups.length - 5}</b>` : ''}</span></summary><div>${grouped}</div></details>`
  }</div>`;
}
export function zoneMarkup(w: WorldSnapshot, zone: Zone, selected: boolean): string {
  const agent = w.agents.find((a) => a.id === zone.agent);
  const spacious = zone.width > 185 && zone.height > 120;
  return `<div class="agent-zone ${selected ? 'selected' : ''}" data-zone="${zone.id}" style="left:${zone.x}px;top:${zone.y}px;width:${zone.width}px;height:${zone.height}px"><div class="zone-heading">${icon(agent ? 'agents' : 'zone', 14)}<span>${html(agent?.name ?? zone.name)}</span></div>${
    spacious && agent
      ? `<div class="zone-materials">${assignedMaterials(
          w,
          w.nodes.filter((n) => n.owner === zone.agent),
        )}</div>${w.assignments.some((a) => a.agent === agent.id && a.phase === 'working') ? '<div class="working-dots"><i></i><i></i><i></i></div>' : ''}`
      : ''
  }</div>`;
}
export function connectionMarkup(
  link: Link,
  w: WorldSnapshot,
  selected: boolean,
  preview?: { id: string; point: Point },
): string {
  const a = w.nodes.find((n) => n.id === link.from),
    b = w.nodes.find((n) => n.id === link.to);
  if (!a || !b || a.owner || b.owner) return '';
  const from = preview?.id === a.id ? { ...a, ...preview.point } : a;
  const to = preview?.id === b.id ? { ...b, ...preview.point } : b;
  const path = linkPath(
    anchorPoint(from, link.fromAnchor),
    anchorPoint(to, link.toAnchor),
    link.fromAnchor,
    link.toAnchor,
  );
  return `<g data-link="${link.id}" class="connection ${selected ? 'selected' : ''}"><path class="link-hit" data-action="select-link" data-id="${link.id}" d="${path}"/><path class="link-line" d="${path}"/></g>`;
}
