import {
  loadYoga,
  Align,
  Direction,
  Edge,
  FlexDirection,
  Gutter,
  PositionType,
  Justify,
  type Yoga,
  type Node,
} from 'yoga-layout/load';
import type { ComponentElement } from './component-tree';

let yoga: Yoga | undefined;
let loading: Promise<void> | undefined;
export function prepareComponentLayout(): Promise<void> {
  return (loading ??= loadYoga()
    .then((engine) => {
      yoga = engine;
    })
    .catch((error) => {
      loading = undefined;
      throw error;
    }));
}
/** Solo pasan cajas de layout: Yoga no administra contenido ni identidades del documento. */
export function layoutComponent(root: ComponentElement, measureChildren = true): void {
  if (!yoga) throw new Error('El motor de distribución todavía no está disponible.');
  const validate = (e: ComponentElement): void => {
    for (const child of e.children) {
      if (
        !child.background &&
        ((e.widthMode === 'hug' && child.widthMode === 'fill') ||
          (e.heightMode === 'hug' && child.heightMode === 'fill'))
      )
        throw new Error(
          'Un contenedor ajustado al contenido no puede rellenarse a sí mismo. Usá tamaño fijo en ese eje.',
        );
      validate(child);
    }
  };
  validate(root);
  const entries = new Map<ComponentElement, Node>();
  // Yoga excluye posiciones absolutas del tamaño intrínseco; en disposición libre
  // ese tamaño procede de los límites de las partes, conservando su origen.
  const measureFree = (e: ComponentElement): void => {
    e.children.forEach(measureFree);
    if (e.layout.direction !== 'free') return;
    const content = e.children.filter((c) => !c.background);
    if (e.widthMode === 'hug')
      e.width = Math.max(4, ...content.map((c) => c.x + c.width)) + e.layout.padding;
    if (e.heightMode === 'hug')
      e.height = Math.max(4, ...content.map((c) => c.y + c.height)) + e.layout.padding;
  };
  // Resolver los contenedores intrínsecos de abajo arriba antes de medir su padre libre.
  const measureNested = (e: ComponentElement): void => {
    for (const child of e.children) {
      measureNested(child);
      if (
        e.layout.direction === 'free' &&
        child.children.length &&
        (child.widthMode === 'hug' || child.heightMode === 'hug')
      )
        layoutComponent(child, false);
    }
  };
  if (measureChildren) measureNested(root);
  measureFree(root);
  const config = yoga.Config.create();
  // Las cajas pertenecen al Mundo, no a una pantalla de densidad fija. Redondear
  // aquí recorta texto fraccionario y cambia el resultado según su posición.
  config.setPointScaleFactor(0);
  const build = (e: ComponentElement, parent?: ComponentElement): Node => {
    const n = yoga!.Node.createWithConfig(config);
    entries.set(e, n);
    n.setMinWidth(4);
    n.setMinHeight(4);
    n.setFlexShrink(0);
    n.setFlexDirection(e.layout.direction === 'row' ? FlexDirection.Row : FlexDirection.Column);
    n.setPadding(Edge.All, e.layout.padding);
    const edges = [Edge.Top, Edge.Right, Edge.Bottom, Edge.Left];
    e.layout.insets?.forEach((value, i) => n.setPadding(edges[i]!, value));
    e.margin?.forEach((value, i) => n.setMargin(edges[i]!, value));
    n.setJustifyContent(
      {
        start: Justify.FlexStart,
        center: Justify.Center,
        end: Justify.FlexEnd,
        between: Justify.SpaceBetween,
      }[e.layout.justify ?? 'start'],
    );
    n.setGap(Gutter.All, e.layout.gap);
    n.setAlignItems(
      { start: Align.FlexStart, center: Align.Center, end: Align.FlexEnd, stretch: Align.Stretch }[
        e.layout.align
      ],
    );
    if (e.widthMode === 'fixed' || !e.children.length || e.layout.direction === 'free')
      n.setWidth(e.width);
    if (e.heightMode === 'fixed' || !e.children.length || e.layout.direction === 'free')
      n.setHeight(e.height);
    if (parent?.layout.direction === 'free' || e.background) {
      n.setPositionType(PositionType.Absolute);
      n.setPosition(Edge.Left, e.x);
      n.setPosition(Edge.Top, e.y);
      if (parent && !e.background) {
        if (e.widthMode === 'fill') {
          n.setWidthAuto();
          n.setPosition(Edge.Right, parent.layout.padding);
        }
        if (e.heightMode === 'fill') {
          n.setHeightAuto();
          n.setPosition(Edge.Bottom, parent.layout.padding);
        }
      }
      if (e.background) {
        n.setPosition(Edge.Left, 0);
        n.setPosition(Edge.Top, 0);
        n.setWidth('100%');
        n.setHeight('100%');
      }
    } else if (parent) {
      if (e.widthMode === 'fill') {
        if (parent.layout.direction === 'row') {
          n.setFlexGrow(1);
          n.setFlexBasis(0);
          n.setWidthAuto();
        } else {
          n.setWidthAuto();
          n.setAlignSelf(Align.Stretch);
        }
      }
      if (e.heightMode === 'fill') {
        if (parent.layout.direction === 'column') {
          n.setFlexGrow(1);
          n.setFlexBasis(0);
          n.setHeightAuto();
        } else {
          n.setHeightAuto();
          n.setAlignSelf(Align.Stretch);
        }
      }
    }
    e.children.forEach((child, i) => n.insertChild(build(child, e), i));
    return n;
  };
  try {
    const node = build(root);
    node.calculateLayout(undefined, undefined, Direction.LTR);
    for (const [e, n] of entries) {
      const rect = n.getComputedLayout();
      if (![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite))
        throw new Error('No se pudo distribuir esta composición.');
      Object.assign(e, {
        x: e === root ? e.x : rect.left,
        y: e === root ? e.y : rect.top,
        width: Math.max(4, rect.width),
        height: Math.max(4, rect.height),
      });
    }
  } finally {
    // Liberar incluso si falló la construcción antes de conectar todos los hijos.
    const roots = [...entries.values()].filter((node) => !node.getParent());
    roots.forEach((node) => node.freeRecursive());
    config.free();
  }
}
