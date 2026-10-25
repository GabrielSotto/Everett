import { JSDOM } from 'jsdom';
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import createDOMPurify from 'dompurify';
import { publicUrl } from './public-fetch.mjs';

const tags = [
  'article',
  'section',
  'div',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'strong',
  'em',
  'b',
  'i',
  's',
  'del',
  'sup',
  'sub',
  'br',
  'hr',
  'a',
  'img',
  'figure',
  'figcaption',
  'span',
  'dl',
  'dt',
  'dd',
  'details',
  'summary',
];

/** Readability selecciona el contenido; DOMPurify elimina capacidades ejecutables. */
export async function extractReader(source, url, { resource, signal } = {}) {
  const dom = new JSDOM(source, { url });
  try {
    // Los enlaces de anclaje de encabezados suelen depender de una fuente de iconos del sitio.
    dom.window.document
      .querySelectorAll('a.headerlink,[aria-hidden="true"]')
      .forEach((element) => element.remove());
    if (!isProbablyReaderable(dom.window.document)) return { problem: 'not-article' };
    const result = new Readability(dom.window.document, { maxElemsToParse: 100000 }).parse();
    if (!result || result.textContent.trim().length < 180) return { problem: 'not-readable' };
    if (result.content.length > 512 * 1024) return { problem: 'reader-too-large' };
    const clean = createDOMPurify(dom.window).sanitize(result.content, {
      ALLOWED_TAGS: tags,
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'id', 'colspan', 'rowspan', 'start', 'lang'],
      ALLOW_DATA_ATTR: false,
    });
    const host = dom.window.document.createElement('article');
    host.innerHTML = clean;
    for (const anchor of host.querySelectorAll('a')) {
      try {
        anchor.setAttribute(
          'href',
          publicUrl(new URL(anchor.getAttribute('href'), url).href).href +
            new URL(anchor.getAttribute('href'), url).hash,
        );
      } catch {
        anchor.removeAttribute('href');
      }
    }
    // Las ilustraciones conservadas son bytes locales; el lector no dispara tracking remoto.
    let total = 0,
      count = 0;
    for (const image of host.querySelectorAll('img')) {
      try {
        if (!resource || count++ >= 6) throw new Error('Ilustración fuera del límite');
        const address = publicUrl(new URL(image.getAttribute('src'), url).href).href;
        const file = await resource(address, 512 * 1024, signal);
        const { imageSize } = await import('image-size');
        const dimensions = imageSize(file.bytes);
        const mime = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }[
          dimensions.type
        ];
        total += file.bytes.length;
        if (!mime || dimensions.width * dimensions.height > 24000000 || total > 1536 * 1024)
          throw new Error('Ilustración demasiado grande');
        image.setAttribute('src', `data:${mime};base64,${file.bytes.toString('base64')}`);
      } catch {
        image.replaceWith(
          dom.window.document.createTextNode(
            image.getAttribute('alt') || 'Ilustración no disponible',
          ),
        );
      }
    }
    return {
      html: host.innerHTML,
      title: result.title.slice(0, 512),
      byline: result.byline?.slice(0, 256) || '',
      text: result.textContent.replace(/\s+/g, ' ').trim().slice(0, 2048),
      capturedAt: Date.now(),
    };
  } finally {
    dom.window.close();
  }
}
