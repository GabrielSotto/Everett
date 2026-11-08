import { googleFontUrl, validGoogleFamily } from '../domain/note-fonts';

export type GoogleFontFailure =
  'invalid-name' | 'not-found' | 'network' | 'timeout' | 'unavailable' | 'invalid-response';
export class GoogleFontError extends Error {
  constructor(public readonly code: GoogleFontFailure) {
    super(
      {
        'invalid-name': 'Escribí el nombre de la fuente, por ejemplo Lora.',
        'not-found': 'Google Fonts no encontró esa familia. Revisá su nombre.',
        network: 'No se pudo conectar con Google Fonts. Revisá la conexión y reintentá.',
        timeout: 'Google Fonts tardó demasiado en responder. Reintentá.',
        unavailable: 'Google Fonts no está disponible en este momento. Reintentá.',
        'invalid-response': 'No se pudo cargar esta fuente desde Google Fonts. Probá otra familia.',
      }[code],
    );
    this.name = 'GoogleFontError';
  }
}

// Solo referencias en memoria de esta página. No guardamos CSS ni archivos de fuentes.
const requests = new Map<string, Promise<void>>();
const failures = new Set<string>();

export function loadGoogleFont(family: string, retry = false): Promise<void> {
  if (!validGoogleFamily(family)) return Promise.reject(new GoogleFontError('invalid-name'));
  if (retry && failures.delete(family)) requests.delete(family);
  const existing = requests.get(family);
  if (existing) return existing;
  const request = fetchFont(family).catch((error: unknown) => {
    failures.add(family);
    throw error;
  });
  requests.set(family, request);
  return request;
}

async function fetchFont(family: string): Promise<void> {
  const controller = new AbortController(),
    faces: FontFace[] = [];
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(googleFontUrl(family), {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok)
      throw new GoogleFontError(
        response.status === 400 || response.status === 404 ? 'not-found' : 'unavailable',
      );
    const css = await response.text();
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSFontFaceRule)) throw new GoogleFontError('invalid-response');
      const source = rule.style.getPropertyValue('src');
      const urls = [...source.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
      if (
        !urls.length ||
        urls.some((match) => {
          let url: URL;
          try {
            url = new URL(match[1]!);
          } catch {
            return true;
          }
          return (
            url.protocol !== 'https:' || url.hostname !== 'fonts.gstatic.com' || url.port !== ''
          );
        })
      )
        throw new GoogleFontError('invalid-response');
      const face = new FontFace(family, source, {
        style: rule.style.getPropertyValue('font-style') || 'normal',
        weight: rule.style.getPropertyValue('font-weight') || '400',
        unicodeRange: rule.style.getPropertyValue('unicode-range') || 'U+0-10FFFF',
        display: 'swap',
      });
      faces.push(face);
      document.fonts.add(face);
    }
    if (!faces.length) throw new GoogleFontError('invalid-response');
    // Una muestra fija comprueba los archivos reales sin enviar el contenido privado de la nota.
    const loaded = await Promise.race([
      document.fonts
        .load(`16px "${family}"`, 'Una idea, un árbol. 0123456789')
        .then(async (loaded) => (loaded.length ? loaded : [await faces[0]!.load()])),
      new Promise<never>((_, reject) => {
        if (controller.signal.aborted) reject(new GoogleFontError('timeout'));
        else
          controller.signal.addEventListener(
            'abort',
            () => reject(new GoogleFontError('timeout')),
            { once: true },
          );
      }),
    ]);
    if (!loaded.length) throw new GoogleFontError('invalid-response');
  } catch (error) {
    for (const face of faces) document.fonts.delete(face);
    throw error instanceof GoogleFontError
      ? error
      : new GoogleFontError(controller.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
}
