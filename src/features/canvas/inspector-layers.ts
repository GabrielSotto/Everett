import { layerLevels, layersFrontFirst } from '../../domain/component-layers';
import type { ComponentElement } from '../../domain/component-tree';
import type { DeepReadonly } from '../../domain/readonly';
import type { WorldSnapshot } from '../../domain/model';
import type { ComponentEdit } from '../../domain/commands/components';
import { icon } from '../../ui/icons';
import { html } from '../../ui/dom';

type Part = DeepReadonly<ComponentElement>;
type Stack = Extract<ComponentEdit, { kind: 'stack' }>;

export function inspectorLayers(
  world: WorldSnapshot,
  root: Part,
  expanded: Set<string>,
  selected: ReadonlySet<string>,
  active: string,
) {
  const levels = layerLevels(world);
  const rows = (parent: Part, depth: number): string => {
    const children = layersFrontFirst(parent, levels);
    return children
      .map((part, i) => {
        const id = html(part.id),
          name = html(part.name);
        const container = !part.material,
          open = expanded.has(part.id);
        const movable = !(parent.frame && part.background);
        const node = part.material && world.nodes[levels.get(part.material)!];
        const data = node && node.data;
        let symbol = part.frame ? 'frame' : container ? 'folder' : 'rectangle';
        if (data && data.kind === 'shape') symbol = data.shape;
        else if (data && data.kind === 'wireframe') {
          const content = data.content;
          if (content.piece?.symbol) symbol = 'shapes';
          else if (content.type === 'text' || content.piece?.label) symbol = 'text';
          else if (content.type === 'image') symbol = 'image';
        } else if (data && ['image', 'text', 'note'].includes(data.kind)) symbol = data.kind;
        const step = (above: boolean) => {
          const neighbor = children[i + (above ? -1 : 1)];
          const allowed = movable && neighbor && !(parent.frame && neighbor.background && !above);
          const label = above ? 'Subir capa' : 'Bajar capa';
          return `<button type="button" class="icon-button" data-stack="${above ? 'above' : 'below'}" data-neighbor="${html(neighbor?.id ?? '')}" aria-label="${label}" title="${label}" ${allowed ? '' : 'disabled'}>${icon(above ? 'chevron-up' : 'down', 13)}</button>`;
        };
        return `<div class="component-row inspector-layer" data-layer="${id}" data-parent="${html(parent.id)}" data-background="${!!(parent.frame && part.background)}" style="--depth:${depth}">${container ? `<button type="button" class="icon-button layer-disclosure" data-expand="${id}" data-enter="${id}" aria-expanded="${open}" aria-label="${open ? 'Contraer' : 'Desplegar'} ${name}">${icon(open ? 'down' : 'chevron', 12)}</button>` : ''}<button type="button" data-part="${id}" draggable="${movable}" aria-pressed="${selected.has(part.id)}" title="${name}">${icon(symbol, 14)}<span>${name}</span></button>${active === part.id ? step(true) + step(false) : ''}</div>${container && open ? rows(part, depth + 1) : ''}`;
      })
      .join('');
  };
  return rows(root, 0);
}

/** El indicador antes/después y el comando de teclado usan los mismos vecinos. */
export function bindLayerDrag(
  panel: HTMLElement,
  signal: AbortSignal,
  apply: (edit: Stack) => void,
) {
  let source: HTMLElement | undefined;
  const rowAt = (event: DragEvent) =>
    (event.target as Element).closest<HTMLElement>('[data-layer]');
  const clear = () => panel.querySelector('[data-drop-side]')?.removeAttribute('data-drop-side');
  const destination = (event: DragEvent) => {
    const row = rowAt(event);
    if (!source || !row || row === source) return;
    let ancestor: HTMLElement | null = row;
    while (ancestor) {
      if (ancestor === source) return;
      ancestor = panel.querySelector<HTMLElement>(
        `[data-layer="${CSS.escape(ancestor.dataset.parent!)}"]`,
      );
    }
    const b = row.getBoundingClientRect();
    const fraction = (event.clientY - b.top) / b.height;
    const side =
      row.querySelector('[data-expand]') && fraction >= 0.3 && fraction <= 0.7
        ? 'inside'
        : fraction < 0.5
          ? 'above'
          : 'below';
    if (row.dataset.background === 'true' && side === 'below') return;
    return { row, side } as const;
  };
  panel.addEventListener(
    'dragstart',
    (e) => {
      if (!(e.target as Element).closest('[data-part][draggable=true]') || !e.dataTransfer) return;
      source = rowAt(e) ?? undefined;
      if (!source) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-everett-layer', source.dataset.layer!);
      e.stopPropagation();
    },
    { signal },
  );
  panel.addEventListener(
    'dragover',
    (e) => {
      clear();
      const drop = destination(e);
      if (!drop) return;
      e.preventDefault();
      e.stopPropagation();
      drop.row.dataset.dropSide = drop.side;
    },
    { signal },
  );
  panel.addEventListener(
    'dragleave',
    (e) => {
      if (!(e.relatedTarget instanceof Node) || !panel.contains(e.relatedTarget)) clear();
    },
    { signal },
  );
  panel.addEventListener(
    'drop',
    (e) => {
      const drop = destination(e);
      if (!source) return;
      e.preventDefault();
      e.stopPropagation();
      clear();
      if (drop)
        apply({
          kind: 'stack',
          element: source.dataset.layer!,
          target: drop.row.dataset.layer!,
          side: drop.side,
        });
      source = undefined;
    },
    { signal },
  );
  panel.addEventListener(
    'dragend',
    () => {
      clear();
      source = undefined;
    },
    { signal },
  );
}
