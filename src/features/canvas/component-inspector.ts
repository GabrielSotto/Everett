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
import type { Camera } from '../../domain/model';

/** Inspector contextual: Enter y Escape recorren la misma jerarquía que las migas. */
export class ComponentInspector {
  private panel = document.createElement('aside');
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
    this.panel.setAttribute('aria-label', 'Editar componente');
    this.panel.hidden = true;
    this.panel.tabIndex = -1;
    root.append(this.panel);
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
  private enterElement(id: string): void {
    const editing = this.ctx.ui.canvas.componentEditing;
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
    const editing = this.ctx.ui.canvas.componentEditing;
    if (!editing) return;
    const group = this.ctx.world().canvasGroups?.find((g) => g.id === editing.group);
    const parent =
      group?.structure &&
      componentElements(group.structure.root).find((e) =>
        e.children.some((c) => c.id === editing.element),
      );
    if (parent) this.enterElement(parent.id);
    else {
      delete this.ctx.ui.canvas.componentEditing;
      this.ctx.render();
      this.render();
    }
  }
  private apply(edit: ComponentEdit): boolean {
    const editing = this.ctx.ui.canvas.componentEditing;
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
  render(): void {
    if (this.presentation) {
      this.renderPresentation();
      return;
    }
    const editing = this.ctx.ui.canvas.componentEditing;
    const group = editing && this.ctx.world().canvasGroups?.find((g) => g.id === editing.group);
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
    const key = JSON.stringify([
      group,
      editing,
      this.ctx.ui.canvas.selections,
      this.ctx.world().compositions,
      this.ctx.world().screenFlows,
    ]);
    if (key === this.key) return;
    this.key = key;
    this.panel.hidden = false;
    this.panel.dataset.group = group.id;
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
    const available = this.ctx
      .world()
      .nodes.filter(
        (n) =>
          !n.owner &&
          n.data.kind === 'wireframe' &&
          n.data.content.piece &&
          !group.nodes.includes(n.id),
      );
    const loose = available.filter(
      (n) => !this.ctx.world().canvasGroups?.some((g) => g.nodes.includes(n.id)),
    );
    const nestable =
      this.ctx
        .world()
        .canvasGroups?.filter(
          (g) => g.id !== group.id && g.nodes.every((id) => available.some((n) => n.id === id)),
        ) ?? [];
    const materialOptions = (items: typeof available) =>
      items
        .map(
          (n) =>
            `<option value="${html(n.id)}">${html(n.data.kind === 'wireframe' ? n.data.title : 'Pieza')}</option>`,
        )
        .join('');
    this.panel.innerHTML = `<header><button type="button" class="icon-button" data-component-action="back" aria-label="Subir un nivel">${icon('chevron-left', 16)}</button><strong>${html(group.name)}</strong><button type="button" class="icon-button" data-component-action="close" aria-label="Terminar edición">${icon('close', 16)}</button></header>
      <nav aria-label="Jerarquía del componente">${path.map((e) => `<button type="button" data-enter="${html(e.id)}" title="${html(e.name)}">${html(e.name)}</button>`).join('<span aria-hidden="true">/</span>')}</nav>
      <div class="component-children" aria-label="Partes del contenedor">${scope.children.map((e) => `<div class="component-row"><button type="button" data-part="${html(e.id)}" aria-pressed="${chosen.includes(e)}" title="${html(e.name)}">${icon(!e.material ? 'folder' : 'rectangle', 14)}<span>${html(e.name)}</span></button>${!e.material ? `<button type="button" class="icon-button" data-enter="${html(e.id)}" aria-label="Entrar en ${html(e.name)}">${icon('chevron', 12)}</button>` : ''}</div>`).join('') || '<p>Esta pieza no contiene otras partes.</p>'}</div>
      <div class="component-properties"><label>Nombre<input data-prop="name" value="${html(selected.name)}" maxlength="200"></label><div class="component-sizes">${size('width', 'Ancho')}${size('height', 'Alto')}</div>
      ${!selected.material ? `<label>Distribución<select data-layout="direction" aria-label="Distribución">${option('free', 'Libre', selected.layout.direction)}${option('row', 'Fila', selected.layout.direction)}${option('column', 'Columna', selected.layout.direction)}</select></label><div class="component-sizes"><label>Espacio<input ${selected.layout.direction === 'free' ? 'disabled' : ''} data-layout="gap" type="number" min="0" max="10000" value="${selected.layout.gap}"></label><label>Margen interno<input data-layout="padding" type="number" min="0" max="10000" value="${selected.layout.padding}"></label></div><label>Alineación<select ${selected.layout.direction === 'free' ? 'disabled' : ''} data-layout="align" aria-label="Alineación">${option('start', 'Inicio', selected.layout.align)}${option('center', 'Centro', selected.layout.align)}${option('end', 'Final', selected.layout.align)}${option('stretch', 'Estirar', selected.layout.align)}</select></label>` : ''}
      ${selected.layout.insets ? `<details><summary>Márgenes por lado</summary><div class="component-sizes">${['Superior', 'Derecho', 'Inferior', 'Izquierdo'].map((name, i) => `<label>${name}<input type="number" min="0" max="10000" data-layout-edge="${i}" value="${Math.round(selected.layout.insets![i]! * 100) / 100}"></label>`).join('')}</div></details>` : ''}
      ${selected.material ? `<button type="button" data-component-action="content">Editar contenido y apariencia</button><label class="component-check"><input type="checkbox" data-prop="background" ${selected.background ? 'checked' : ''}>Fondo del contenedor</label>` : ''}
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
              )}</select></label><div class="component-actions"><button type="button" data-component-action="earlier" title="Mover antes">${icon('chevron-left', 14)}</button><button type="button" data-component-action="later" title="Mover después">${icon('chevron', 14)}</button><button type="button" data-component-action="duplicate">Duplicar</button><button type="button" data-component-action="detach">Separar</button></div>`
          : ''
      }
      <button type="button" data-component-action="container" ${chosen.length < 2 ? 'disabled' : ''}>Agrupar selección en contenedor</button>
      <details><summary>Incorporar o sustituir piezas</summary>${loose.length ? `<label>Pieza del Canvas<select data-adopt aria-label="Pieza del Canvas">${materialOptions(loose)}</select></label><button type="button" data-component-action="adopt">Incorporar al contenedor</button>` : '<p>Agregá una pieza desde Bosquejos para incorporarla aquí.</p>'}${selected.material && available.length ? `<label>Reemplazo<select data-replace aria-label="Reemplazo">${materialOptions(available)}</select></label><button type="button" data-component-action="replace">Sustituir contenido de la pieza</button>` : ''}</details>
      ${nestable.length ? `<details><summary>Anidar un componente</summary><label>Componente del Canvas<select data-nest aria-label="Componente del Canvas">${nestable.map((g) => `<option value="${html(g.id)}">${html(g.name)}</option>`).join('')}</select></label><button type="button" data-component-action="nest">Anidar en este contenedor</button></details>` : ''}
      <details><summary>Escala proporcional</summary><label>Porcentaje<input data-scale type="number" min="1" max="1000" value="100"></label><button type="button" data-component-action="scale">Escalar composición</button></details>
      <details><summary>Reutilizar</summary><label>Nombre<input data-save-name value="${html(group.name)}" maxlength="200"></label><button type="button" data-component-action="save">Guardar composición</button>${group.recipe ? `<button type="button" data-component-action="update">Actualizar esta copia desde biblioteca</button><button type="button" data-component-action="publish">Actualizar composición guardada</button>` : ''}<p>Las copias son independientes. Las vinculadas se actualizan solo cuando lo pedís.</p></details>
      <details><summary>Recorrido</summary><label>Ir a<select data-flow aria-label="Ir a">${option('', 'Sin destino', flow?.to ?? '')}${this.ctx
        .world()
        .canvasGroups?.filter((g) => g.id !== group.id)
        .map((g) => option(g.id, g.name, flow?.to ?? ''))
        .join(
          '',
        )}</select></label><label>Acción<input data-flow-label value="${html(flow?.label ?? 'Continuar')}" maxlength="100"></label><button type="button" data-component-action="present">Consultar recorrido</button></details></div>`;
    this.panel.querySelectorAll('details').forEach((e) => {
      e.open = expanded.includes(e.querySelector('summary')?.textContent ?? '');
    });
  }
  private click(event: MouseEvent): void {
    const target = event.target as Element,
      enter = target.closest<HTMLElement>('[data-enter]'),
      row = target.closest<HTMLElement>('[data-part]');
    if (enter) {
      this.enterElement(enter.dataset.enter!);
      return;
    }
    const editing = this.ctx.ui.canvas.componentEditing;
    if (row && editing) {
      editing.selected = row.dataset.part!;
      const group = this.ctx.world().canvasGroups!.find((g) => g.id === editing.group)!;
      const selected = componentElements(group.structure!.root).find(
        (e) => e.id === editing.selected,
      )!;
      const ids = elementMaterials(selected);
      this.ctx.ui.canvas.selections =
        event.ctrlKey || event.metaKey || event.shiftKey
          ? ids.every((id) => this.ctx.ui.canvas.selections.includes(id))
            ? this.ctx.ui.canvas.selections.filter((id) => !ids.includes(id))
            : [...new Set([...this.ctx.ui.canvas.selections, ...ids])]
          : ids;
      this.ctx.ui.canvas.selection = this.ctx.ui.canvas.selections[0] ?? null;
      this.ctx.render();
      this.render();
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
    if (action === 'back') this.back();
    if (action === 'close') {
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
      editing = this.ctx.ui.canvas.componentEditing;
    if (!editing) return;
    const group = this.ctx.world().canvasGroups!.find((g) => g.id === editing.group)!,
      selected = componentElements(group.structure!.root).find((e) => e.id === editing.selected)!;
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
        : { bottomInset: this.panel.getBoundingClientRect().height + 16 }),
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
