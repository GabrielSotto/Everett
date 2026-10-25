import { getPreviewFromContent } from 'link-preview-js';
import { imageSize } from 'image-size';
import { publicUrl, fetchPublicResource } from './public-fetch.mjs';

const text = (value, maximum) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maximum) : '';

/** La descarga está separada del parser MIT para acotar bytes y probar errores reales. */
export async function extractPreview(input, { resource = fetchPublicResource, signal } = {}) {
  const requested = publicUrl(input);
  const page = await resource(requested.href, 1024 * 1024, signal);
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
  return result;
}
