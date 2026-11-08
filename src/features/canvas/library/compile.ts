import { pieceStyleKeys, type SketchPiece } from '../../../domain/sketch-pieces';
import type { LibraryComposition, LibraryPart } from '../../../domain/sketch-library';
import { libraryBounds, validLibraryComposition } from '../../../domain/sketch-library';
import { renderLibrary, type LibraryChoice } from './render';
import { sketchSymbols } from '../../../domain/sketch-symbols';
import { captureStructureLayout } from './structure-layout';
import {
  freeLayout,
  componentElements,
  type ComponentElement,
  type ComponentTree,
} from '../../../domain/component-tree';

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
    let current: ComponentElement | undefined;
    const roots: ComponentElement[] = [];
    let elementSequence = 0;
    const frameStyles = new Map<string, CSSStyleDeclaration>();
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
      current?.children.push({
        id: `element-${++elementSequence}`,
        name: name.slice(0, 200) || 'Pieza',
        material: String(parts.length),
        x: rect.x - origin.x - current.x,
        y: rect.y - origin.y - current.y,
        width,
        height,
        widthMode: 'fixed',
        heightMode: 'fixed',
        layout: freeLayout(),
        children: [],
      });
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
    const walk = (
      element: Element,
      inheritedOpacity: number,
      inheritedRotation = 0,
      clip?: DOMRect,
      parent?: ComponentElement,
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
      const frame: ComponentElement = {
        id: `element-${++elementSequence}`,
        name: (
          element.getAttribute('aria-label') ||
          element.getAttribute('data-part') ||
          element.classList[0]?.replaceAll('-', ' ') ||
          'Contenedor'
        ).slice(0, 200),
        x: rect.x - origin.x,
        y: rect.y - origin.y,
        width: Math.max(4, rect.width),
        height: Math.max(4, rect.height),
        widthMode: 'fixed',
        heightMode: 'fixed',
        layout: freeLayout(),
        children: [],
      };
      (parent?.children ?? roots).push(frame);
      frameStyles.set(frame.id, css);
      current = frame;
      if (element instanceof HTMLImageElement) {
        const symbol = element.dataset.librarySymbol;
        if (!symbol) throw new Error('Símbolo de biblioteca no reconocido.');
        piece.symbol = symbol;
        if (choice.entry.family === 'base') piece.autoInk = true;
        // Los SVG externos de Phosphor usan tinta negra; no heredan color del img.
        style.color = css.filter.includes('invert(1)') ? '#ffffff' : '#000000';
        add(paintRect, 'Símbolo · ' + sketchSymbols[symbol], clipped(paintRect, piece));
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
      if (painted) {
        add(paintRect, partName, clipped(paintRect, piece));
        if (!rotation && frame.children[0]) frame.children[0].background = true;
      }
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
          walk(child, opacity, rotation, childClip, frame);
          current = frame;
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
          add(
            textRect,
            label ? 'Texto' : child.textContent.trim().slice(0, 60),
            clipped(textRect, {
              style: textStyle,
              label: !!label,
              ...(choice.entry.family === 'base' ? { autoInk: true } : {}),
              ...(label ? { placeholderColor: barColors.get(label) ?? '#c6cbd1' } : {}),
            }),
            child.textContent.trim(),
            !!label && !choice.labels,
          );
        }
      }
    };
    walk(root, 1);
    // Conservar una superficie de lectura solo donde la tinta carece de fondo propio.
    // Un botón ya tiene su fondo: no arrastrar la hoja vacía de exhibición del catálogo.
    const needsBackdrop = parts.some(
      (part, index) =>
        (part.content.type === 'text' || part.content.piece?.symbol) &&
        !parts
          .slice(0, index)
          .some(
            (behind) =>
              visibleColor(behind.content.piece?.style.backgroundColor ?? 'transparent') &&
              behind.content.piece?.style.opacity !== '0' &&
              behind.x <= part.x &&
              behind.y <= part.y &&
              behind.x + behind.width >= part.x + part.width - 0.5 &&
              behind.y + behind.height >= part.y + part.height - 0.5,
          ),
    );
    if (choice.entry.family !== 'base' && needsBackdrop) {
      const bounds = libraryBounds({
        name: choice.entry.name,
        width: origin.width,
        height: origin.height,
        parts,
      });
      parts.unshift({
        x: bounds.x - 12,
        y: bounds.y - 12,
        width: bounds.width + 24,
        height: bounds.height + 24,
        name: 'Fondo · ' + choice.entry.name,
        content: {
          type: 'block',
          text: '',
          piece: { style: { backgroundColor: '#ffffff', borderRadius: '6px' } },
        },
      });
      for (const root of roots)
        for (const e of componentElements(root))
          if (e.material !== undefined)
            (e as ComponentElement).material = String(Number(e.material) + 1);
      roots[0]?.children.unshift({
        id: `element-${++elementSequence}`,
        name: 'Fondo',
        material: '0',
        background: true,
        x: bounds.x - 12 - (roots[0]?.x ?? 0),
        y: bounds.y - 12 - (roots[0]?.y ?? 0),
        width: bounds.width + 24,
        height: bounds.height + 24,
        widthMode: 'fixed',
        heightMode: 'fixed',
        layout: freeLayout(),
        children: [],
      });
    }
    // Los contenedores conservan sus cajas originales; las hojas ya son locales.
    const localize = (e: ComponentElement, px = 0, py = 0) => {
      const x = e.x,
        y = e.y;
      e.children = e.children.filter((c) => c.material !== undefined || elementMaterialsPresent(c));
      e.children.filter((c) => c.material === undefined).forEach((c) => localize(c, x, y));
      e.x -= px;
      e.y -= py;
    };
    const elementMaterialsPresent = (e: ComponentElement): boolean =>
      e.material !== undefined || e.children.some(elementMaterialsPresent);
    roots.forEach((r) => localize(r));
    const bounds = libraryBounds({
      name: choice.entry.name,
      width: origin.width,
      height: origin.height,
      parts,
    });
    const treeRoot = roots[0]!;
    // Quitar el espacio de exhibición conservando los márgenes y relaciones internos.
    treeRoot.children.forEach((e) => {
      e.x -= bounds.x - treeRoot.x;
      e.y -= bounds.y - treeRoot.y;
    });
    Object.assign(treeRoot, {
      name: choice.entry.name,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    });
    captureStructureLayout(treeRoot, frameStyles);
    const structure: ComponentTree = { version: 1, origin: { x: 0, y: 0 }, root: treeRoot };
    const result = {
      name:
        choice.entry.id === 'symbol'
          ? `Símbolo · ${sketchSymbols[choice.variant]}`
          : choice.entry.name,
      width: origin.width,
      height: origin.height,
      parts,
      // Una receta con varias partes es una unidad hasta separarla explícitamente.
      // Los conjuntos manuales conservan su comportamiento libre de arrastre.
      component: true,
      structure,
    };
    if (!validLibraryComposition(result))
      throw new Error('No se pudo preparar esta composición. No se agregó ninguna pieza.');
    return result;
  } finally {
    host.remove();
  }
}
