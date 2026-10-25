import type { NodeData } from '../../domain/model';
import { previewMessage } from '../../domain/link-previews';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';

export function linkCardMarkup(
  data: Extract<NodeData, { kind: 'link' }>,
  id: string,
  interactive = true,
): string {
  const meta = data.metadata,
    address = new URL(data.url);
  const image = meta?.imageAsset
    ? `<img data-asset="${html(meta.imageAsset)}" alt="Portada de ${html(meta.title || data.title)}" draggable="false">`
    : data.preview
      ? `<img src="${html(data.preview)}" alt="Portada del enlace" draggable="false">`
      : '';
  const message = previewMessage(meta);
  const retry =
    interactive && meta && meta.status !== 'loading'
      ? `<button type="button" data-action="link-preview-retry" data-id="${html(id)}" aria-label="${meta.status === 'ready' && !meta.problem ? 'Actualizar' : 'Reintentar'} vista previa">${icon('restore', 12)}</button>`
      : '';
  return `<div class="link-card ${image ? 'with-cover' : ''}" data-preview-status="${meta?.status ?? 'loading'}">${image}<div class="link-card-content">${meta?.title ? `<strong>${html(meta.title)}</strong>` : ''}${meta?.description || data.description ? `<p>${html(meta?.description || data.description || '')}</p>` : ''}<span class="link-card-address">${icon('link', 14)}<span>${html(address.hostname + address.pathname)}</span></span>${message ? `<span class="link-preview-status" role="status">${html(message)}</span>` : ''}${retry}</div></div>`;
}
