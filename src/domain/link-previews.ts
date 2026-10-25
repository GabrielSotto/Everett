import type { LinkPreview } from './model';

/** Un fallo de actualización conserva los bytes de la última consulta disponible. */
export function retainLinkPreview(
  previous: LinkPreview | undefined,
  next: LinkPreview,
): LinkPreview {
  if (next.status === 'error') return { ...previous, ...next };
  return {
    ...next,
    ...(!next.imageAsset && next.problem === 'image-unavailable' && previous?.imageAsset
      ? { imageAsset: previous.imageAsset }
      : {}),
    ...(!next.readerAsset && previous?.readerAsset
      ? {
          readerAsset: previous.readerAsset,
          readerTitle: previous.readerTitle,
          readerText: previous.readerText,
        }
      : {}),
  };
}

export function linkUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.href.length <= 4096
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** La escritura de un dominio en el formulario equivale a su URL HTTPS. */
export function enteredLink(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  return (
    linkUrl(value) ??
    (/^(?:www\.)?[\p{L}\d-]+(?:\.[\p{L}\d-]+)+(?:[/:?#]|$)/u.test(value)
      ? linkUrl('https://' + value)
      : null)
  );
}

export function validLinkPreview(value: unknown): value is LinkPreview {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    ['loading', 'ready', 'unavailable', 'error'].includes(String(data.status)) &&
    typeof data.checkedAt === 'number' &&
    Number.isFinite(data.checkedAt) &&
    data.checkedAt >= 0 &&
    typeof data.resolvedUrl === 'string' &&
    linkUrl(data.resolvedUrl) !== null &&
    (
      Object.entries({
        title: 512,
        description: 2048,
        siteName: 256,
        imageAsset: 128,
        readerAsset: 128,
        readerTitle: 512,
        readerText: 2048,
        readerProblem: 80,
        problem: 80,
      }) as [string, number][]
    ).every(
      ([key, maximum]) =>
        data[key] === undefined || (typeof data[key] === 'string' && data[key].length <= maximum),
    ) &&
    (data.embed === undefined || validEmbed(data.embed))
  );
}

export function validEmbed(value: unknown): value is NonNullable<LinkPreview['embed']> {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    (d.provider === 'youtube'
      ? /^[\w-]{11}$/.test(d.id)
      : d.provider === 'vimeo' && /^\d{1,12}$/.test(d.id)) &&
    (d.hash === undefined || (typeof d.hash === 'string' && /^[a-f\d]{10}$/i.test(d.hash)))
  );
}

export function providerPlayer(embed: NonNullable<LinkPreview['embed']>): string {
  if (!validEmbed(embed)) throw new Error('Reproductor inválido');
  return embed.provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${embed.id}?enablejsapi=1&origin=${encodeURIComponent(location.origin)}`
    : `https://player.vimeo.com/video/${embed.id}${embed.hash ? '?h=' + embed.hash : ''}`;
}

export function previewMessage(preview: LinkPreview | undefined): string {
  if (!preview || preview.status === 'loading') return 'Preparando vista previa…';
  if (preview.status === 'ready')
    return preview.problem === 'image-unavailable' ? 'Portada no disponible' : '';
  if (preview.problem === 'service-unavailable')
    return 'Abrí Everett con el servicio local para generar la vista previa.';
  if (preview.problem === 'no-metadata')
    return 'El sitio no publicó información para una vista previa.';
  if (preview.problem === 'not-html')
    return 'Este enlace no apunta a una página web con metadatos.';
  if (preview.problem === 'invalid-url')
    return 'No se puede obtener una vista previa de este destino.';
  if (preview.problem === 'storage-failed')
    return 'No se pudo conservar la portada. Podés reintentar.';
  if (preview.problem === 'busy') return 'La vista previa está ocupada. Podés reintentar.';
  if (preview.problem === 'too-large')
    return 'El contenido supera el límite de descarga. El enlace se conserva.';
  if (preview.problem === 'unsupported-media')
    return 'Este formato no se puede reproducir en el navegador. El enlace se conserva.';
  return 'No se pudo obtener la vista previa. Podés abrir el enlace o reintentar.';
}
