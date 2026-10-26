// El paquete 4.6.2 omite polyfills.js en las declaraciones dist/src. El bundle
// ESM sí lo incluye; usar sus contratos públicos sin silenciar checks globales.
declare module '@panzoom/panzoom/dist/panzoom.es.js' {
  import type { PanzoomGlobalOptions, PanzoomObject } from '@panzoom/panzoom/dist/src/types';
  export type { PanzoomObject } from '@panzoom/panzoom/dist/src/types';
  export default function Panzoom(
    element: HTMLElement | SVGElement,
    options?: PanzoomGlobalOptions,
  ): PanzoomObject;
}
