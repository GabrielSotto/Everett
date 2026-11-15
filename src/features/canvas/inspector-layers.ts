import { layerLevels, layersFrontFirst } from '../../domain/component-layers';
import { elementMaterials, type ComponentElement } from '../../domain/component-tree';
import type { DeepReadonly } from '../../domain/readonly';
import type { WorldSnapshot } from '../../domain/model';
import type { ComponentEdit } from '../../domain/commands/components';
import { icon } from '../../ui/icons';
import { html } from '../../ui/dom';

type Part = DeepReadonly<ComponentElement>;
type Stack = Extract<ComponentEdit, { kind: 'stack' }>;

export interface LayerView {
  group: string;
  world: WorldSnapshot;
  root: Part;
  type: 'Marco' | 'Componente' | 'Conjunto';
  selected: ReadonlySet<string>;
  active: string;
  scope: string;
  interior?: number;
}

/** Una fila de grupo representa a sus hijos. Una pieza elegida dentro de ese grupo conserva su identidad. */
export function selectedLayerIds(
  root: Part,
  ids: ReadonlySet<string>,
  active: string,
  containers: ReadonlySet<string>,
) {
  if (active === root.id) return new Set([root.id]);
  const rows = new Set<string>();
  const visit = (part: Part) => {
    if (part.material) {
      if (ids.has(part.material)) rows.add(part.id);
      return;
    }
    if (
      (part.id === active || containers.has(part.id)) &&
      elementMaterials(part).every((id) => ids.has(id))
    ) {
      rows.add(part.id);
      return;
    }
    part.children.forEach(visit);
  };
  root.children.forEach(visit);
  return rows;
}

const normalized = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
function layerIcon(world: WorldSnapshot, part: Part, index: ReadonlyMap<string, number>) {
  if (!part.material) return part.frame ? 'frame' : 'folder';
  const data = world.nodes[index.get(part.material)!]?.data;
  if (data?.kind === 'shape') return data.shape;
  if (data?.kind === 'wireframe') {
    if (data.content.piece?.symbol) return 'shapes';
    if (data.content.type === 'text' || data.content.piece?.label) return 'text';
    if (data.content.type === 'image') return 'image';
  }
  return data && ['image', 'text', 'note', 'link'].includes(data.kind) ? data.kind : 'rectangle';
}

function layerType(world: WorldSnapshot, part: Part, index: ReadonlyMap<string, number>): string {
  if (!part.material) return part.frame ? 'Marcos' : 'Contenedores';
  const data = world.nodes[index.get(part.material)!]?.data;
  switch (data?.kind) {
    case 'wireframe':
      if (data.content.piece?.symbol) return 'Símbolos';
      if (data.content.type === 'text') return 'Texto';
      if (data.content.type === 'image') return 'Imágenes';
      if (data.content.type === 'video') return 'Videos';
      return 'Bosquejos';
    case 'text':
      return 'Texto';
    case 'shape':
      return 'Formas';
    case 'image':
      return 'Imágenes';
    case 'video':
      return 'Videos';
    case 'note':
      return 'Notas';
    case 'link':
      return 'Enlaces';
    case 'drawing':
      return 'Trazos';
    case 'pdf':
      return 'PDF';
    case 'bars':
      return 'Gráficos';
    default:
      return 'Otros materiales';
  }
}

/** Búsqueda, foco y ramas abiertas pertenecen al inspector, nunca al documento. */
export class InspectorLayerBrowser {
  readonly pane = document.createElement('section');
  private tree: HTMLElement;
  private search: HTMLInputElement;
  private toggle: HTMLButtonElement;
  private filter = '';
  private filterToggle: HTMLButtonElement;
  private filterMenu: HTMLElement;
  private collect: HTMLButtonElement;
  private view?: LayerView;
  private expanded = new Set<string>();
  private focusId = '';
  private anchor = '';
  private reveal = '';
  private searchOrigin = { scroll: 0, active: '' };
  private levels = new Map<string, number>();
  private children = new WeakMap<Part, Part[]>();
  constructor() {
    this.pane.className = 'inspector-layer-pane';
    const menuId = 'layer-filter-' + crypto.randomUUID();
    this.pane.innerHTML = `<header><strong>Capas</strong><button type="button" class="icon-button" data-layer-search aria-expanded="false" aria-label="Buscar capas" title="Buscar capas">${icon('search', 16)}</button><button type="button" class="icon-button" data-layer-filter aria-label="Filtrar capas por tipo" title="Filtrar capas por tipo" popovertarget="${menuId}">${icon('filter', 16)}</button><button type="button" class="icon-button" data-component-action="close" aria-label="Terminar edición" title="Cerrar inspector">${icon('close', 16)}</button></header>
      <div id="${menuId}" class="layer-filter-menu" role="group" aria-label="Tipo de capa" popover></div>
      <input type="search" class="layer-search" aria-label="Buscar capas por nombre" placeholder="Buscar capas…" hidden>
      <div class="component-children" role="tree" aria-label="Capas" aria-multiselectable="true"></div>
      <button type="button" class="frame-collect" data-component-action="collect-interior" hidden>Incorporar capas interiores <span></span></button>`;
    this.tree = this.pane.querySelector('[role=tree]')!;
    this.search = this.pane.querySelector('input')!;
    this.toggle = this.pane.querySelector('[data-layer-search]')!;
    this.filterToggle = this.pane.querySelector('[data-layer-filter]')!;
    this.filterMenu = this.pane.querySelector('[popover]')!;
    this.filterMenu.addEventListener('beforetoggle', (event) => {
      if ((event as ToggleEvent).newState !== 'open' || !this.view) return;
      const types = new Set<string>();
      const visit = (part: Part) => {
        types.add(layerType(this.view!.world, part, this.levels));
        part.children.forEach(visit);
      };
      visit(this.view.root);
      if (this.filter) types.add(this.filter);
      this.filterMenu.innerHTML = ['', ...[...types].sort((a, b) => a.localeCompare(b, 'es'))]
        .map(
          (type) =>
            `<button type="button" data-type="${html(type)}" aria-pressed="${this.filter === type}">${type || 'Todas las capas'}${this.filter === type ? icon('check', 14) : ''}</button>`,
        )
        .join('');
      const rect = this.filterToggle.getBoundingClientRect();
      this.filterMenu.style.left = Math.max(8, rect.right - 172) + 'px';
      this.filterMenu.style.top =
        Math.min(
          rect.bottom + 4,
          window.innerHeight - Math.min(220, this.filterMenu.children.length * 32 + 10) - 8,
        ) + 'px';
    });
    this.filterMenu.addEventListener('toggle', (event) => {
      if (
        (event as ToggleEvent).newState === 'open' &&
        document.activeElement === this.filterToggle
      )
        this.filterMenu
          .querySelector<HTMLButtonElement>('[aria-pressed=true]')
          ?.focus({ preventScroll: true });
    });
    this.filterToggle.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.filterMenu.matches(':popover-open')) {
        event.stopPropagation();
        this.filterMenu.hidePopover();
      }
    });
    this.filterMenu.addEventListener('keydown', (e) => e.stopPropagation());
    this.filterMenu.onclick = (e) => {
      const item = (e.target as Element).closest<HTMLElement>('[data-type]');
      if (!item) return;
      this.setFilter(item.dataset.type ?? '');
      this.filterMenu.hidePopover();
      this.filterToggle.focus({ preventScroll: true });
      this.tree.scrollTop = 0;
      this.paint();
    };
    this.collect = this.pane.querySelector('[data-component-action=collect-interior]')!;
    this.toggle.onclick = () => this.searching(this.search.hidden === true);
    this.search.oninput = () => {
      this.tree.scrollTop = 0;
      this.paint();
    };
    this.search.onkeydown = (e) => {
      if (e.key === 'Escape') this.searching(false);
      else if (e.key === 'ArrowDown' || e.key === 'Enter') {
        const first = this.search.value.trim()
          ? this.tree.querySelector<HTMLElement>('[data-match=true]')
          : this.items()[0];
        first?.focus();
      } else return;
      e.preventDefault();
      e.stopPropagation();
    };
    this.tree.addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLElement>('[data-expand]');
      if (!button || !this.view) return;
      e.stopPropagation();
      const id = button.dataset.expand!;
      if (this.expanded.has(id)) this.expanded.delete(id);
      else this.expanded.add(id);
      this.paint();
      this.tree
        .querySelector<HTMLElement>(`[data-item="${CSS.escape(id)}"]`)
        ?.focus({ preventScroll: true });
    });
    this.tree.addEventListener('focusin', (e) => {
      const item = (e.target as Element).closest<HTMLElement>('[role=treeitem]');
      if (!item) return;
      for (const other of this.items()) other.tabIndex = other === item ? 0 : -1;
      this.focusId = item.dataset.item!;
    });
    this.tree.addEventListener('keydown', (e) => this.keydown(e));
  }
  private setFilter(type: string) {
    this.filter = type;
    this.filterToggle.toggleAttribute('data-active', !!type);
    this.filterToggle.title = type ? `Filtrar capas por tipo · ${type}` : 'Filtrar capas por tipo';
    this.filterToggle.setAttribute('aria-label', this.filterToggle.title);
  }
  private searching(open: boolean) {
    this.search.hidden = !open;
    this.toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      this.searchOrigin = { scroll: this.tree.scrollTop, active: this.view?.active ?? '' };
      this.search.focus();
    } else {
      this.search.value = '';
      this.paint();
      this.tree.scrollTop = this.searchOrigin.scroll;
      if (this.view && this.view.active !== this.searchOrigin.active)
        this.revealActive(this.view.active);
      this.toggle.focus();
    }
  }
  private items() {
    return [...this.tree.querySelectorAll<HTMLElement>('[role=treeitem]')];
  }
  range(id: string, extend: boolean): string[] {
    const visible = this.items()
      .map((el) => el.dataset.item!)
      .filter((key) => key !== this.view?.root.id);
    const from = visible.indexOf(this.anchor),
      to = visible.indexOf(id);
    if (extend && from >= 0 && to >= 0)
      return visible.slice(Math.min(from, to), Math.max(from, to) + 1);
    this.anchor = id;
    return [id];
  }
  update(view: LayerView) {
    if (view.world !== this.view?.world) {
      this.levels = layerLevels(view.world);
      this.children = new WeakMap();
    }
    if (view.group !== this.view?.group) {
      if (this.filterMenu.matches(':popover-open')) this.filterMenu.hidePopover();
      this.setFilter('');
      this.expanded = new Set([view.root.id]);
      this.search.value = '';
      this.search.hidden = true;
      this.toggle.setAttribute('aria-expanded', 'false');
      this.focusId = view.active;
      this.anchor = '';
      this.reveal = '';
      this.tree.scrollTop = 0;
    }
    this.view = view;
    const revealKey = JSON.stringify([view.active, view.scope]);
    const changed = this.reveal !== revealKey;
    if (changed) {
      const reveal = (p: Part): boolean => {
        if (p.id === view.active) return true;
        if (p.children.some(reveal)) {
          this.expanded.add(p.id);
          return true;
        }
        return false;
      };
      reveal(view.root);

      this.focusId = view.active;
      this.reveal = revealKey;
    }
    this.pane
      .querySelector('[data-component-action=close]')!
      .setAttribute(
        'aria-label',
        view.type === 'Conjunto' ? 'Cerrar inspector' : 'Terminar edición',
      );
    this.collect.hidden = !view.interior;
    this.collect.querySelector('span')!.textContent = String(view.interior ?? 0);
    this.paint();
    if (changed && this.pane.isConnected) this.revealActive(view.active);
  }
  private revealActive(id: string) {
    const active = this.tree.querySelector<HTMLElement>(`[data-item="${CSS.escape(id)}"]`);
    if (!active) return;
    const bounds = this.tree.getBoundingClientRect(),
      row = active.getBoundingClientRect();
    if (row.bottom > bounds.bottom) this.tree.scrollTop += row.bottom - bounds.bottom;
    else if (row.top < bounds.top) this.tree.scrollTop += row.top - bounds.top;
  }
  private paint() {
    const view = this.view;
    if (!view) return;
    const query = normalized(this.search.value.trim());
    const filtered = !!(query || this.filter);
    const directMatch = (p: Part) =>
      normalized(p.name).includes(query) &&
      (!this.filter || layerType(view.world, p, this.levels) === this.filter);
    const matches = new Set<string>();
    const match = (p: Part): boolean => {
      let found = directMatch(p);
      for (const child of p.children) if (match(child)) found = true;
      if (found) matches.add(p.id);
      return found;
    };
    if (filtered) match(view.root);
    const render = (
      p: Part,
      parent: Part | undefined,
      depth: number,
      siblings: Part[],
      i: number,
    ): string => {
      const isRoot = !parent;
      const container = !p.material;
      let children = this.children.get(p);
      if (!children) {
        children = layersFrontFirst(p, this.levels);
        this.children.set(p, children);
      }
      const shown = filtered ? children.filter((c) => matches.has(c.id)) : children;
      const open = filtered ? shown.length > 0 : this.expanded.has(p.id);
      const id = html(p.id),
        name = html(p.name);
      const background = !!(parent?.frame && p.background);
      const movable = !!parent && !background;
      const caption = isRoot
        ? view.type
        : background && normalized(p.name) !== 'fondo'
          ? 'Fondo'
          : '';
      const accessibleName = background && caption ? name + ' · Fondo' : name;
      const step = (up: boolean) => {
        const neighbor = siblings[i + (up ? -1 : 1)],
          label = up ? 'Subir capa' : 'Bajar capa';
        const enabled = movable && neighbor && !(parent?.frame && neighbor.background && !up);
        return `<button type="button" class="icon-button" data-stack="${up ? 'above' : 'below'}" data-neighbor="${html(neighbor?.id ?? '')}" aria-label="${label}" title="${label}" ${enabled ? '' : 'disabled'}>${icon(up ? 'chevron-up' : 'down', 12)}</button>`;
      };
      const row = `<div role="none" class="component-row inspector-layer ${isRoot ? 'inspector-root' : ''}" data-layer="${id}" ${parent ? `data-parent="${html(parent.id)}"` : ''} data-background="${!!(parent?.frame && p.background)}" style="--depth:${depth}">
        ${container && p.children.length ? `<button type="button" class="icon-button layer-disclosure" tabindex="-1" data-expand="${id}" aria-expanded="${open}" aria-label="${open ? 'Contraer' : 'Desplegar'} ${name}" ${filtered ? 'disabled' : ''}>${icon(open ? 'down' : 'chevron', 12)}</button>` : ''}
        <button type="button" role="treeitem" data-item="${id}" ${filtered && directMatch(p) ? 'data-match="true"' : ''} ${isRoot ? `data-enter="${id}"` : `data-part="${id}"`} tabindex="${p.id === this.focusId ? 0 : -1}" aria-level="${depth + 1}" aria-posinset="${i + 1}" aria-setsize="${siblings.length}" ${container ? `aria-expanded="${open}"` : ''} aria-selected="${view.selected.has(p.id)}" aria-label="${accessibleName}" draggable="${movable}" title="${name}">${icon(layerIcon(view.world, p, this.levels), 14)}<span>${name}</span>${caption ? `<small>${caption}</small>` : ''}</button>
        ${!isRoot && p.id === view.active && view.selected.size === 1 ? step(true) + step(false) : ''}</div>`;
      return (
        row +
        (open
          ? children
              .map((child, index) =>
                !filtered || matches.has(child.id)
                  ? render(child, p, depth + 1, children, index)
                  : '',
              )
              .join('')
          : '')
      );
    };
    const scroll = this.tree.scrollTop;
    const focused = document.activeElement as HTMLElement | null;
    const restore = this.tree.contains(focused)
      ? focused?.closest<HTMLElement>('[data-item]')?.dataset.item
      : undefined;
    this.tree.innerHTML =
      filtered && !matches.size
        ? `<p role="status">${this.filter ? 'Ninguna capa coincide con el filtro.' : 'Sin capas con ese nombre.'}</p>`
        : render(view.root, undefined, 0, [view.root], 0);
    this.tree.scrollTop = scroll;
    const first = this.items()[0];
    if (first && !this.tree.querySelector('[role=treeitem][tabindex="0"]')) first.tabIndex = 0;
    if (restore)
      this.tree
        .querySelector<HTMLElement>(`[data-item="${CSS.escape(restore)}"]`)
        ?.focus({ preventScroll: true });
  }
  private keydown(e: KeyboardEvent) {
    const item = (e.target as Element).closest<HTMLElement>('[data-item]');
    if (!item) return;
    const items = this.items(),
      index = items.indexOf(item),
      row = item.closest<HTMLElement>('[data-layer]')!;
    const forward = e.key === 'ArrowDown';
    if (e.key === 'Escape' && !this.search.hidden) {
      this.searching(false);
    } else if ((forward || e.key === 'ArrowUp') && (e.ctrlKey || e.metaKey)) {
      if (item.getAttribute('aria-selected') !== 'true') item.click();
      this.tree
        .querySelector<HTMLButtonElement>(
          `[data-layer="${CSS.escape(item.dataset.item!)}"] [data-stack="${forward ? 'below' : 'above'}"]`,
        )
        ?.click();
    } else if (forward || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      const to =
        e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : index + (forward ? 1 : -1);
      const next = items[to];
      next?.focus();
      if (next && e.shiftKey && next.dataset.part) {
        if (!this.anchor) this.anchor = item.dataset.item!;
        next.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const right = e.key === 'ArrowRight',
        toggle = row.querySelector<HTMLButtonElement>('[data-expand]');
      if (
        toggle &&
        !toggle.disabled &&
        right !== (toggle.getAttribute('aria-expanded') === 'true')
      ) {
        toggle.click();
        this.tree
          .querySelector<HTMLElement>(`[data-item="${CSS.escape(item.dataset.item!)}"]`)
          ?.focus();
      } else if (right && toggle) items[index + 1]?.focus();
      else if (!right && row.dataset.parent)
        this.tree
          .querySelector<HTMLElement>(`[data-item="${CSS.escape(row.dataset.parent)}"]`)
          ?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') item.click();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
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
    if (
      !row.dataset.parent &&
      (side !== 'inside' || row.querySelector('small')?.textContent === 'Conjunto')
    )
      return;
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
