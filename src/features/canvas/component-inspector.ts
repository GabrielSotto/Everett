import type { Context } from '../../app/context';
import type { ComponentEdit } from '../../domain/commands/components';
import {
  componentElements,
  elementMaterials,
  type ComponentLayout,
} from '../../domain/component-tree';
import { componentFor } from '../../domain/manual-groups';
import { html, editable } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { frameCanvas } from '../../ui/canvas-frame';
import { nodeTitle, type Camera, type WorldSnapshot } from '../../domain/model';
import { inspectorLayers, bindLayerDrag } from './inspector-layers';
import { frameInterior } from '../../domain/canvas-frames';
import { flatLayers } from '../../domain/component-layers';
import type { CanvasUi } from './state';

/** Inspector contextual: Enter y Escape recorren los niveles del árbol de capas. */
export class ComponentInspector {
  private panel = document.createElement('section');
  private contextual: CanvasUi['componentEditing'];
  private dismissed: string | undefined;
  private expanded = new Set<string>();
  private flat: { group: string; leaf?: string } | undefined;
  private rootCollapsed = false;
  private lastInterior?: { world: WorldSnapshot; frame: string; count: number };
  private interiorCount(
    world: WorldSnapshot,
    frame: NonNullable<WorldSnapshot['canvasGroups']>[number],
  ): number {
    if (this.lastInterior?.world === world && this.lastInterior.frame === frame.id)
      return this.lastInterior.count;
    const { materials, groups } = frameInterior(world, frame);
    const count = materials.length + groups.length;
    this.lastInterior = { world, frame: frame.id, count };
    return count;
  }
  private lastScope: string | undefined;
  get visible(): boolean {
    return !this.panel.hidden;
  }
  allowSelection(): void {
    this.dismissed = undefined;
  }
  keepContextMenuIndependent(id: string): void {
    const group = this.ctx.world().canvasGroups?.find((g) => g.nodes.includes(id));
    if (group && (!this.visible || this.panel.dataset.group !== group.id))
      this.dismissed = group.id;
  }
  private key = '';
  private shellState: { element: HTMLElement; inert: boolean } | undefined;
  private presentation:
    { camera: Camera; selection: string[]; group: string; history: string[] } | undefined;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
    signal: AbortSignal,
    private cancelGesture: () => boolean,
  ) {
    this.panel.className = 'component-inspector';
    this.panel.hidden = true;
    this.panel.tabIndex = -1;
    root.querySelector('#canvas-inspector')!.append(this.panel);
    bindLayerDrag(this.panel, signal, (edit) => {
      if (this.flat) {
        this.stackFlat(edit);
        return;
      }
      if (!this.apply(edit)) return;
      const editing = this.ctx.ui.canvas.componentEditing!;
      const root = this.ctx.world().canvasGroups!.find((g) => g.id === editing.group)!.structure!
        .root;
      const parent = componentElements(root).find((e) =>
        e.children.some((c) => c.id === edit.element),
      )!;
      editing.element = parent.id;
      editing.selected = edit.element;
      const ids = elementMaterials(parent.children.find((c) => c.id === edit.element)!);
      this.ctx.ui.canvas.selections = ids;
      this.ctx.ui.canvas.selection = ids[0] ?? null;
      this.ctx.render();
      this.panel
        .querySelector<HTMLElement>(`[data-part="${CSS.escape(edit.element)}"]`)
        ?.focus({ preventScroll: true });
    });
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.presentation) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.stopPresentation();
          return;
        }
        if (
          !this.panel.contains(e.target as Node) &&
          !['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { signal, capture: true },
    );
    this.panel.addEventListener('pointerdown', (e) => e.stopPropagation(), { signal });
    this.panel.addEventListener('click', (e) => e.stopPropagation(), { signal });
    this.panel.addEventListener('wheel', (e) => e.stopPropagation(), { signal, passive: true });
    this.panel.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          e.target.blur();
        }
        e.stopPropagation();
        if (e.key === 'Escape') {
          if (editable(e.target)) {
            this.key = '';
            this.render();
            this.panel.focus();
          } else this.back();
        }
        if (e.key === 'Enter' && (e.target as Element).closest('[data-part]'))
          this.enterElement(
            (e.target as HTMLElement).closest<HTMLElement>('[data-part]')!.dataset.part!,
          );
      },
      { signal },
    );
    this.panel.addEventListener('click', (e) => this.click(e), { signal });
    this.panel.addEventListener(
      'dblclick',
      (e) => {
        const row = (e.target as Element).closest<HTMLElement>('[data-part]');
        if (row) this.enterElement(row.dataset.part!);
      },
      { signal },
    );
    this.panel.addEventListener('change', (e) => this.change(e), { signal });
    root.addEventListener(
      'keydown',
      (e) => {
        if (this.presentation && !this.panel.contains(e.target as Node)) {
          if (e.key === 'Escape') this.stopPresentation();
          if (!['Tab', 'Shift', 'Alt', 'Control', 'Meta'].includes(e.key)) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
          return;
        }
        if (editable(e.target) || (e.target as Element).closest('.canvas-context-layer')) return;
        if (e.key === 'Escape' && (this.presentation || ctx.ui.canvas.componentEditing)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (this.cancelGesture()) return;
          if (this.presentation) this.stopPresentation();
          else this.back();
        }
        if (
          e.key === 'Enter' &&
          !(e.target as Element).closest('button,a,summary,[role=button],[role=menuitem]') &&
          !ctx.ui.canvas.componentEditing &&
          ctx.ui.canvas.selection &&
          this.open(ctx.ui.canvas.selection)
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { signal, capture: true },
    );
    root.addEventListener(
      'click',
      (e) => {
        const action = (e.target as Element).closest<HTMLElement>('[data-action=component-edit]');
        if (action) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.open(action.dataset.id!);
        }
      },
      { signal, capture: true },
    );
    root.addEventListener(
      'pointerdown',
      (e) => {
        if (this.presentation && (e.target as Element).closest('#canvas-stage')) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { signal, capture: true },
    );
    root.addEventListener(
      'click',
      (e) => {
        if (
          !this.presentation ||
          !(e.target instanceof Element) ||
          !e.target.closest('#canvas-stage')
        )
          return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const node = e.target.closest<HTMLElement>('[data-node]')?.dataset.node;
        const group = ctx.world().canvasGroups?.find((g) => g.id === this.presentation!.group);
        const flow = ctx
          .world()
          .screenFlows?.find(
            (f) =>
              f.from === group?.id &&
              f.part &&
              group.structure &&
              componentElements(group.structure.root).some(
                (p) => p.id === f.part && node && elementMaterials(p).includes(node),
              ),
          );
        if (flow) this.showScreen(flow.to);
      },
      { signal, capture: true },
    );
    signal.addEventListener(
      'abort',
      () => {
        this.restoreShell();
        this.panel.remove();
      },
      { once: true },
    );
  }
  open(id: string): boolean {
    const group =
      this.ctx.world().canvasGroups?.find((g) => g.id === id) ?? componentFor(this.ctx.world(), id);
    if (!group) return false;
    this.dismissed = undefined;
    if (
      !group.structure &&
      !this.ctx.act(
        {
          type: 'component.edit',
          world: this.ctx.world().id,
          id: group.id,
          edit: { kind: 'initialize' },
        },
        'editar estructura',
        'C08-COMPONENT-01',
      )
    )
      return false;
    const root = this.ctx.world().canvasGroups!.find((g) => g.id === group.id)!.structure!.root;
    this.root.dispatchEvent(new CustomEvent('component-close-overlay'));
    const ui = this.ctx.ui.canvas;
    if (!ui.selection || !group.nodes.includes(ui.selection)) {
      ui.selections = [...group.nodes];
      ui.selection = group.nodes[0] ?? null;
    }
    ui.zoneSelection = ui.linkSelection = null;
    this.ctx.ui.canvas.componentEditing = { group: group.id, element: root.id, selected: root.id };
    this.key = '';
    this.panel.replaceChildren();
    this.ctx.render();
    this.render();
    return true;
  }
  enterAt(id: string): boolean {
    const group = componentFor(this.ctx.world(), id);
    if (!group) return false;
    const editing = this.ctx.ui.canvas.componentEditing;
    if (editing?.group !== group.id) return this.open(id);
    const scope =
      group.structure &&
      componentElements(group.structure.root).find((e) => e.id === editing.element);
    const child = scope?.children.find((e) => elementMaterials(e).includes(id));
    if (child && !child.material) {
      this.enterElement(child.id);
      return true;
    }
    return false;
  }
  selectLayer(id: string): void {
    if (!this.ctx.world().nodes.some((n) => n.id === id && !n.owner)) return;
    const group = componentFor(this.ctx.world(), id);
    if (group && !group.structure && !this.open(group.id)) return;
    const tree = group && this.ctx.world().canvasGroups?.find((g) => g.id === group.id)?.structure;
    const parent =
      tree && componentElements(tree.root).find((e) => e.children.some((c) => c.material === id));
    if (parent && group) {
      this.ctx.ui.canvas.componentEditing = {
        group: group.id,
        element: parent.id,
        selected: parent.children.find((c) => c.material === id)!.id,
      };
    } else delete this.ctx.ui.canvas.componentEditing;
    Object.assign(this.ctx.ui.canvas, {
      selection: id,
      selections: [id],
      zoneSelection: null,
      linkSelection: null,
    });
    this.ctx.render();
    this.ctx.persist();
    this.root
      .querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`)
      ?.focus({ preventScroll: true });
  }
  private enterElement(id: string): void {
    const editing = this.activate();
    if (!editing) return;
    const group = this.ctx.world().canvasGroups?.find((g) => g.id === editing.group);
    const element =
      group?.structure && componentElements(group.structure.root).find((e) => e.id === id);
    if (!element) return;
    editing.selected = id;
    if (!element.material) editing.element = id;
    this.ctx.ui.canvas.selections = elementMaterials(element);
    this.ctx.ui.canvas.selection = this.ctx.ui.canvas.selections[0] ?? null;
    this.ctx.render();
    this.render();
  }
  private back(): void {
    if (this.flat) {
      this.dismissed = this.flat.group;
      this.flat = undefined;
      this.ctx.render();
      return;
    }
    const editing = this.ctx.ui.canvas.componentEditing ?? this.contextual;
    if (!editing) return;
    const group = this.ctx.world().canvasGroups?.find((g) => g.id === editing.group);
    const parent =
      group?.structure &&
      componentElements(group.structure.root).find((e) =>
        e.children.some((c) => c.id === editing.element),
      );
    if (parent) this.enterElement(parent.id);
    else {
      this.dismissed = group?.id;
      delete this.ctx.ui.canvas.componentEditing;
      this.ctx.render();
      this.render();
    }
  }
  private apply(edit: ComponentEdit): boolean {
    const editing = this.activate();
    if (!editing) return false;
    const ok = this.ctx.act(
      { type: 'component.edit', world: this.ctx.world().id, id: editing.group, edit },
      'editar componente',
      'C08-COMPONENT-01',
    );
    this.key = '';
    this.ctx.render();
    this.render();
    return ok;
  }
  private activate() {
    const ui = this.ctx.ui.canvas;
    if (!ui.componentEditing && this.contextual) ui.componentEditing = { ...this.contextual };
    return ui.componentEditing;
  }
  private stackFlat(edit: Extract<ComponentEdit, { kind: 'stack' }>) {
    this.ctx.act(
      { type: 'component.edit', world: this.ctx.world().id, id: this.flat!.group, edit },
      'ordenar capas del conjunto',
      'C08-ORG-01',
    );
    this.selectFlat(edit.element);
  }
  private selectFlat(id: string) {
    this.flat!.leaf = id;
    this.root.dataset.pickedLayer = id;
    Object.assign(this.ctx.ui.canvas, { selection: id, selections: [id] });
    this.ctx.render();
    this.ctx.persist();
    this.panel
      .querySelector<HTMLElement>(`[data-part="${CSS.escape(id)}"]`)
      ?.focus({ preventScroll: true });
  }
  render(): void {
    if (this.presentation) {
      this.renderPresentation();
      return;
    }
    const ui = this.ctx.ui.canvas;
    const groups = this.ctx.world().canvasGroups;
    if (
      ui.componentEditing &&
      (ui.zoneSelection ||
        ui.linkSelection ||
        (ui.selection &&
          this.ctx.world().nodes.some((n) => n.id === ui.selection) &&
          !groups?.find((g) => g.id === ui.componentEditing!.group)?.nodes.includes(ui.selection)))
    )
      delete ui.componentEditing;
    const selectedIds = new Set(ui.selections);
    const selectedGroup =
      ui.tool === 'select' && !ui.zoneSelection && !ui.linkSelection && ui.selection
        ? groups?.find(
            (g) =>
              (g.structure || g.nodes.length > 1) &&
              g.nodes.length === selectedIds.size &&
              g.nodes.every((id) => selectedIds.has(id)),
          )
        : undefined;
    if (selectedGroup?.id !== this.dismissed) this.dismissed = undefined;
    const inspectedFlat =
      selectedGroup ??
      (ui.tool === 'select' &&
      !ui.zoneSelection &&
      !ui.linkSelection &&
      this.flat?.leaf === ui.selection &&
      ui.selections.length === 1
        ? groups?.find((g) => g.id === this.flat?.group && g.nodes.includes(ui.selection!))
        : undefined);
    if (
      !ui.componentEditing &&
      inspectedFlat &&
      !inspectedFlat.structure &&
      inspectedFlat.id !== this.dismissed
    ) {
      const leaf = selectedGroup ? undefined : this.flat?.leaf;
      this.flat = { group: inspectedFlat.id, ...(leaf ? { leaf } : {}) };
      this.contextual = undefined;
      const world = this.ctx.world();
      const root = flatLayers(world, inspectedFlat);
      const key = JSON.stringify([
        this.flat,
        inspectedFlat.name,
        root.children.map((c) => [c.id, c.name]),
      ]);
      if (key !== this.key) {
        this.key = key;
        this.panel.hidden = false;
        this.panel.dataset.group = inspectedFlat.id;
        this.panel.parentElement!.setAttribute('aria-label', 'Inspector de conjunto');
        this.panel.innerHTML = `<header><strong>${html(inspectedFlat.name)}</strong><button type="button" class="icon-button" data-component-action="close" aria-label="Cerrar inspector">${icon('close', 16)}</button></header><h3 class="inspector-layers-title">Capas</h3><div class="component-children" role="group" aria-label="Capas">${inspectorLayers(world, root, this.expanded, new Set(leaf ? [leaf] : []), leaf ?? '')}</div>`;
      }
      return;
    }
    this.flat = undefined;
    const rootPart = selectedGroup?.structure?.root;
    this.contextual =
      rootPart && selectedGroup && selectedGroup.id !== this.dismissed
        ? { group: selectedGroup.id, element: rootPart.id, selected: rootPart.id }
        : undefined;
    const editing = ui.componentEditing ?? this.contextual;
    const group = editing && groups?.find((g) => g.id === editing.group);
    if (!editing || !group?.structure) {
      delete this.ctx.ui.canvas.componentEditing;
      this.panel.hidden = true;
      this.key = '';
      return;
    }
    const elements = componentElements(group.structure.root),
      scope = elements.find((e) => e.id === editing.element) ?? group.structure.root;
    const selected = elements.find((e) => e.id === editing.selected) ?? scope;
    // Borrar, deshacer o sustituir partes puede retirar el nivel que se estaba editando.
    // La selección y los comandos deben usar el mismo contenedor que muestra el panel.
    editing.element = scope.id;
    editing.selected = selected.id;
    const world = this.ctx.world();
    const groupedIds = new Set(world.canvasGroups?.flatMap((g) => g.nodes));
    const loose = world.nodes.filter((n) => !n.owner && !groupedIds.has(n.id));
    const interiorCount =
      group.structure.root.frame && selected === group.structure.root
        ? this.interiorCount(world, group)
        : 0;
    const key = JSON.stringify([
      group,
      this.rootCollapsed,
      interiorCount,
      this.ctx
        .world()
        .nodes.filter((n) => group.nodes.includes(n.id))
        .map((n) => n.id),
      [...this.expanded],
      loose.map((n) => [n.id, nodeTitle(world, n)]),
      world.canvasGroups?.map((g) => [g.id, g.name, g.nodes, g.structure?.root.frame]),
      editing,
      this.ctx.ui.canvas.selections,
      this.ctx.world().compositions,
      this.ctx.world().screenFlows,
    ]);
    if (key === this.key) return;
    this.key = key;
    this.panel.hidden = false;
    const sameGroup = this.panel.dataset.group === group.id;
    const scrollTop = sameGroup
      ? (this.panel.querySelector('.component-children')?.scrollTop ?? 0)
      : 0;
    if (!sameGroup) {
      this.rootCollapsed = false;
      this.expanded.clear();
      this.lastScope = undefined;
    }
    this.panel.dataset.group = group.id;
    this.panel.parentElement!.setAttribute(
      'aria-label',
      group.structure.root.frame ? 'Inspector de marco' : 'Editar componente',
    );
    const expanded = [...this.panel.querySelectorAll('details[open] summary')].map(
      (e) => e.textContent,
    );
    const path = [scope];
    let ancestor = elements.find((e) => e.children.some((c) => c.id === scope.id));
    while (ancestor) {
      path.unshift(ancestor);
      const id = ancestor.id;
      ancestor = elements.find((e) => e.children.some((c) => c.id === id));
    }
    if (this.lastScope !== scope.id) {
      for (const e of path.slice(1)) this.expanded.add(e.id);
      if (scope !== group.structure.root) this.rootCollapsed = false;
      this.lastScope = scope.id;
    }
    const option = (value: string, label: string, current: string) =>
      `<option value="${html(value)}" ${value === current ? 'selected' : ''}>${html(label)}</option>`;
    const size = (axis: 'width' | 'height', label: string) =>
      `<label>${label}<input data-prop="${axis}" type="number" min="4" max="10000" value="${Math.round(selected[axis] * 100) / 100}" aria-label="${label}"><select data-prop="${axis}Mode" aria-label="Comportamiento del ${label.toLowerCase()}">${option('fixed', 'Fijo', selected[`${axis}Mode`])}${!selected.material ? option('hug', 'Contenido', selected[`${axis}Mode`]) : ''}${selected !== group.structure!.root ? option('fill', 'Rellenar', selected[`${axis}Mode`]) : ''}</select></label>`;
    const flow = this.ctx
      .world()
      .screenFlows?.find(
        (f) =>
          f.from === group.id &&
          f.part === (selected === group.structure!.root ? undefined : selected.id),
      );
    const chosen = scope.children.filter(
      (e) =>
        elementMaterials(e).length &&
        elementMaterials(e).every((id) => this.ctx.ui.canvas.selections.includes(id)),
    );
    const selectedNode = world.nodes.find((n) => n.id === selected.material);
    const editableContent =
      selectedNode?.data.kind === 'wireframe' || selectedNode?.data.kind === 'text';
    const unsupported = world.nodes.find(
      (n) => group.nodes.includes(n.id) && (n.data.kind !== 'wireframe' || !n.data.content.piece),
    );
    const available = this.ctx
      .world()
      .nodes.filter(
        (n) =>
          !n.owner &&
          n.data.kind === 'wireframe' &&
          n.data.content.piece &&
          !group.nodes.includes(n.id),
      );
    const locked = new Set(world.nodes.filter((n) => n.owner).map((n) => n.id));
    const nestable =
      this.ctx
        .world()
        .canvasGroups?.filter((g) => g.id !== group.id && !g.nodes.some((id) => locked.has(id))) ??
      [];
    const otherFrames = nestable.filter((g) => g.structure?.root.frame);
    const materialOptions = (items: typeof available) =>
      items
        .map((n) => `<option value="${html(n.id)}">${html(nodeTitle(world, n))}</option>`)
        .join('');
    const root = group.structure.root;
    this.panel.innerHTML = `<header><strong>Capas</strong><button type="button" class="icon-button" data-component-action="close" aria-label="Terminar edición">${icon('close', 16)}</button></header>
      <div class="component-children" role="group" aria-label="Capas"><nav class="inspector-root" aria-label="Jerarquía del componente"><button type="button" class="icon-button" data-toggle-root aria-expanded="${!this.rootCollapsed}" aria-label="${this.rootCollapsed ? 'Desplegar' : 'Contraer'} capas">${icon(this.rootCollapsed ? 'chevron' : 'down', 12)}</button><button type="button" data-enter="${html(root.id)}" aria-pressed="${selected === root}" title="${html(group.name)}" aria-label="${html(group.name)}">${icon(root.frame ? 'frame' : 'folder', 14)}<span>${html(group.name)}</span><small>${root.frame ? 'Marco' : 'Componente'}</small></button></nav>
      ${this.rootCollapsed ? '' : inspectorLayers(world, root, this.expanded, new Set(selected === root ? [] : chosen.map((e) => e.id)), selected.id) || '<p>El contenedor está vacío.</p>'}</div>
      ${interiorCount ? `<button type="button" class="frame-collect" data-component-action="collect-interior">Incorporar capas interiores <span>${interiorCount}</span></button>` : ''}
      <div class="component-properties"><h3 class="inspector-properties-title">Propiedades · ${html(selected.name)}</h3><label>Nombre<input data-prop="name" value="${html(selected.name)}" maxlength="200"></label><div class="component-sizes">${size('width', 'Ancho')}${size('height', 'Alto')}</div>
      ${!selected.material ? `<label>Distribución<select data-layout="direction" aria-label="Distribución">${option('free', 'Libre', selected.layout.direction)}${option('row', 'Fila', selected.layout.direction)}${option('column', 'Columna', selected.layout.direction)}</select></label><div class="component-sizes"><label>Espacio<input ${selected.layout.direction === 'free' ? 'disabled' : ''} data-layout="gap" type="number" min="0" max="10000" value="${selected.layout.gap}"></label><label>Margen interno<input data-layout="padding" type="number" min="0" max="10000" value="${selected.layout.padding}"></label></div><label>Alineación<select ${selected.layout.direction === 'free' ? 'disabled' : ''} data-layout="align" aria-label="Alineación">${option('start', 'Inicio', selected.layout.align)}${option('center', 'Centro', selected.layout.align)}${option('end', 'Final', selected.layout.align)}${option('stretch', 'Estirar', selected.layout.align)}</select></label>` : ''}
      ${selected.frame ? `<label class="frame-clip-option"><input type="checkbox" data-frame-clip ${selected.clipContent ? 'checked' : ''}>Recortar contenido</label>` : ''}
      ${selected.layout.insets ? `<details><summary>Márgenes por lado</summary><div class="component-sizes">${['Superior', 'Derecho', 'Inferior', 'Izquierdo'].map((name, i) => `<label>${name}<input type="number" min="0" max="10000" data-layout-edge="${i}" value="${Math.round(selected.layout.insets![i]! * 100) / 100}"></label>`).join('')}</div></details>` : ''}
      ${editableContent ? '<button type="button" data-component-action="content">Editar contenido y apariencia</button>' : ''}
      ${selected.material ? `<label class="component-check"><input type="checkbox" data-prop="background" ${selected.background ? 'checked' : ''}>Fondo del contenedor</label>` : ''}
      ${
        selected.id !== group.structure.root.id
          ? `<label>Contenedor<select data-reparent aria-label="Contenedor">${elements
              .filter(
                (e) =>
                  !e.material &&
                  e.id !== selected.id &&
                  !componentElements(selected).some((c) => c.id === e.id),
              )
              .map((e) =>
                option(
                  e.id,
                  e.name,
                  elements.find((p) => p.children.some((c) => c.id === selected.id))?.id ?? '',
                ),
              )
              .join(
                '',
              )}</select></label><div class="component-actions">${elements.some((e) => e.layout.direction !== 'free' && e.children.some((c) => c.id === selected.id)) ? `<button type="button" data-component-action="earlier" title="Mover antes en la distribución" aria-label="Mover antes en la distribución">${icon('chevron-left', 14)}</button><button type="button" data-component-action="later" title="Mover después en la distribución" aria-label="Mover después en la distribución">${icon('chevron', 14)}</button>` : ''}<button type="button" data-component-action="duplicate">Duplicar</button><button type="button" data-component-action="detach">Separar</button></div>`
          : ''
      }
      <button type="button" data-component-action="container" ${chosen.length < 2 ? 'disabled' : ''}>Agrupar selección en contenedor</button>
      ${otherFrames.length && selected !== group.structure.root && elementMaterials(selected).length < group.nodes.length ? `<details><summary>Mover a otro marco</summary><label>Marco de destino<select data-frame-target>${otherFrames.map((g) => option(g.id, g.name, '')).join('')}</select></label><button type="button" data-component-action="transfer">Mover al marco</button></details>` : ''}
      <details><summary>Incorporar o sustituir piezas</summary>${loose.length ? `<label>Pieza del Canvas<select data-adopt aria-label="Pieza del Canvas">${materialOptions(loose)}</select></label><button type="button" data-component-action="adopt">Incorporar al contenedor</button>` : '<p>No hay materiales sueltos para incorporar.</p>'}${selected.material && available.length ? `<label>Reemplazo<select data-replace aria-label="Reemplazo">${materialOptions(available)}</select></label><button type="button" data-component-action="replace">Sustituir contenido de la pieza</button>` : ''}</details>
      ${nestable.length ? `<details><summary>Anidar un componente</summary><label>Componente del Canvas<select data-nest aria-label="Componente del Canvas">${nestable.map((g) => `<option value="${html(g.id)}">${html(g.name)}</option>`).join('')}</select></label><button type="button" data-component-action="nest">Anidar en este contenedor</button></details>` : ''}
      <details><summary>Escala proporcional</summary><label>Porcentaje<input data-scale type="number" min="1" max="1000" value="100"></label><button type="button" data-component-action="scale">Escalar composición</button></details>
      <details><summary>Reutilizar</summary>${unsupported ? `<p>«${html(nodeTitle(world, unsupported))}» todavía no se puede guardar en una composición de Bosquejos.</p>` : `<label>Nombre<input data-save-name value="${html(group.name)}" maxlength="200"></label><button type="button" data-component-action="save">Guardar composición</button>${group.recipe ? `<button type="button" data-component-action="update">Actualizar esta copia desde biblioteca</button><button type="button" data-component-action="publish">Actualizar composición guardada</button>` : ''}<p>Las copias son independientes. Las vinculadas se actualizan solo cuando lo pedís.</p>`}</details>
      <details><summary>Recorrido</summary><label>Ir a<select data-flow aria-label="Ir a">${option('', 'Sin destino', flow?.to ?? '')}${this.ctx
        .world()
        .canvasGroups?.filter((g) => g.id !== group.id)
        .map((g) => option(g.id, g.name, flow?.to ?? ''))
        .join(
          '',
        )}</select></label><label>Acción<input data-flow-label value="${html(flow?.label ?? 'Continuar')}" maxlength="100"></label><button type="button" data-component-action="present">Consultar recorrido</button></details></div>`;
    this.panel.querySelector('.component-children')!.scrollTop = scrollTop;
    this.panel.querySelectorAll('details').forEach((e) => {
      e.open = expanded.includes(e.querySelector('summary')?.textContent ?? '');
    });
  }
  private click(event: MouseEvent): void {
    const target = event.target as Element,
      enter = target.closest<HTMLElement>('[data-enter]'),
      row = target.closest<HTMLElement>('[data-part]');
    if (target.closest('[data-toggle-root]')) {
      this.rootCollapsed = !this.rootCollapsed;
      this.key = '';
      this.render();
      this.panel.querySelector<HTMLElement>('[data-toggle-root]')?.focus({ preventScroll: true });
      return;
    }
    const disclosure = target.closest<HTMLElement>('[data-expand]');
    if (disclosure) {
      const id = disclosure.dataset.expand!;
      if (this.expanded.has(id)) {
        this.expanded.delete(id);
        this.key = '';
        this.render();
      } else {
        this.expanded.add(id);
        this.enterElement(id);
      }
      this.panel
        .querySelector<HTMLElement>(`[data-expand="${CSS.escape(id)}"]`)
        ?.focus({ preventScroll: true });
      return;
    }
    const stack = target.closest<HTMLElement>('[data-stack]');
    if (stack) {
      const id = stack.closest<HTMLElement>('[data-layer]')!.dataset.layer!;
      const edit = {
        kind: 'stack' as const,
        element: id,
        target: stack.dataset.neighbor!,
        side: stack.dataset.stack as 'above' | 'below',
      };
      if (this.flat) this.stackFlat(edit);
      else this.apply(edit);
      this.panel
        .querySelector<HTMLElement>(`[data-part="${CSS.escape(id)}"]`)
        ?.focus({ preventScroll: true });
      return;
    }
    if (this.flat) {
      if (row) this.selectFlat(row.dataset.part!);
      else if (target.closest('[data-component-action=close]')) this.back();
      return;
    }
    if (enter) {
      this.enterElement(enter.dataset.enter!);
      return;
    }
    const editing = this.activate();
    if (row && editing) {
      editing.selected = row.dataset.part!;
      const group = this.ctx.world().canvasGroups!.find((g) => g.id === editing.group)!;
      const selected = componentElements(group.structure!.root).find(
        (e) => e.id === editing.selected,
      )!;
      const ids = elementMaterials(selected);
      editing.element = row.closest<HTMLElement>('[data-parent]')!.dataset.parent!;
      if (selected.material) this.root.dataset.pickedLayer = selected.material;
      this.ctx.ui.canvas.selections =
        event.ctrlKey || event.metaKey || event.shiftKey
          ? ids.every((id) => this.ctx.ui.canvas.selections.includes(id))
            ? this.ctx.ui.canvas.selections.filter((id) => !ids.includes(id))
            : [...new Set([...this.ctx.ui.canvas.selections, ...ids])]
          : ids;
      this.ctx.ui.canvas.selection = this.ctx.ui.canvas.selections[0] ?? null;
      this.ctx.render();
      this.render();
      this.panel
        .querySelector<HTMLElement>(`[data-part="${CSS.escape(selected.id)}"]`)
        ?.focus({ preventScroll: true });
      return;
    }
    const action = target.closest<HTMLElement>('[data-component-action]')?.dataset.componentAction;
    if (this.presentation) {
      if (action === 'end') this.stopPresentation();
      if (action === 'previous') {
        const id = this.presentation.history.pop();
        if (id) this.showScreen(id, false);
      }
      const next = target.closest<HTMLElement>('[data-screen]')?.dataset.screen;
      if (next) this.showScreen(next);
      return;
    }
    if (!editing || !action) return;
    const group = this.ctx.world().canvasGroups!.find((g) => g.id === editing.group)!,
      elements = componentElements(group.structure!.root),
      selected = elements.find((e) => e.id === editing.selected)!,
      parent = elements.find((e) => e.children.some((c) => c.id === selected.id));
    if (action === 'collect-interior') {
      if (this.apply({ kind: 'collect-interior' })) this.enterElement(group.structure!.root.id);
      this.panel
        .querySelector<HTMLElement>('.inspector-root [data-enter]')
        ?.focus({ preventScroll: true });
      return;
    }
    if (action === 'back') this.back();
    if (action === 'close') {
      this.dismissed = group.id;
      delete this.ctx.ui.canvas.componentEditing;
      this.ctx.render();
      this.render();
    }
    if (action === 'content' && selected.material)
      this.root.dispatchEvent(
        new CustomEvent('component-edit-content', { detail: selected.material }),
      );
    if (action === 'duplicate' || action === 'detach') {
      if (this.apply({ kind: action, element: selected.id }) && action === 'detach')
        this.enterElement(parent!.id);
    }
    if ((action === 'earlier' || action === 'later') && parent) {
      const index = parent.children.findIndex((e) => e.id === selected.id);
      this.apply({
        kind: 'reparent',
        element: selected.id,
        parent: parent.id,
        index: Math.max(
          0,
          Math.min(parent.children.length, index + (action === 'earlier' ? -1 : 1)),
        ),
      });
    }
    if (action === 'container') {
      const scope = elements.find((e) => e.id === editing.element)!;
      this.apply({
        kind: 'container',
        elements: scope.children
          .filter(
            (e) =>
              elementMaterials(e).length &&
              elementMaterials(e).every((id) => this.ctx.ui.canvas.selections.includes(id)),
          )
          .map((e) => e.id),
        name: 'Contenedor',
      });
    }
    if (action === 'adopt')
      this.apply({
        kind: 'adopt',
        parent: editing.element,
        materials: [this.panel.querySelector<HTMLSelectElement>('[data-adopt]')!.value],
      });
    if (action === 'transfer' && parent) {
      const frame = this.panel.querySelector<HTMLSelectElement>('[data-frame-target]')!.value;
      if (this.apply({ kind: 'transfer', element: selected.id, frame }))
        this.enterElement(parent.id);
    }
    if (action === 'replace')
      this.apply({
        kind: 'replace',
        element: selected.id,
        material: this.panel.querySelector<HTMLSelectElement>('[data-replace]')!.value,
      });
    if (action === 'nest')
      this.apply({
        kind: 'nest',
        parent: editing.element,
        group: this.panel.querySelector<HTMLSelectElement>('[data-nest]')!.value,
      });
    if (action === 'scale') {
      const factor =
        Number(this.panel.querySelector<HTMLInputElement>('[data-scale]')!.value) / 100;
      const tree = group.structure!;
      if (factor > 0)
        this.apply({
          kind: 'resize',
          scale: true,
          rect: {
            x: tree.origin.x + tree.root.x,
            y: tree.origin.y + tree.root.y,
            width: tree.root.width * factor,
            height: tree.root.height * factor,
          },
        });
    }
    if (action === 'save' || action === 'publish')
      this.ctx.act(
        {
          type: 'composition.save',
          world: this.ctx.world().id,
          id: group.id,
          name: this.panel.querySelector<HTMLInputElement>('[data-save-name]')!.value,
          ...(action === 'publish' && group.recipe ? { replace: group.recipe.id } : {}),
        },
        'guardar composición',
        'C08-COMPONENT-02',
      );
    if (action === 'update')
      this.ctx.act(
        { type: 'composition.update', world: this.ctx.world().id, id: group.id },
        'actualizar composición elegida',
        'C08-COMPONENT-02',
      );
    if (action === 'present') {
      const shell = document.getElementById('shell');
      if (shell) {
        this.shellState = { element: shell, inert: shell.inert };
        shell.inert = true;
      }
      this.presentation = {
        group: group.id,
        camera: { ...this.ctx.currentCamera() },
        selection: [...this.ctx.ui.canvas.selections],
        history: [],
      };
      this.root.classList.add('consulting-flow');
      this.showScreen(group.id, false);
      this.panel.querySelector<HTMLButtonElement>('[data-component-action=end]')?.focus();
    }
  }
  private change(event: Event): void {
    const field = event.target as HTMLInputElement | HTMLSelectElement,
      editing = this.activate();
    if (!editing) return;
    const group = this.ctx.world().canvasGroups!.find((g) => g.id === editing.group)!,
      selected = componentElements(group.structure!.root).find((e) => e.id === editing.selected)!;
    if (field.hasAttribute('data-frame-clip')) {
      this.apply({
        kind: 'clip',
        element: selected.id,
        enabled: (field as HTMLInputElement).checked,
      });
      this.panel
        .querySelector<HTMLInputElement>('[data-frame-clip]')
        ?.focus({ preventScroll: true });
      return;
    }
    if (field.dataset.prop) {
      const key = field.dataset.prop;
      this.apply({
        kind: 'properties',
        element: selected.id,
        [key]:
          key === 'background'
            ? (field as HTMLInputElement).checked
            : ['width', 'height'].includes(key)
              ? Number(field.value)
              : field.value,
      });
    }
    if (field.dataset.layout) {
      const key = field.dataset.layout;
      const layout = { ...selected.layout };
      if (key === 'padding') delete layout.insets;
      this.apply({
        kind: 'properties',
        element: selected.id,
        layout: {
          ...layout,
          [key]: ['padding', 'gap'].includes(key) ? Number(field.value) : field.value,
        } as ComponentLayout,
      });
    }
    if (field.dataset.layoutEdge !== undefined) {
      const insets = [
        ...(selected.layout.insets ?? [
          selected.layout.padding,
          selected.layout.padding,
          selected.layout.padding,
          selected.layout.padding,
        ]),
      ] as [number, number, number, number];
      insets[Number(field.dataset.layoutEdge)] = Number(field.value);
      this.apply({
        kind: 'properties',
        element: selected.id,
        layout: { ...selected.layout, insets },
      });
    }
    if (field.hasAttribute('data-reparent'))
      this.apply({ kind: 'reparent', element: selected.id, parent: field.value, index: 0 });
    if (field.hasAttribute('data-flow') || field.hasAttribute('data-flow-label'))
      this.ctx.act(
        {
          type: 'screen-flow.set',
          world: this.ctx.world().id,
          from: group.id,
          to: this.panel.querySelector<HTMLSelectElement>('[data-flow]')!.value || null,
          label: this.panel.querySelector<HTMLInputElement>('[data-flow-label]')!.value,
          ...(selected.id !== group.structure!.root.id ? { part: selected.id } : {}),
        },
        'conectar recorrido',
        'C08-COMPONENT-03',
      );
  }
  private showScreen(id: string, record = true): void {
    const presentation = this.presentation,
      group = this.ctx.world().canvasGroups?.find((g) => g.id === id);
    if (!presentation || !group) return;
    if (record) presentation.history.push(presentation.group);
    presentation.group = id;
    this.ctx.ui.canvas.selections = [...group.nodes];
    this.ctx.ui.canvas.selection = group.nodes[0] ?? null;
    this.ctx.render();
    this.renderPresentation();
    frameCanvas(this.ctx, true, {
      maximumZoom: 1,
      ...(innerWidth >= 700
        ? { rightInset: 308 }
        : { bottomInset: this.panel.parentElement!.getBoundingClientRect().height + 16 }),
    });
  }
  private renderPresentation(): void {
    const p = this.presentation!;
    this.panel.hidden = false;
    const group = this.ctx.world().canvasGroups?.find((g) => g.id === p.group);
    const visible = new Set(group?.nodes ?? []);
    this.root.querySelectorAll<HTMLElement>('.material[data-node]').forEach((element) => {
      element.classList.toggle('flow-screen-part', visible.has(element.dataset.node!));
    });
    this.panel.innerHTML = `<header><strong>${html(group?.name ?? 'Recorrido')}</strong><button type="button" class="icon-button" data-component-action="end" aria-label="Salir del recorrido">${icon('close', 16)}</button></header><p>Consultá las pantallas y sus acciones. Escape vuelve al Canvas.</p><button type="button" data-component-action="previous" ${p.history.length ? '' : 'disabled'}>Anterior</button>${
      this.ctx
        .world()
        .screenFlows?.filter((f) => f.from === p.group)
        .map((f) => `<button type="button" data-screen="${html(f.to)}">${html(f.label)}</button>`)
        .join('') || '<p>Esta pantalla no tiene destinos.</p>'
    }`;
  }
  private stopPresentation(): void {
    const p = this.presentation;
    if (!p) return;
    this.presentation = undefined;
    this.restoreShell();
    this.root.classList.remove('consulting-flow');
    this.root.querySelectorAll('.flow-screen-part').forEach((element) => {
      element.classList.remove('flow-screen-part');
    });
    this.ctx.ui.canvas.selections = p.selection;
    this.ctx.ui.canvas.selection = p.selection[0] ?? null;
    this.ctx.camera?.set(p.camera, true);
    this.ctx.act({ type: 'camera', camera: p.camera }, 'volver del recorrido', 'C08-COMPONENT-03');
    this.key = '';
    this.ctx.render();
    this.render();
  }
  private restoreShell(): void {
    if (this.shellState) this.shellState.element.inert = this.shellState.inert;
    this.shellState = undefined;
  }
}
