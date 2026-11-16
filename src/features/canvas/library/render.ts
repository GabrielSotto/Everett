import { renderSample, type LibraryEntry } from '../../../../design/wireframe-library/samples.js';
import chalk from '../../../../design/wireframe-library/vendor/chalk.css?raw';
import catalogue from '../../../../design/wireframe-library/catalogue.css?raw';
import { librarySymbol } from './symbols';
import { isSymbolVariant } from '../../../domain/sketch-symbols';

const libraryStyles = [chalk, catalogue]
  .join('\n')
  .replaceAll(':root', ':host')
  .replace(/(?<![\w-])body(?![\w-])/g, '.library-body')
  .replace(/([\d.]+)rem\b/g, (_, n: string) => Number(n) * 16 + 'px');
export interface LibraryChoice {
  entry: LibraryEntry;
  variant: string;
  state: string | string[];
  options: Record<string, string>;
  width: number;
  labels: boolean;
}
/** Shadow DOM aísla los estilos del catálogo de la interfaz de Everett. */
export async function renderLibrary(
  host: HTMLElement,
  choice: LibraryChoice,
): Promise<HTMLElement> {
  const css = libraryStyles;
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  const template = document.createElement('template');
  template.innerHTML = `<style>${css}\n:host{display:block;font-size:16px;} .library-body{padding:0;margin:0;background:transparent;} .sample{padding:0!important;border:0!important;min-height:0!important;overflow:visible!important;background:transparent!important;display:block!important;} .specimen{margin:0!important;} *,*::before,*::after{animation:none!important;transition:none!important;}</style><div class="library-body ${choice.labels ? 'labels' : ''}"><div class="sample">${renderSample(choice.entry, choice.state, 'demo', choice.variant, choice.options, { width: choice.width })}</div></div>`;
  const specimen = template.content.querySelector<HTMLElement>('.specimen')!;
  for (const img of specimen.querySelectorAll('img')) {
    const { librarySymbol: id, symbolVariant } = img.dataset;
    if (!id || !isSymbolVariant(symbolVariant))
      throw new Error('La biblioteca contiene un símbolo o variante desconocidos.');
    img.src = librarySymbol(id, symbolVariant);
  }
  shadow.replaceChildren(template.content);
  try {
    await Promise.all([...specimen.querySelectorAll('img')].map((img) => img.decode()));
  } catch (cause) {
    throw new Error('No se pudo cargar un símbolo de la biblioteca. Volvé a intentarlo.', {
      cause,
    });
  }
  await document.fonts.ready;
  return specimen;
}
