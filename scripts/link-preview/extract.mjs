import { getPreviewFromContent } from 'link-preview-js';
import { imageSize } from 'image-size';
import { publicUrl, fetchPublicResource } from './public-fetch.mjs';
import { extractReader } from './reader.mjs';
import { providerVideo } from './providers.mjs';
import { fileTypeFromBuffer } from 'file-type';

const text = (value, maximum) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maximum) : '';

/** La descarga está separada del parser MIT para acotar bytes y probar errores reales. */
export async function extractPreview(input, { resource = fetchPublicResource, signal } = {}) {
  const requested = publicUrl(input);
  const embed = providerVideo(requested.href);
  if (embed) {
    const result = { status: 'ready', checkedAt: Date.now(), resolvedUrl: requested.href, embed };
    try {
      const endpoint =
        embed.provider === 'youtube'
          ? 'https://www.youtube.com/oembed'
          : 'https://vimeo.com/api/oembed.json';
      const file = await resource(
        endpoint + '?format=json&url=' + encodeURIComponent(requested.href),
        64 * 1024,
        signal,
      );
      const data = JSON.parse(file.bytes.toString('utf8'));
      result.title = text(data.title, 512);
      result.siteName = embed.provider === 'youtube' ? 'YouTube' : 'Vimeo';
      if (typeof data.thumbnail_url === 'string') {
        const cover = await resource(publicUrl(data.thumbnail_url).href, 2 * 1024 * 1024, signal);
        const dimensions = imageSize(cover.bytes);
        const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[dimensions.type];
        if (mime && dimensions.width * dimensions.height <= 24000000)
          result.image = { mime, data: cover.bytes.toString('base64') };
      }
    } catch {
      result.problem = 'provider-metadata-unavailable';
    }
    return result;
  }
  const page = await resource(
    requested.href,
    (type) =>
      /^(text\/html|application\/xhtml\+xml)/i.test(type)
        ? 8 * 1024 * 1024
        : /^image\//i.test(type)
          ? 12 * 1024 * 1024
          : 32 * 1024 * 1024,
    signal,
  );
  const detected = await fileTypeFromBuffer(page.bytes).catch(() => undefined);
  if (
    detected &&
    [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ].includes(detected.mime)
  ) {
    const kind = detected.mime.startsWith('image/') ? 'image' : 'video';
    if (page.bytes.length > (kind === 'image' ? 12 : 32) * 1024 * 1024)
      throw new Error('Respuesta demasiado grande');
    if (kind === 'image') {
      const size = imageSize(page.bytes);
      if (!size.width || !size.height || size.width * size.height > 24000000)
        throw new Error('Imagen demasiado grande');
    }
    return {
      status: 'ready',
      checkedAt: Date.now(),
      resolvedUrl: page.url,
      file: { kind, mime: detected.mime, data: page.bytes.toString('base64') },
    };
  }
  if (!/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(page.contentType))
    return {
      status: 'unavailable',
      problem: 'not-html',
      checkedAt: Date.now(),
      resolvedUrl: page.url,
    };
  let documentCharset;
  const parse = (data) =>
    getPreviewFromContent(
      { url: page.url, headers: { 'content-type': page.contentType }, data },
      {
        onResponse(response, doc) {
          documentCharset =
            doc('meta[charset]').attr('charset') ??
            doc('meta[http-equiv="Content-Type" i]')
              .attr('content')
              ?.match(/charset\s*=\s*([^;\s]+)/i)?.[1];
          return response;
        },
      },
    );
  let metadata = await parse(new TextDecoder().decode(page.bytes));
  const charset = (metadata.charset || documentCharset)?.trim().replace(/^["']|["']$/g, '');
  if (charset && !/^utf-?8$/i.test(charset)) {
    let decoder;
    try {
      decoder = new TextDecoder(charset);
    } catch {
      /* Una etiqueta desconocida conserva UTF-8. */
    }
    if (decoder) metadata = await parse(decoder.decode(page.bytes));
  }
  const result = { status: 'ready', checkedAt: Date.now(), resolvedUrl: publicUrl(page.url).href };
  for (const [key, maximum] of [
    ['title', 512],
    ['description', 2048],
    ['siteName', 256],
  ]) {
    const value = text(metadata[key], maximum);
    if (value) result[key] = value;
  }
  const image = metadata.images?.[0];
  if (image) {
    try {
      const url = publicUrl(new URL(image, page.url).href);
      const file = await resource(url.href, 2 * 1024 * 1024, signal);
      const dimensions = imageSize(file.bytes);
      const mime = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
      }[dimensions.type];
      if (
        !mime ||
        !dimensions.width ||
        !dimensions.height ||
        dimensions.width < 32 ||
        dimensions.height < 32 ||
        dimensions.width > 8192 ||
        dimensions.height > 8192 ||
        dimensions.width * dimensions.height > 24000000
      )
        throw new Error('Portada no admitida');
      result.image = { mime, data: file.bytes.toString('base64') };
    } catch {
      result.problem = 'image-unavailable';
    }
  }
  if (!result.title && !result.description && !result.image) {
    result.status = 'unavailable';
    result.problem = 'no-metadata';
  }
  try {
    result.reader = await extractReader(
      new TextDecoder(charset || 'utf-8').decode(page.bytes),
      page.url,
      { resource, signal },
    );
  } catch {
    result.reader = { problem: 'not-readable' };
  }
  return result;
}
