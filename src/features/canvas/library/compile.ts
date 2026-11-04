import { pieceStyleKeys, type SketchPiece } from '../../../domain/sketch-pieces';
import type { LibraryComposition, LibraryPart } from '../../../domain/sketch-library';
import { validLibraryComposition } from '../../../domain/sketch-library';
import { renderLibrary, type LibraryChoice } from './render';

const visibleColor = (s: string) => s !== 'transparent' && s !== 'rgba(0, 0, 0, 0)';
/** Materializar pseudo-elementos permite que el navegador resuelva también su alineación. */
function expandIndicators(root: HTMLElement): void {
  const shadow = root.getRootNode() as ShadowRoot;
  const rules: string[] = [];
  let id = 0;
  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const side of ['before', 'after']) {
      const css = getComputedStyle(element, '::' + side);
      if (css.content === 'none' || css.content === 'normal' || css.display === 'none') continue;
      const indicator = document.createElement('span');
      indicator.dataset.part = 'Indicador';
      for (const property of css) {
        if (property !== 'content')
          indicator.style.setProperty(property, css.getPropertyValue(property));
      }
      const content = css.content;
      indicator.textContent = /^".*"$/.test(content) ? content.slice(1, -1) : '';
      const attribute = 'data-library-' + side;
      element.setAttribute(attribute, String(id));
      rules.push(
        `[${attribute}="${id++}"]::${side}{content:none!important;display:none!important}`,
      );
      if (side === 'before') element.prepend(indicator);
      else element.append(indicator);
    }
  }
  const style = document.createElement('style');
  style.textContent = rules.join('\n');
  shadow.append(style);
}
/** El navegador resuelve el layout aprobado; el dominio recibe piezas, nunca HTML. */
export async function compileLibrary(choice: LibraryChoice): Promise<LibraryComposition> {
  const host = document.createElement('div');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-20000px',
    top: '0',
    width: choice.width + 'px',
    pointerEvents: 'none',
  });
  host.setAttribute('aria-hidden', 'true');
  document.body.append(host);
  try {
    // Medimos rótulos reales para conservar el mismo layout en ambos modos de texto.
    const root = await renderLibrary(host, { ...choice, labels: true });
    // Las barras pertenecen al espacio del rótulo, no a la anchura de sus glifos.
    // Consultamos su pintura en el mismo catálogo para conservar los tonos contextuales.
    const barColors = new WeakMap<Element, string>();
    const body = root.closest('.library-body')!;
    body.classList.remove('labels');
    for (const label of [root, ...root.querySelectorAll('.label')])
      if (label.matches('.label'))
        barColors.set(label, getComputedStyle(label, '::after').backgroundColor);
    body.classList.add('labels');
    expandIndicators(root);
    const origin = root.getBoundingClientRect();
    const parts: LibraryPart[] = [];
    const add = (
      rect: DOMRect,
      name: string,
      piece: SketchPiece,
      text = '',
      placeholder = false,
    ) => {
      if (rect.width <= 0 || rect.height <= 0) return;
      const width = Math.max(4, rect.width),
        height = Math.max(4, rect.height);
      parts.push({
        x: rect.x - origin.x,
        y: rect.y - origin.y,
        width,
        height,
        name: name.slice(0, 200),
        content: {
          type: text ? 'text' : 'block',
          text,
          placeholder,
          placeholderLines: 1,
          piece: { ...piece, ink: { width: rect.width / width, height: rect.height / height } },
        },
      });
    };
    if (choice.entry.family !== 'base') {
      add(origin, 'Fondo · ' + choice.entry.name, {
        style: { backgroundColor: '#ffffff', borderRadius: '6px' },
      });
    }
    const walk = (
      element: Element,
      inheritedOpacity: number,
      inheritedRotation = 0,
      clip?: DOMRect,
    ) => {
      const css = getComputedStyle(element),
        rect = element.getBoundingClientRect();
      if (css.display === 'none' || css.visibility === 'hidden' || !rect.width || !rect.height)
        return;
      const opacity = inheritedOpacity * Number(css.opacity);
      if (!opacity) return;
      const style: SketchPiece['style'] = {};
      for (const key of pieceStyleKeys) style[key] = css[key];
      if (element instanceof HTMLTableCellElement && css.borderCollapse === 'collapse') {
        for (const key of [
          'borderTopWidth',
          'borderRightWidth',
          'borderBottomWidth',
          'borderLeftWidth',
        ] as const)
          style[key] = parseFloat(css[key]) / 2 + 'px';
      }
      style.opacity = String(opacity);
      const partName =
        element.getAttribute('aria-label') ?? element.getAttribute('data-part') ?? 'Bloque';
      const piece: SketchPiece = { style };
      const matrix = new DOMMatrixReadOnly(css.transform === 'none' ? undefined : css.transform);
      const rotation = inheritedRotation + (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
      if (rotation) piece.rotation = rotation;
      const paintRect =
        rotation && element instanceof HTMLElement
          ? new DOMRect(
              rect.x + rect.width / 2 - element.offsetWidth / 2,
              rect.y + rect.height / 2 - element.offsetHeight / 2,
              element.offsetWidth,
              element.offsetHeight,
            )
          : rect;
      const clipped = (r: DOMRect, p: SketchPiece): SketchPiece =>
        clip && !rotation
          ? {
              ...p,
              clip: [
                Math.max(0, Math.min(100, ((clip.top - r.top) / r.height) * 100)),
                Math.max(0, Math.min(100, ((r.right - clip.right) / r.width) * 100)),
                Math.max(0, Math.min(100, ((r.bottom - clip.bottom) / r.height) * 100)),
                Math.max(0, Math.min(100, ((clip.left - r.left) / r.width) * 100)),
              ],
            }
          : p;
      if (
        clip &&
        (rect.right <= clip.left ||
          rect.left >= clip.right ||
          rect.bottom <= clip.top ||
          rect.top >= clip.bottom)
      )
        return;
      if (element instanceof HTMLImageElement) {
        const match = new URL(element.src).pathname.match(
          /^\/design\/wireframe-library\/vendor\/([a-z0-9-]+)\.svg$/,
        );
        if (!match) throw new Error('Símbolo de biblioteca no reconocido.');
        piece.symbol = match[1]!;
        // Los SVG externos de Phosphor usan tinta negra; no heredan color del img.
        style.color = css.filter.includes('invert(1)') ? '#ffffff' : '#000000';
        add(paintRect, 'Símbolo · ' + piece.symbol, clipped(paintRect, piece));
        return;
      }
      if (element instanceof SVGSVGElement) {
        piece.viewBox = element.getAttribute('viewBox') ?? '0 0 220 100';
        piece.paths = [...element.querySelectorAll('path')].map((path) => {
          const paint = getComputedStyle(path);
          return {
            d: path.getAttribute('d') ?? '',
            fill: paint.fill,
            stroke: paint.stroke,
            width: parseFloat(paint.strokeWidth) || 0,
          };
        });
        add(paintRect, partName, clipped(paintRect, piece));
        return;
      }
      const painted =
        visibleColor(css.backgroundColor) ||
        css.backgroundImage !== 'none' ||
        ['Top', 'Right', 'Bottom', 'Left'].some(
          (side) =>
            parseFloat(css.getPropertyValue('border-' + side.toLowerCase() + '-width')) > 0 &&
            visibleColor(css.getPropertyValue('border-' + side.toLowerCase() + '-color')),
        ) ||
        css.boxShadow !== 'none' ||
        css.outlineStyle !== 'none';
      if (painted) add(paintRect, partName, clipped(paintRect, piece));
      for (const child of element.childNodes) {
        if (child instanceof Element) {
          const clips = ['hidden', 'auto', 'scroll', 'clip'];
          const childClip =
            clips.includes(css.overflowX) || clips.includes(css.overflowY)
              ? new DOMRect(
                  Math.max(rect.left, clip?.left ?? rect.left),
                  Math.max(rect.top, clip?.top ?? rect.top),
                  Math.min(rect.right, clip?.right ?? rect.right) -
                    Math.max(rect.left, clip?.left ?? rect.left),
                  Math.min(rect.bottom, clip?.bottom ?? rect.bottom) -
                    Math.max(rect.top, clip?.top ?? rect.top),
                )
              : clip;
          walk(child, opacity, rotation, childClip);
        } else if (child instanceof Text && child.textContent?.trim()) {
          const range = document.createRange();
          range.selectNodeContents(child);
          const label = element.closest('.label');
          const textRect = label ? label.getBoundingClientRect() : range.getBoundingClientRect();
          const firstLine = range.getClientRects()[0];
          const lineHeight = parseFloat(css.lineHeight);
          if (!label && firstLine && Number.isFinite(lineHeight)) {
            textRect.y -= (lineHeight - firstLine.height) / 2;
            textRect.height += lineHeight - firstLine.height;
          }
          const textStyle: SketchPiece['style'] = {
            color: css.color,
            fontSize: css.fontSize,
            fontWeight: css.fontWeight,
            fontStyle: css.fontStyle,
            lineHeight: css.lineHeight,
            letterSpacing: css.letterSpacing,
            textAlign: css.textAlign,
            textDecorationLine: css.textDecorationLine,
            textTransform: css.textTransform,
            opacity: String(opacity),
          };
          if (choice.entry.family === 'base') textStyle.backgroundColor = '#ffffff';
          add(
            textRect,
            label ? 'Texto' : child.textContent.trim().slice(0, 60),
            clipped(textRect, {
              style: textStyle,
              label: !!label,
              ...(label ? { placeholderColor: barColors.get(label) ?? '#c6cbd1' } : {}),
            }),
            child.textContent.trim(),
            !!label && !choice.labels,
          );
        }
      }
    };
    walk(root, 1);
    const result = { name: choice.entry.name, width: origin.width, height: origin.height, parts };
    if (!validLibraryComposition(result))
      throw new Error('No se pudo preparar esta composición. No se agregó ninguna pieza.');
    return result;
  } finally {
    host.remove();
  }
}
