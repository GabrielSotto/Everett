import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';

export function mediaToolbar(title: string, source?: string): string {
  return `<header class="media-toolbar"><button type="button" class="media-back icon-button" data-media-back aria-label="Volver" title="Volver">${icon('chevron-left', 18)}</button><h1>${html(title)}</h1>${source ? `<a class="icon-button media-original" href="${html(source)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir original" title="Abrir original">${icon('arrow', 18)}</a>` : ''}</header>`;
}
