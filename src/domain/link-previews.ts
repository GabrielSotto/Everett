import type { LinkPreview } from './model';

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
        problem: 80,
      }) as [string, number][]
    ).every(
      ([key, maximum]) =>
        data[key] === undefined || (typeof data[key] === 'string' && data[key].length <= maximum),
    )
  );
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
  return 'No se pudo obtener la vista previa. Podés abrir el enlace o reintentar.';
}
