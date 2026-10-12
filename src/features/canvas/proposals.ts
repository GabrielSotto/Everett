import type { Context } from '../../app/context';
import { nodeTitle, type Assignment, type World, type ProposalMaterial } from '../../domain/model';
import type { DeepReadonly } from '../../domain/readonly';
import { proposalMaterials, proposalSummary } from '../../domain/proposal-materials';
import { materialMarkup } from './materials';
import { html } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';

function previewMarkup(ctx: Context, draft: DeepReadonly<ProposalMaterial>): string {
  const world = structuredClone(ctx.world()) as World;
  if (draft.document)
    world.docs = world.docs.map((doc) =>
      doc.id === draft.document!.id ? { ...doc, body: draft.document!.body } : doc,
    );
  return materialMarkup(
    world,
    { ...(structuredClone(draft.material) as ProposalMaterial['material']), x: 0, y: 0 },
    false,
    false,
    false,
  )
    .replace('data-node=', 'data-proposed-node=')
    .replace('style="', `style="--proposal-ratio:${draft.material.width / draft.material.height};`)
    .replace(/<div class="material-identification">.*?<\/div>/, '')
    .replace(/<button[^>]*class="video-play"[^>]*>.*?<\/button>/, '')
    .replace(/<button[^>]*class="comment-marker"[^>]*>.*?<\/button>/, '');
}
export function proposalMarkup(
  ctx: Context,
  job: DeepReadonly<Assignment>,
  expanded: boolean,
  reviewing = false,
): string {
  const material = ctx.world().nodes.find((n) => n.id === job.node);
  const close = reviewing
    ? btn('proposal-close', 'close', 'Cerrar revisión de propuesta', `data-id="${job.id}"`)
    : '';
  if (job.phase === 'interrupted')
    return `<article class="proposal" data-proposal="${job.id}" style="left:${job.position.x}px;top:${job.position.y}px"><div class="proposal-heading"><span class="proposal-status">Interrumpido</span>${close}</div><p>${html(job.instruction)}</p><div class="proposal-decision"><div class="proposal-actions"><button type="button" data-action="assignment-retry" data-id="${job.id}">Reintentar</button><button type="button" data-action="assignment-cancel" data-id="${job.id}">Cancelar</button></div></div></article>`;
  const output = job.output ?? proposalMaterials(ctx.world(), job, true);
  const suggestions =
    material?.data.kind === 'image' ||
    material?.data.kind === 'video' ||
    material?.data.kind === 'pdf'
      ? ['Conservar archivo', 'Más concreto', 'Más detalle', 'Otro enfoque']
      : ['Más breve', 'Más concreto', 'Más detalle', 'Otro enfoque'];
  return `<article class="proposal ${expanded ? 'revision-open' : ''}" data-proposal="${job.id}" style="--proposal-width:${output.length > 1 ? 560 : 320}px;left:${job.position.x}px;top:${job.position.y}px"><div class="proposal-heading"><span class="proposal-status">${icon('agents', 14)} Propuesta · pendiente de aceptación</span>${close}</div><div class="proposal-context" tabindex="0" title="${html(material ? nodeTitle(ctx.world(), material) : 'Material no disponible')} · ${html(job.instruction)}"><span>Para: ${html(material ? nodeTitle(ctx.world(), material) : 'Material no disponible')}</span><span>Instrucción: ${html(job.instruction || 'Organizar el material')}</span></div><h4 class="proposal-result-label">Resultado propuesto · revisión ${job.revision} · ${output.length} ${output.length === 1 ? 'material' : 'materiales'}</h4><div class="proposal-preview" role="region" aria-label="Contenido de la propuesta" tabindex="0">${output.map((draft) => previewMarkup(ctx, draft)).join('')}</div><div class="proposal-decision ${expanded ? 'expanded' : ''}"><p class="proposal-summary">Simulación local · ${html(proposalSummary(ctx.world(), job))}</p><div class="proposal-actions"><button type="button" aria-label="Aceptar propuesta" data-action="assignment-accept" data-id="${job.id}">${icon('check', 14)}Aceptar</button><button type="button" data-action="assignment-revise" data-id="${job.id}" aria-expanded="${expanded}" aria-pressed="${expanded}">${icon('draw', 14)}Pedir cambios</button><button type="button" aria-label="Rechazar propuesta" data-action="assignment-reject" data-id="${job.id}">${icon('close', 14)}Rechazar</button></div>${expanded ? `<form data-revision="${job.id}"><textarea aria-label="Cambios solicitados" placeholder="¿Qué ajustamos?" rows="3">${html(ctx.ui.revisionDrafts[job.id] ?? '')}</textarea><div class="revision-suggestions">${suggestions.map((text) => `<button type="button" title="${html(text)}" data-action="revision-chip" data-id="${job.id}" data-text="${text}">${text}</button>`).join('')}</div><div class="revision-buttons"><button type="button" data-action="revision-cancel" aria-label="Cancelar pedido de cambios">Cancelar</button><button type="submit" class="primary" aria-label="Enviar cambios">Enviar</button></div></form>` : ''}</div></article>`;
}
