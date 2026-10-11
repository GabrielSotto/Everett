import type { Context } from '../../app/context';
import type { Assignment } from '../../domain/model';
import type { DeepReadonly } from '../../domain/readonly';
import { html } from '../../ui/dom';
export function proposalMarkup(
  ctx: Context,
  job: DeepReadonly<Assignment>,
  expanded: boolean,
): string {
  if (job.phase === 'interrupted')
    return `<article class="proposal" data-proposal="${job.id}" style="left:${job.position.x}px;top:${job.position.y}px"><p>Interrumpido</p><p>${html(job.instruction)}</p><div class="proposal-actions"><button type="button" data-action="assignment-retry" data-id="${job.id}">Reintentar</button><button type="button" data-action="assignment-cancel" data-id="${job.id}">Cancelar</button></div></article>`;
  const material = ctx.world().nodes.find((n) => n.id === job.node);
  const suggestions =
    material?.data.kind === 'image' || material?.data.kind === 'video'
      ? ['Describir contenido', 'Más concreto', 'Más detalle', 'Otro enfoque']
      : ['Más breve', 'Más concreto', 'Más detalle', 'Otro enfoque'];
  return `<article class="proposal" data-proposal="${job.id}" style="left:${job.position.x}px;top:${job.position.y}px"><span class="proposal-status">Propuesta · pendiente de aceptación</span><p>${html(job.text)}</p><div class="proposal-decision ${expanded ? 'expanded' : ''}"><div class="proposal-actions"><button type="button" aria-label="Aceptar propuesta" data-action="assignment-accept" data-id="${job.id}">Aceptar</button><button type="button" data-action="assignment-revise" data-id="${job.id}" aria-expanded="${expanded}">Pedir cambios</button><button type="button" aria-label="Rechazar propuesta" data-action="assignment-reject" data-id="${job.id}">Rechazar</button></div>${expanded ? `<form data-revision="${job.id}"><textarea aria-label="Cambios solicitados" placeholder="¿Qué ajustamos?" rows="3">${html(ctx.ui.revisionDrafts[job.id] ?? '')}</textarea><div class="revision-suggestions">${suggestions.map((text) => `<button type="button" data-action="revision-chip" data-id="${job.id}" data-text="${text}">${text}</button>`).join('')}</div><div class="revision-buttons"><button type="button" data-action="revision-cancel" aria-label="Cancelar pedido de cambios">Cancelar</button><button type="submit" class="primary" aria-label="Enviar cambios">Enviar</button></div></form>` : ''}</div></article>`;
}
