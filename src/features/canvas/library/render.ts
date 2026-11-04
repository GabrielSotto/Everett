import { renderSample, type LibraryEntry } from '../../../../design/wireframe-library/samples.js';

let styles: Promise<string> | undefined;
function libraryStyles(): Promise<string> {
  return (styles ??= Promise.all(
    ['vendor/chalk.css', 'catalogue.css'].map(async (path) => {
      const response = await fetch('/design/wireframe-library/' + path + '?direct');
      if (!response.ok) throw new Error('No se pudo cargar la biblioteca. Volvé a intentarlo.');
      return response.text();
    }),
  )
    .then((parts) =>
      parts
        .join('\n')
        .replaceAll(':root', ':host')
        .replace(/(?<![\w-])body(?![\w-])/g, '.library-body')
        .replace(/([\d.]+)rem\b/g, (_, n: string) => Number(n) * 16 + 'px'),
    )
    .catch((error) => {
      styles = undefined;
      throw error;
    }));
}
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
  const css = await libraryStyles();
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${css}\n:host{display:block;font-size:16px;} .library-body{padding:0;margin:0;background:transparent;} .sample{padding:0!important;border:0!important;min-height:0!important;overflow:visible!important;background:transparent!important;display:block!important;} .specimen{margin:0!important;} *,*::before,*::after{animation:none!important;transition:none!important;}</style><div class="library-body ${choice.labels ? 'labels' : ''}"><div class="sample">${renderSample(choice.entry, choice.state, 'demo', choice.variant, choice.options, { width: choice.width })}</div></div>`;
  const specimen = shadow.querySelector<HTMLElement>('.specimen')!;
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
