import type { Context } from '../../app/context';
import { nodeTitle } from '../../domain/model';
import type { Assignment } from '../../domain/model';
import type { DeepReadonly } from '../../domain/readonly';
import { html } from '../../ui/dom';
import { btn } from '../../ui/icons';
export function proposalMarkup(
  ctx: Context,
  job: DeepReadonly<Assignment>,
  expanded: boolean,
  reviewing = false,
): string {
  if (job.phase === 'interrupted')
    return `<article class="proposal" data-proposal="${job.id}" style="left:${job.position.x}px;top:${job.position.y}px"><div class="proposal-heading"><span class="proposal-status">Interrumpido</span>${reviewing ? btn('proposal-close', 'close', 'Cerrar revisión de propuesta', `data-id="${job.id}"`) : ''}</div><p>${html(job.instruction)}</p><div class="proposal-actions"><button type="button" data-action="assignment-retry" data-id="${job.id}">Reintentar</button><button type="button" data-action="assignment-cancel" data-id="${job.id}">Cancelar</button></div></article>`;
  const material = ctx.world().nodes.find((n) => n.id === job.node);
  const suggestions =
    material?.data.kind === 'image' || material?.data.kind === 'video'
      ? ['Describir contenido', 'Más concreto', 'Más detalle', 'Otro enfoque']
      : ['Más breve', 'Más concreto', 'Más detalle', 'Otro enfoque'];
  return `<article class="proposal" data-proposal="${job.id}" style="left:${job.position.x}px;top:${job.position.y}px"><div class="proposal-heading"><span class="proposal-status">Propuesta · pendiente de aceptación</span>${reviewing ? btn('proposal-close', 'close', 'Cerrar revisión de propuesta', `data-id="${job.id}"`) : ''}</div><div class="proposal-context" tabindex="0" aria-label="Material: ${html(material ? nodeTitle(ctx.world(), material) : 'Material no disponible')}. Instrucción: ${html(job.instruction || 'Organizar el material')}" title="${html(material ? nodeTitle(ctx.world(), material) : 'Material no disponible')} · ${html(job.instruction || 'Organizar el material')}"><span title="${html(material ? nodeTitle(ctx.world(), material) : 'Material no disponible')}">Para: ${html(material ? nodeTitle(ctx.world(), material) : 'Material no disponible')}</span><span title="${html(job.instruction)}">Instrucción: ${html(job.instruction || 'Organizar el material')}</span></div><h4 class="proposal-result-label">Resultado propuesto · revisión ${job.revision}</h4><p tabindex="0" role="region" aria-label="Contenido de la propuesta">${html(job.text)}</p><div class="proposal-decision ${expanded ? 'expanded' : ''}"><div class="proposal-actions"><button type="button" aria-label="Aceptar propuesta" data-action="assignment-accept" data-id="${job.id}">Aceptar</button><button type="button" data-action="assignment-revise" data-id="${job.id}" aria-expanded="${expanded}" aria-pressed="${expanded}">Pedir cambios</button><button type="button" aria-label="Rechazar propuesta" data-action="assignment-reject" data-id="${job.id}">Rechazar</button></div>${expanded ? `<form data-revision="${job.id}"><textarea aria-label="Cambios solicitados" placeholder="¿Qué ajustamos?" rows="3">${html(ctx.ui.revisionDrafts[job.id] ?? '')}</textarea><div class="revision-suggestions">${suggestions.map((text) => `<button type="button" data-action="revision-chip" data-id="${job.id}" data-text="${text}">${text}</button>`).join('')}</div><div class="revision-buttons"><button type="button" data-action="revision-cancel" aria-label="Cancelar pedido de cambios">Cancelar</button><button type="submit" class="primary" aria-label="Enviar cambios">Enviar</button></div></form>` : ''}</div></article>`;
}
