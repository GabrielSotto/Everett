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
import { localText, localNames } from '../../domain/local-content';
import { barChartSvg } from './bar-chart';
import { wireframeMarkup } from './wireframe-markup';
import { wireframeText } from '../../domain/wireframes';
import { isArrow } from '../../domain/free-arrow';
import { arrowArt, arrowHandles } from './free-arrow';
import { unrotatedAnchor, shapeVertices } from '../../domain/geometry';
import { cableGeometry } from '../../domain/cable-geometry';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { materialDensity, materialGroups } from '../../domain/material-density';
import { referenceExcerpt } from '../../domain/reference-anchors';
import { linkCardMarkup } from './link-card';
import { noteStyle, noteFontAttributes } from './note-colors';
import { textStyle, textFontAttributes } from './direct-text-layout';
import { canvasTextInk } from '../../domain/sketch-text-ink';
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
  return `<svg class="shape-art ${shape}" style="--shape-thickness:${thickness}px" viewBox="0 0 100 100" preserveAspectRatio="none" fill="${fill ? color : 'none'}" stroke="${stroke}" stroke-width="${thickness}" aria-hidden="true">${content}</svg>`;
}
function drawingMarkup(material: Material): string {
  if (material.data.kind !== 'drawing') return '';
  const d = material.data;
  if (isArrow(material)) return arrowArt(material);
  const point = d.points[0]!;
  return `<svg class="drawing-art" style="--drawing-thickness:${d.thickness}px" viewBox="0 0 ${material.width} ${material.height}" aria-hidden="true">${d.points.length === 1 ? `<circle cx="${point.x}" cy="${point.y}" r="${d.thickness / 2}" fill="${d.color}"/>` : `<polyline points="${d.points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${d.color}" stroke-width="${d.thickness}" stroke-linecap="round" stroke-linejoin="round"/>`}</svg>`;
}
export function resizeHandles(kind: 'node' | 'zone' | 'group', id: string, text = false): string {
  return (text ? ['nw', 'ne', 'se', 'sw', 'w', 'e'] : ['nw', 'ne', 'se', 'sw'])
    .map(
      (corner) =>
        `<button type="button" class="resize-handle ${corner}" data-resize="${kind}" data-id="${id}" data-corner="${corner}" aria-label="${text ? (corner.length === 1 ? 'Cambiar ancho' : 'Escalar texto') : 'Redimensionar'} ${corner}" title="${text ? (corner.length === 1 ? 'Cambiar ancho del párrafo' : 'Escalar texto proporcionalmente') : 'Redimensionar con las flechas; Shift para pasos mayores'}"></button>`,
    )
    .join('');
}
export function connectionPorts(material: Material): string {
  return anchors
    .map((anchor) => {
      const point = unrotatedAnchor(material, anchor);
      return `<button type="button" class="connection-port ${anchor}" data-anchor="${anchor}" data-anchor-node="${material.id}" aria-label="Anclaje ${anchor}" style="left:${point.x - material.x}px;top:${point.y - material.y}px"></button>`;
    })
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
  if (d.kind === 'bars') content = barChartSvg(d);
  else if (d.kind === 'wireframe') content = wireframeMarkup(material, w);
  else if (d.kind === 'local') {
    content = `<small class="local-copy-label">Solo en Canvas</small><div class="reference-type">${icon(d.content.kind === 'file' ? 'code' : d.content.kind === 'task' ? 'board' : d.content.kind === 'agent' ? 'agents' : 'docs', 17)}</div><h3>${html(d.title)}</h3><${d.content.kind === 'file' ? 'pre' : 'p'}>${html(localText(d.content))}</${d.content.kind === 'file' ? 'pre' : 'p'}>`;
    if (d.content.kind === 'task') {
      const task = d.content.task;
      content += `<div class="task-material-meta"><span aria-label="Estado: ${html(statusNames[task.status])}">${icon('status', 12)}${html(statusNames[task.status])}</span><span aria-label="Prioridad: ${html(task.priority)}">${icon('flag', 12)}${html(task.priority)}</span><span aria-label="Responsable: ${html(task.assignee || 'Sin responsable')}">${icon('user', 12)}${html(task.assignee || 'Sin responsable')}</span></div>`;
    }
  } else if (d.kind === 'note') content = `<h3>${html(d.title)}</h3><p>${html(d.text)}</p>`;
  else if (d.kind === 'text')
    content = `<div class="canvas-text-run" title="Doble clic para editar el texto" style="${html(textStyle(d, canvasTextInk(material, w)))}">${html(d.text)}</div>`;
  else if (d.kind === 'shape') content = shapeMarkup(material);
  else if (d.kind === 'drawing') content = drawingMarkup(material);
  else if (d.kind === 'image')
    content = `<img data-asset="${d.asset}" alt="${html(d.title)}" draggable="false">`;
  else if (d.kind === 'video')
    content = `<video data-asset="${d.asset}" preload="auto" aria-label="${html(d.title)}" draggable="false"></video>${d.preview ? `<img class="video-poster" src="${html(d.preview)}" alt="Vista previa de ${html(d.title)}" draggable="false">` : `<div class="video-preview-status" role="status">Preparando vista previa…</div>`}<button type="button" class="video-play" data-action="video-play" aria-label="Reproducir video" disabled>${icon('play', 24)}</button>${d.duration !== undefined ? `<span class="video-duration">${Math.floor(d.duration / 60)}:${String(Math.floor(d.duration % 60)).padStart(2, '0')}</span>` : ''}`;
  else if (d.kind === 'pdf')
    content = d.preview
      ? `<img src="${d.preview}" alt="Primera página de ${html(d.title)}">`
      : `<div class="pdf-placeholder">${icon('docs', 28)}<strong>${html(d.title)}</strong><span>PDF · sin portada disponible</span></div>`;
  else if (d.kind === 'link') {
    content = linkCardMarkup(d, material.id, resize);
  } else if (d.kind === 'reference') {
    const ref = d.ref;
    const detail = ref.fragment
      ? (referenceExcerpt(w, ref) ?? 'Fragmento no disponible. Revisá su origen.')
      : ref.kind === 'document'
        ? w.docs.find((doc) => doc.id === ref.id)?.body
        : ref.kind === 'file'
          ? w.files.find((f) => f.id === ref.id)?.text
          : ref.kind === 'task'
            ? w.tasks.find((t) => t.id === ref.id)?.description
            : w.agents.find((a) => a.id === ref.id)?.role;
    content = `<div class="reference-type">${icon(ref.kind === 'document' ? 'docs' : ref.kind === 'file' ? 'code' : ref.kind === 'task' ? 'board' : 'agents', 17)}</div><h3>${html(nodeTitle(w, material))}</h3><${ref.kind === 'file' ? 'pre' : 'p'}>${html(detail)}</${ref.kind === 'file' ? 'pre' : 'p'}>`;
    if (ref.fragment)
      content =
        `<small class="fragment-state">${referenceExcerpt(w, ref) === null ? 'Fragmento no disponible' : 'Fragmento de ' + (ref.kind === 'file' ? 'Code' : 'Docs')}</small>` +
        content;
    if (ref.kind === 'task') {
      const task = w.tasks.find((t) => t.id === ref.id);
      if (task)
        content = `<div class="task-material-kind">${icon('board', 12)} Tarea</div><h3>${html(task.title)}</h3><p>${html(task.description)}</p><div class="task-material-meta"><span title="Estado: ${html(statusNames[task.status])}" aria-label="Estado: ${html(statusNames[task.status])}">${icon('status', 12)}${html(statusNames[task.status])}</span><span title="Prioridad: ${html(task.priority)}" aria-label="Prioridad: ${html(task.priority)}">${icon('flag', 12)}${html(task.priority)}</span><span title="Responsable: ${html(task.assignee || 'Sin responsable')}" aria-label="Responsable: ${html(task.assignee || 'Sin responsable')}">${icon('user', 12)}${html(task.assignee || 'Sin responsable')}</span></div>`;
    }
  } else content = '';
  const comment = w.comments.find((c) => c.node === material.id && !c.resolved);
  const ports = connect ? connectionPorts(material) : '';
  return `<article class="material ${isArrow(material) ? 'free-arrow' : ''} ${d.kind === 'shape' ? 'shape-material' : d.kind === 'local' ? 'reference local-copy' : d.kind} ${selected ? 'selected' : ''}" tabindex="0" aria-label="${html(nodeTitle(w, material))}" data-node="${material.id}" ${d.kind === 'note' ? noteFontAttributes(d) : d.kind === 'text' ? textFontAttributes(d) : ''} ${d.kind === 'reference' ? `data-reference-kind="${d.ref.kind}"` : d.kind === 'local' ? `data-reference-kind="${d.content.kind}" data-local-copy="true"` : ''} style="${d.kind === 'shape' ? '--shape-thickness:' + (d.thickness ?? 1) + 'px;' : ''}${material.rotation ? 'rotate:' + material.rotation + 'deg;--label-counter-angle:' + -material.rotation + 'deg;' : ''}left:${material.x}px;top:${material.y}px;width:${material.width}px;height:${material.height}px;${d.kind === 'note' ? noteStyle(d) : ''}">${content}${d.kind === 'shape' ? '<svg class="material-selection-frame" aria-hidden="true"><rect width="100%" height="100%"/></svg>' : ''}<div class="material-label-space"><div class="material-identification"><button type="button" data-action="material-rename" data-id="${material.id}" title="${html(nodeTitle(w, material))}">${html(nodeTitle(w, material))}</button><span>${{ bars: 'Gráfico', wireframe: 'Bosquejo', text: 'Texto', note: 'Nota', shape: 'Forma', drawing: 'Dibujo', image: 'Imagen', video: 'Video', pdf: 'PDF', link: 'Enlace', local: d.kind === 'local' ? localNames[d.content.kind] + ' · copia local' : 'Copia local', reference: d.kind === 'reference' ? { document: 'Documento', file: 'Archivo', task: 'Tarea de Board', agent: 'Agente' }[d.ref.kind] : 'Referencia' }[d.kind]}</span></div></div>${selected && resize && !connect ? (isArrow(material) ? arrowHandles(material) : resizeHandles('node', material.id, d.kind === 'text')) : ''}${ports}${comment ? `<button type="button" data-action="material-comments" data-id="${material.id}" class="comment-marker" aria-label="Comentario de ${html(comment.author)}">${icon('bubble', 14)}<span class="comment-preview" role="tooltip"><strong>${html(comment.author)}</strong><span>${html(comment.text)}</span></span></button>` : ''}</article>`;
}
const materialKinds: Record<string, { label: string; icon: Parameters<typeof icon>[0] }> = {
  bars: { label: 'Gráficos', icon: 'canvas' },
  wireframe: { label: 'Bosquejos', icon: 'canvas' },
  text: { label: 'Textos', icon: 'text' },
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
export function assignedPreview(w: WorldSnapshot, n: Material): string {
  if (n.data.kind === 'bars')
    return `<div class="assigned-preview" data-assigned-id="${html(n.id)}">${barChartSvg(n.data)}</div>`;
  if (n.data.kind === 'link')
    return `<div class="assigned-preview assigned-link" data-assigned-id="${n.id}">${linkCardMarkup(n.data, n.id)}</div>`;
  const d = n.data,
    kind = d.kind === 'reference' ? d.ref.kind : d.kind === 'local' ? d.content.kind : d.kind,
    meta = materialKinds[kind] ?? materialKinds.note!;
  const text =
    d.kind === 'wireframe'
      ? wireframeText(d.content)
      : d.kind === 'local'
        ? localText(d.content)
        : d.kind === 'reference' && d.ref.fragment
          ? (referenceExcerpt(w, d.ref) ?? 'Fragmento no disponible. Revisá su origen.')
          : d.kind === 'note' || d.kind === 'text'
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
  return `<div class="assigned-preview" data-assigned-id="${n.id}"><strong>${icon(meta.icon, 13)}<span>${html(nodeTitle(w, n))}</span></strong>${d.kind === 'shape' ? shapeMarkup(n) : d.kind === 'drawing' ? drawingMarkup(n) : d.kind === 'image' || d.kind === 'video' ? `<${d.kind === 'image' ? 'img' : 'video'} data-asset="${d.asset}" ${d.kind === 'image' ? `alt="${html(d.title)}"` : `aria-label="${html(d.title)}"`}>${d.kind === 'video' ? '</video>' : ''}` : d.kind === 'pdf' && d.preview ? `<img src="${d.preview}" alt="${html(d.title)}">` : `<p>${html(text)}</p>`}</div>`;
}
function assignedMaterials(w: WorldSnapshot, nodes: Material[]): string {
  if (!nodes.length) return '';
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
  const empty = !zone.agent || !w.nodes.some((n) => n.owner === zone.agent);
  return `<div class="agent-zone ${selected ? 'selected' : ''}" data-zone="${zone.id}" tabindex="0" role="group" aria-label="Zona ${html(zone.name)}" ${empty ? `aria-description="${agent ? 'Arrastrá un material acá. El agente lo usará como contexto.' : 'Seleccioná esta zona para asignar un agente.'}"` : ''} style="left:${zone.x}px;top:${zone.y}px;width:${zone.width}px;height:${zone.height}px"><div class="zone-heading">${icon(agent ? 'agents' : 'zone', 14)}<span>${html(zone.name)}</span></div>${
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
  preview: readonly { id: string; point: Point }[] = [],
): string {
  const a = w.nodes.find((n) => n.id === link.from),
    b = w.nodes.find((n) => n.id === link.to);
  if (!a || !b || a.owner || b.owner) return '';
  const from = { ...a, ...preview.find((item) => item.id === a.id)?.point };
  const to = { ...b, ...preview.find((item) => item.id === b.id)?.point };
  const cable = cableGeometry(link, from, to),
    path = cable.path;
  const ends = (['from', 'to'] as const)
    .map((end) => {
      const point = cable[end];
      return `<g class="link-endpoint" transform="translate(${point.x},${point.y})" tabindex="0" role="button" aria-label="Reconectar ${end === 'from' ? 'origen' : 'destino'}" data-action="link-endpoint" data-id="${link.id}" data-end="${end}"><circle class="endpoint-hit"/><circle class="endpoint-dot"/></g>`;
    })
    .join('');
  const head = 'cable-tip-' + link.id;
  const direction = link.direction ?? 'none';
  const marker =
    direction === 'none'
      ? ''
      : `<marker id="${html(head)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><polygon points="0,1 10,5 0,9 2.5,5" fill="context-stroke" ${link.detail ? 'stroke="#253237" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke"' : ''}/></marker>`;
  const mask = link.label ? `mask="url(#mask-${link.id})"` : '';
  const outline = link.detail ? `<path class="leader-outline" d="${path}" ${mask}/>` : '';
  const tips =
    (direction === 'backward' || direction === 'both' ? `marker-start="url(#${html(head)})"` : '') +
    ' ' +
    (direction === 'forward' || direction === 'both' ? `marker-end="url(#${html(head)})"` : '');
  return `<g data-link="${link.id}" class="connection ${selected ? 'selected' : ''}" style="--cable-weight:${link.thickness ?? 0}px">${marker}${link.label ? `<mask id="mask-${link.id}" maskUnits="userSpaceOnUse" mask-type="luminance"><rect class="mask-base" fill="white"/><rect class="label-cut" fill="black"/></mask>` : ''}<path class="link-hit" tabindex="0" role="button" aria-label="${html(link.label ? 'Conexión: ' + link.label : 'Conexión sin etiqueta')}" aria-description="Doble clic o Enter para editar la etiqueta. Suprimir o Backspace para eliminar." aria-pressed="${selected}" data-action="select-link" data-id="${link.id}" d="${path}"/>${outline}<path class="link-line" ${tips} d="${path}" ${mask}/>${link.label ? `<text class="cable-label" text-anchor="middle" dominant-baseline="middle" data-action="select-link" data-id="${link.id}">${html(link.label)}</text>` : ''}${ends}</g>`;
}
