import {
  nodeTitle,
  type Material,
  type WorldSnapshot,
  type Zone,
  type Point,
  type Link,
  type Anchor,
  statusNames,
} from '../../domain/model';
import { anchorPoint, linkPath, shapeVertices } from '../../domain/geometry';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { materialDensity, materialGroups } from '../../domain/material-density';
const anchors: Anchor[] = ['north', 'east', 'south', 'west'];
export function shapeMarkup(material: Material): string {
  if (material.data.kind !== 'shape') return '';
  const { shape, color, stroke = color, thickness = 1, fill = true } = material.data;
  const content =
    shape === 'ellipse'
      ? '<ellipse cx="50" cy="50" rx="49.5" ry="49.5"/>'
      : shape === 'rectangle'
        ? '<rect x=".5" y=".5" width="99" height="99" rx="1"/>'
        : `<polygon points="${shapeVertices(shape)
            .map((p) => `${p.x * 100},${p.y * 100}`)
            .join(' ')}"/>`;
  return `<svg class="shape-art ${shape}" viewBox="0 0 100 100" preserveAspectRatio="none" fill="${fill ? color : 'none'}" stroke="${stroke}" stroke-width="${thickness}" aria-hidden="true">${content}</svg>`;
}
function drawingMarkup(material: Material): string {
  if (material.data.kind !== 'drawing') return '';
  const d = material.data;
  const point = d.points[0]!;
  return `<svg class="drawing-art" style="--drawing-thickness:${d.thickness}px" viewBox="0 0 ${material.width} ${material.height}" aria-hidden="true">${d.points.length === 1 ? `<circle cx="${point.x}" cy="${point.y}" r="${d.thickness / 2}" fill="${d.color}"/>` : `<polyline points="${d.points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${d.color}" stroke-width="${d.thickness}" stroke-linecap="round" stroke-linejoin="round"/>`}</svg>`;
}
export function resizeHandles(kind: 'node' | 'zone', id: string): string {
  return ['nw', 'ne', 'se', 'sw']
    .map(
      (corner) =>
        `<button type="button" class="resize-handle ${corner}" data-resize="${kind}" data-id="${id}" data-corner="${corner}" aria-label="Redimensionar ${corner}" title="Redimensionar con las flechas; Shift para pasos mayores"></button>`,
    )
    .join('');
}
export function materialMarkup(
  w: WorldSnapshot,
  material: Material,
  selected: boolean,
  connect: boolean,
  resize = true,
): string {
  const d = material.data;
  let content: string;
  if (d.kind === 'note') content = `<h3>${html(d.title)}</h3><p>${html(d.text)}</p>`;
  else if (d.kind === 'shape') content = shapeMarkup(material);
  else if (d.kind === 'drawing') content = drawingMarkup(material);
  else if (d.kind === 'image')
    content = `<img data-asset="${d.asset}" alt="${html(d.title)}" draggable="false">`;
  else if (d.kind === 'video')
    content = `<video data-asset="${d.asset}" preload="metadata" aria-label="${html(d.title)}" draggable="false"></video><button type="button" class="video-play" data-action="video-play" aria-label="Reproducir video" disabled>${icon('play', 24)}</button>${d.duration !== undefined ? `<span class="video-duration">${Math.floor(d.duration / 60)}:${String(Math.floor(d.duration % 60)).padStart(2, '0')}</span>` : ''}`;
  else if (d.kind === 'pdf')
    content = d.preview
      ? `<img src="${d.preview}" alt="Primera página de ${html(d.title)}">`
      : `<div class="pdf-placeholder">${icon('docs', 28)}<strong>${html(d.title)}</strong><span>PDF · sin portada disponible</span></div>`;
  else if (d.kind === 'link') {
    const url = new URL(d.url);
    content = `${d.preview ? `<img src="${html(d.preview)}" alt="">` : ''}<div class="link-material-body">${icon('link', 18)}<span>${html(url.hostname + url.pathname)}${d.description ? `<small>${html(d.description)}</small>` : ''}</span></div>`;
  } else if (d.kind === 'reference') {
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
    if (ref.kind === 'task') {
      const task = w.tasks.find((t) => t.id === ref.id);
      if (task)
        content = `<div class="task-material-kind">${icon('board', 12)} Tarea</div><h3>${html(task.title)}</h3><p>${html(task.description)}</p><div class="task-material-meta"><span title="Estado: ${html(statusNames[task.status])}" aria-label="Estado: ${html(statusNames[task.status])}">${icon('status', 12)}${html(statusNames[task.status])}</span><span title="Prioridad: ${html(task.priority)}" aria-label="Prioridad: ${html(task.priority)}">${icon('flag', 12)}${html(task.priority)}</span><span title="Responsable: ${html(task.assignee || 'Sin responsable')}" aria-label="Responsable: ${html(task.assignee || 'Sin responsable')}">${icon('user', 12)}${html(task.assignee || 'Sin responsable')}</span></div>`;
    }
  } else content = '';
  const comment = w.comments.find((c) => c.node === material.id && !c.resolved);
  const ports = connect
    ? anchors
        .map((anchor) => {
          const point = anchorPoint(material, anchor);
          return `<button type="button" class="connection-port ${anchor}" data-anchor="${anchor}" data-anchor-node="${material.id}" aria-label="Anclaje ${anchor}" style="left:${point.x - material.x}px;top:${point.y - material.y}px"></button>`;
        })
        .join('')
    : '';
  return `<article class="material ${d.kind === 'shape' ? 'shape-material' : d.kind} ${selected ? 'selected' : ''}" tabindex="0" aria-label="${html(nodeTitle(w, material))}" data-node="${material.id}" ${d.kind === 'reference' ? `data-reference-kind="${d.ref.kind}"` : ''} style="left:${material.x}px;top:${material.y}px;width:${material.width}px;height:${material.height}px;${d.kind === 'note' ? 'background:' + d.color : ''}">${content}<div class="material-identification"><button type="button" data-action="material-rename" data-id="${material.id}" title="${html(nodeTitle(w, material))}">${html(nodeTitle(w, material))}</button><span>${{ note: 'Nota', shape: 'Forma', drawing: 'Dibujo', image: 'Imagen', video: 'Video', pdf: 'PDF', link: 'Enlace', reference: d.kind === 'reference' ? { document: 'Documento', file: 'Archivo', task: 'Tarea de Board', agent: 'Agente' }[d.ref.kind] : 'Referencia' }[d.kind]}</span></div>${selected && resize && !connect ? resizeHandles('node', material.id) : ''}${ports}${comment ? `<button type="button" data-action="material-comments" data-id="${material.id}" class="comment-marker" aria-label="Comentario de ${html(comment.author)}">${icon('bubble', 14)}<span class="comment-preview" role="tooltip"><strong>${html(comment.author)}</strong>${html(comment.text)}</span></button>` : ''}</article>`;
}
const materialKinds: Record<string, { label: string; icon: Parameters<typeof icon>[0] }> = {
  note: { label: 'Notas', icon: 'note' },
  document: { label: 'Documentos', icon: 'docs' },
  file: { label: 'Archivos', icon: 'code' },
  task: { label: 'Tareas', icon: 'board' },
  shape: { label: 'Formas', icon: 'shape' },
  agent: { label: 'Agentes', icon: 'agents' },
  image: { label: 'Imágenes', icon: 'image' },
  video: { label: 'Videos', icon: 'play' },
  pdf: { label: 'PDF', icon: 'docs' },
  drawing: { label: 'Dibujos', icon: 'draw' },
  link: { label: 'Enlaces', icon: 'link' },
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
  return `<div class="assigned-preview" data-assigned-id="${n.id}"><strong>${icon(meta.icon, 13)}<span>${html(nodeTitle(w, n))}</span></strong>${d.kind === 'shape' ? shapeMarkup(n) : d.kind === 'drawing' ? drawingMarkup(n) : d.kind === 'image' || d.kind === 'video' ? `<${d.kind === 'image' ? 'img' : 'video'} data-asset="${d.asset}" ${d.kind === 'image' ? `alt="${html(d.title)}"` : `aria-label="${html(d.title)}"`}>${d.kind === 'video' ? '</video>' : ''}` : d.kind === 'pdf' && d.preview ? `<img src="${d.preview}" alt="${html(d.title)}">` : `<p>${html(d.kind === 'link' ? d.url : text)}</p>`}</div>`;
}
function assignedMaterials(w: WorldSnapshot, nodes: Material[]): string {
  if (!nodes.length)
    return '<span class="drop-label">Arrastrá un material acá<span>El agente lo usará como contexto</span></span>';
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
  return `<div class="agent-zone ${selected ? 'selected' : ''}" data-zone="${zone.id}" tabindex="0" role="group" aria-label="Zona ${html(zone.name)}" style="left:${zone.x}px;top:${zone.y}px;width:${zone.width}px;height:${zone.height}px"><div class="zone-heading">${icon(agent ? 'agents' : 'zone', 14)}<span>${html(zone.name)}</span></div>${
    spacious && agent
      ? `<div class="zone-materials">${assignedMaterials(
          w,
          w.nodes.filter((n) => n.owner === zone.agent),
        )}</div>${w.assignments.some((a) => a.agent === agent.id && a.phase === 'working') ? '<div class="working-dots" role="status" aria-label="Agente trabajando"><i></i><i></i><i></i></div>' : ''}`
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
  const ends = selected
    ? (['from', 'to'] as const)
        .map((end) => {
          const point = anchorPoint(
            end === 'from' ? from : to,
            end === 'from' ? link.fromAnchor : link.toAnchor,
          );
          return `<g class="link-endpoint" transform="translate(${point.x},${point.y})" tabindex="0" role="button" aria-label="Reconectar ${end === 'from' ? 'origen' : 'destino'}" data-action="link-endpoint" data-id="${link.id}" data-end="${end}"><circle class="endpoint-hit"/><circle class="endpoint-dot"/></g>`;
        })
        .join('')
    : '';
  return `<g data-link="${link.id}" class="connection ${selected ? 'selected' : ''}">${link.label ? `<mask id="mask-${link.id}" maskUnits="userSpaceOnUse" mask-type="luminance"><rect class="mask-base" fill="white"/><rect class="label-cut" fill="black"/></mask>` : ''}<path class="link-hit" tabindex="0" role="button" aria-label="${html(link.label || 'Editar etiqueta de conexión')}" data-action="select-link" data-id="${link.id}" d="${path}"/><path class="link-line" d="${path}" ${link.label ? `mask="url(#mask-${link.id})"` : ''}/>${link.label ? `<text class="cable-label" text-anchor="middle" dominant-baseline="middle" data-action="select-link" data-id="${link.id}">${html(link.label)}</text>` : ''}${ends}</g>`;
}
