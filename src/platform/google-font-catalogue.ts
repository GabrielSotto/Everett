import { validFontWeight, validGoogleFamily } from '../domain/note-fonts';

export type GoogleFontFamily = {
  family: string;
  category: string;
  weights: number[];
  italic?: boolean;
};

const messages = {
  'not-configured':
    'El catálogo necesita una clave de Google Fonts. Podés escribir el nombre exacto de una fuente y pulsar Enter.',
  configuration:
    'Everett no pudo leer la configuración de Google Fonts. Revisá la configuración del servicio y reintentá.',
  credentials:
    'Google rechazó la clave del catálogo. Revisá la clave configurada en Everett y reintentá.',
  'api-disabled':
    'La API de Google Fonts está deshabilitada. Habilitá Web Fonts Developer API en Google Cloud y reintentá.',
  'access-denied':
    'Google no autorizó el acceso al catálogo. Revisá los permisos y las restricciones de la clave en Google Cloud.',
  'invalid-request':
    'Google no aceptó la consulta del catálogo enviada por Everett. Es necesario revisar la integración.',
  forbidden:
    'El servicio de fuentes rechazó esta solicitud de Everett. Revisá la dirección desde la que abriste la aplicación.',
  quota:
    'Google Fonts alcanzó el límite de consultas del proyecto. Reintentá más tarde o revisá la cuota en Google Cloud.',
  timeout:
    'Google Fonts tardó demasiado en responder al servicio de Everett. Reintentá en unos momentos.',
  network:
    'El servicio de Everett no pudo conectarse con Google Fonts. Revisá la conexión a Internet y reintentá.',
  unavailable: 'Google Fonts no está disponible en este momento. Reintentá más tarde.',
  'invalid-response':
    'El catálogo recibido no tiene un formato válido. Reintentá; si vuelve a pasar, hay que revisar el servicio de fuentes.',
  'service-unreachable':
    'No se pudo conectar con el servicio de fuentes de Everett. Comprobá que el servidor esté en marcha y reintentá.',
  'service-timeout':
    'El servicio de fuentes de Everett tardó demasiado en responder. Reintentá en unos momentos.',
  'service-unavailable':
    'El servicio de fuentes de Everett no está disponible. Reintentá en unos momentos.',
  'unexpected-response':
    'El servicio de fuentes devolvió un error que Everett no reconoce. Reintentá; si persiste, hay que revisar el servicio.',
};
export type FontCatalogueFailure = keyof typeof messages;

export class FontCatalogueError extends Error {
  constructor(
    public readonly code: FontCatalogueFailure,
    public readonly status?: number,
  ) {
    super(messages[code]);
    this.name = 'FontCatalogueError';
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export async function fetchGoogleFontCatalogue(signal: AbortSignal): Promise<GoogleFontFamily[]> {
  const timeout = AbortSignal.timeout(12_000);
  try {
    const response = await fetch('/api/google-fonts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.any([signal, timeout]),
    });
    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw new FontCatalogueError(
        response.status >= 500 ? 'service-unavailable' : 'invalid-response',
        response.status,
      );
    }
    signal.throwIfAborted();
    if (!response.ok) {
      const code = record(data) ? data.error : undefined;
      throw new FontCatalogueError(
        typeof code === 'string' && Object.hasOwn(messages, code)
          ? (code as FontCatalogueFailure)
          : 'unexpected-response',
        response.status,
      );
    }
    if (
      !record(data) ||
      !Array.isArray(data.families) ||
      !data.families.length ||
      data.families.length > 20_000
    )
      throw new FontCatalogueError('invalid-response', response.status);
    // Un catálogo parcial silencioso no debe presentarse como el catálogo completo.
    if (
      !data.families.every(
        (item): item is GoogleFontFamily =>
          record(item) &&
          validGoogleFamily(item.family) &&
          typeof item.category === 'string' &&
          Array.isArray(item.weights) &&
          item.weights.length > 0 &&
          item.weights.every(validFontWeight) &&
          (item.italic === undefined || typeof item.italic === 'boolean'),
      )
    )
      throw new FontCatalogueError('invalid-response', response.status);
    return data.families;
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (error instanceof FontCatalogueError) throw error;
    throw new FontCatalogueError(
      timeout.aborted || (error instanceof DOMException && error.name === 'TimeoutError')
        ? 'service-timeout'
        : 'service-unreachable',
    );
  }
}
