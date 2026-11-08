import type { ComponentElement } from '../../../domain/component-tree';

/** Trasladar únicamente filas/columnas verificables del DOM actual. Los diseños
 * superpuestos conservan posición libre; no se adivina jerarquía de datos antiguos. */
export function captureStructureLayout(
  root: ComponentElement,
  styles: Map<string, CSSStyleDeclaration>,
): void {
  const visit = (frame: ComponentElement): void => {
    frame.children.forEach(visit);
    const content = frame.children.filter((c) => !c.background);
    if (!content.length) return;
    const css = styles.get(frame.id);
    const ordered = (axis: 'x' | 'y', size: 'width' | 'height') =>
      content.every(
        (c, i) => i === 0 || c[axis] >= content[i - 1]![axis] + content[i - 1]![size] - 0.5,
      );
    const row = content.length > 1 && ordered('x', 'width');
    const column = !row && ordered('y', 'height');
    if (!row && !column) return;
    // Las coordenadas ya son locales y la primera pintura debe conservarse.
    const axis = row ? 'x' : 'y',
      size = row ? 'width' : 'height',
      cross = row ? 'y' : 'x',
      crossSize = row ? 'height' : 'width';
    const first = content[0]!,
      last = content.at(-1)!;
    if (content.some((c) => c.x < -0.5 || c.y < -0.5)) return;
    const gap =
      content.length > 1
        ? Math.max(
            0,
            Math.min(
              ...content.slice(1).map((c, i) => c[axis] - content[i]![axis] - content[i]![size]),
            ),
          )
        : 0;
    const start = Math.max(0, first[axis]),
      end = Math.max(0, frame[size] - last[axis] - last[size]);
    const crossStart = Math.max(0, Math.min(...content.map((c) => c[cross]))),
      crossEnd = Math.max(
        0,
        frame[crossSize] - Math.max(...content.map((c) => c[cross] + c[crossSize])),
      );
    frame.layout = {
      direction: row ? 'row' : 'column',
      gap,
      padding: 0,
      align: 'start',
      insets: row ? [crossStart, end, crossEnd, start] : [start, crossEnd, end, crossStart],
      justify: css?.justifyContent === 'space-between' ? 'between' : 'start',
    };
    for (let i = 0; i < content.length; i++) {
      const c = content[i]!,
        before = i ? Math.max(0, c[axis] - content[i - 1]![axis] - content[i - 1]![size] - gap) : 0;
      const offset = Math.max(0, c[cross] - crossStart);
      c.margin = row ? [offset, 0, 0, before] : [before, 0, 0, offset];
      if (!row && Math.abs(c.width - (frame.width - c.x - crossEnd)) < 1) c.widthMode = 'fill';
      if (row && Number(styles.get(c.id)?.flexGrow) > 0) c.widthMode = 'fill';
      // La altura de bloques apilados se deriva de sus partes: texto más largo
      // aumenta la fila y desplaza las siguientes, sin escalar su tipografía.
      if (c.children.length && c.layout.direction !== 'free') c.heightMode = 'hug';
    }
  };
  visit(root);
  if (root.layout.direction !== 'free') root.heightMode = 'hug';
}
