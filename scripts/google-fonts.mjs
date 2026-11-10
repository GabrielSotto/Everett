function weightsOf(variants, italic = false) {
  const weights = variants.flatMap((variant) => {
    if (typeof variant !== 'string') return [];
    if (italic) {
      if (!variant.endsWith('italic')) return [];
      variant = variant.slice(0, -6) || 'regular';
    }
    if (variant === 'regular') return [400];
    const weight = Number(variant);
    return /^\d{1,4}$/.test(variant) && weight >= 1 && weight <= 1000 ? [weight] : [];
  });
  return [...new Set(weights)].sort((a, b) => a - b);
}
// Google comparte HTTP 403 entre cuota, permisos y API deshabilitada. El motivo
// estructurado distingue esos casos; nunca reenviamos mensajes ni metadatos privados.
const providerReasons = {
  dailyLimitExceeded: 'quota',
  quotaExceeded: 'quota',
  rateLimitExceeded: 'quota',
  userRateLimitExceeded: 'quota',
  dailyLimitExceededUnreg: 'quota',
  RATE_LIMIT_EXCEEDED: 'quota',
  QUOTA_EXCEEDED: 'quota',
  SERVICE_DISABLED: 'api-disabled',
  API_KEY_INVALID: 'credentials',
  API_KEY_EXPIRED: 'credentials',
  keyInvalid: 'credentials',
  API_KEY_SERVICE_BLOCKED: 'access-denied',
  API_KEY_HTTP_REFERRER_BLOCKED: 'access-denied',
  API_KEY_IP_ADDRESS_BLOCKED: 'access-denied',
  API_KEY_ANDROID_APP_BLOCKED: 'access-denied',
  API_KEY_IOS_APP_BLOCKED: 'access-denied',
  accessNotConfigured: 'access-denied',
};
function providerFailure(status, data) {
  const error = data?.error;
  const reasons = [
    ...(Array.isArray(error?.details)
      ? error.details
          .filter(
            (detail) =>
              detail?.['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo' &&
              detail.domain === 'googleapis.com',
          )
          .map((detail) => detail.reason)
      : []),
    ...(Array.isArray(error?.errors) ? error.errors.map((item) => item?.reason) : []),
  ];
  const reason = reasons.find(
    (value) => typeof value === 'string' && Object.hasOwn(providerReasons, value),
  );
  const code = reason
    ? providerReasons[reason]
    : status === 429 || error?.status === 'RESOURCE_EXHAUSTED'
      ? 'quota'
      : status === 401
        ? 'credentials'
        : status === 403
          ? 'access-denied'
          : status === 400
            ? 'invalid-request'
            : 'unavailable';
  return {
    status: code === 'quota' ? 429 : 502,
    error: code,
    providerStatus: status,
    ...(reason ? { providerReason: reason } : {}),
  };
}
/** Catálogo remoto: no descarga ni conserva archivos de tipografías. */
export function googleFontsEndpoint({ getKey, request = fetch, timeoutMs = 10_000 }) {
  let cached, pending;
  const lifetime = new AbortController();
  const json = (response, status, value) =>
    response
      .writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .end(JSON.stringify(value));
  async function catalogue(key) {
    const timeout = AbortSignal.timeout(timeoutMs);
    try {
      const url = new URL('https://www.googleapis.com/webfonts/v1/webfonts');
      url.search = new URLSearchParams({
        key,
        sort: 'popularity',
        fields: 'items(family,category,variants)',
      });
      const response = await request(url, {
        signal: AbortSignal.any([timeout, lifetime.signal]),
        redirect: 'error',
      });
      let data;
      try {
        data = await response.json();
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        if (response.ok) return { status: 502, error: 'invalid-response' };
        // Una página de error no JSON conserva su estado HTTP; no es un corte de red.
      }
      if (!response.ok) return providerFailure(response.status, data);
      if (!Array.isArray(data?.items) || !data.items.length || data.items.length > 20_000)
        return { status: 502, error: 'invalid-response' };
      const families = data.items.filter(
        (item) =>
          item !== null &&
          typeof item === 'object' &&
          typeof item.family === 'string' &&
          /^[A-Za-z0-9][A-Za-z0-9 -]{0,99}$/.test(item.family) &&
          typeof item.category === 'string' &&
          Array.isArray(item.variants),
      );
      if (families.length !== data.items.length) return { status: 502, error: 'invalid-response' };
      const value = {
        families: families.map(({ family, category, variants }) => {
          const upright = weightsOf(variants);
          const italic = upright.length === 0;
          return {
            family,
            category,
            weights: italic ? weightsOf(variants, true) : upright,
            italic,
          };
        }),
      };
      if (value.families.some((family) => !family.weights.length))
        return { status: 502, error: 'invalid-response' };
      cached = { value, until: Date.now() + 3600_000 };
      return { status: 200, ...value };
    } catch {
      return { status: 502, error: timeout.aborted ? 'timeout' : 'network' };
    }
  }
  return {
    close() {
      lifetime.abort();
      cached = undefined;
    },
    async handle(req, res, port) {
      if (
        req.method !== 'POST' ||
        req.headers.origin !== `http://127.0.0.1:${port}` ||
        req.headers.host !== `127.0.0.1:${port}` ||
        req.headers['content-type']?.split(';')[0] !== 'application/json'
      ) {
        json(res, 403, { error: 'forbidden' });
        return;
      }
      try {
        const key = (await getKey())?.trim();
        if (!key) {
          json(res, 503, { error: 'not-configured' });
          return;
        }
        if (cached && cached.until > Date.now()) {
          json(res, 200, cached.value);
          return;
        }
        pending ??= catalogue(key).finally(() => {
          pending = undefined;
        });
        const { status, ...result } = await pending;
        json(res, status, result);
      } catch {
        json(res, 503, { error: 'configuration' });
      }
    },
  };
}
