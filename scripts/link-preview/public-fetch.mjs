import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { Agent, fetch } from 'undici';

export function publicAddress(address) {
  try {
    return ipaddr.process(address).range() === 'unicast';
  } catch {
    return false;
  }
}

export function publicUrl(input) {
  const url = new URL(input);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    input.length > 4096 ||
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    (ipaddr.isValid(host) && !publicAddress(host))
  )
    throw new Error('Destino no permitido');
  url.hash = '';
  return url;
}

export async function publicLookup(hostname, resolver = lookup) {
  const records = await resolver(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => !publicAddress(record.address)))
    throw new Error('El destino no es una dirección pública');
  return records.find((record) => record.family === 4) ?? records[0];
}

export async function limitedBody(response, maximum) {
  if (Number(response.headers.get('content-length') ?? 0) > maximum) {
    await response.body?.cancel();
    throw new Error('Respuesta demasiado grande');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Respuesta vacía');
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new Error('Respuesta demasiado grande');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks, size);
}

/** Undici conserva TLS/SNI; el lookup fija la conexión a una IP pública validada. */
export async function fetchPublicResource(input, maximum, signal, transport = fetch) {
  const agent = new Agent({
    connect: {
      lookup(hostname, options, callback) {
        publicLookup(hostname).then(
          (record) => {
            if (options.all) callback(null, [record]);
            else callback(null, record.address, record.family);
          },
          (error) => callback(error),
        );
      },
    },
  });
  const timeout = AbortSignal.timeout(8000);
  const abort = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    let url = publicUrl(input);
    for (let hop = 0; hop <= 5; hop++) {
      const response = await transport(url, {
        dispatcher: agent,
        redirect: 'manual',
        signal: abort,
        headers: {
          'User-Agent': 'Everett-LinkPreview/0.8',
          Accept: 'text/html,application/xhtml+xml,image/*;q=0.8',
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location || hop === 5) throw new Error('Redirección no disponible');
        const next = publicUrl(new URL(location, url).href);
        if (url.protocol === 'https:' && next.protocol !== 'https:')
          throw new Error('Redirección no permitida');
        url = next;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('El sitio no está disponible');
      }
      const bytes = await limitedBody(response, maximum);
      return { url: url.href, contentType: response.headers.get('content-type') ?? '', bytes };
    }
    throw new Error('Demasiadas redirecciones');
  } finally {
    await agent.close();
  }
}
