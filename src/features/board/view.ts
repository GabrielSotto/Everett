import { shippingTasks, shippingLabels, releaseSummary } from '../../domain/shipping';
import { bindDismiss } from '../../ui/popover';
import type { Context } from '../../app/context';
import { statuses, statusNames, type Task, type Property } from '../../domain/model';
import { html, target, value, type View } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
function taskValue(t: Task, key: string): string {
  if (
    key === 'status' ||
    key === 'priority' ||
    key === 'assignee' ||
    key === 'creator' ||
    key === 'start' ||
    key === 'due' ||
    key === 'title' ||
    key === 'description' ||
    key === 'origin'
  )
    return t[key];
  return t.custom[key] ?? '';
}
function field(t: Task, p: Property): string {
  const attrs = `data-task="${t.id}" data-field="${p.id}" aria-label="${html(p.name)} de ${html(t.title)}"`;
  if (p.id === 'status')
    return `<select ${attrs}>${statuses.map((s) => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${statusNames[s]}</option>`).join('')}</select>`;
  if (p.id === 'priority')
    return `<select ${attrs}>${['Alta', 'Media', 'Baja'].map((x) => `<option ${x === t.priority ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
  if (p.id === 'origin') return `<span class="task-origin">${icon(t.origin, 13)}${t.origin}</span>`;
  return `<input ${attrs} type="${p.type}" value="${html(taskValue(t, p.id))}">`;
}
export class BoardView implements View {
  private abort = new AbortController();
  private month = 8;
  private year = 2026;
  private dragId = '';
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    bindDismiss(
      this.abort.signal,
      () => ctx.ui.board.boardProperties,
      () => {
        ctx.ui.board.boardProperties = false;
        this.render();
      },
      '.properties-menu,[data-action=board-properties]',
    );
    root.addEventListener(
      'click',
      (e) => {
        const t = target(e);
        if (!t) return;
        const w = ctx.world();
        switch (t.dataset.action) {
          case 'shipping-toggle':
            ctx.act(
              {
                type: 'world.shipping',
                world: w.id,
                active: !w.shipping.active,
                source: 'board',
                at: Date.now(),
              },
              'activar shipping',
              'SHIPPING-01',
            );
            break;
          case 'board-view': {
            const view = t.dataset.view;
            if (view === 'kanban' || view === 'table' || view === 'calendar')
              ctx.act({ type: 'board.view', world: w.id, view }, 'cambiar vista', 'BOARD-02');
            break;
          }
          case 'task-expand':
            ctx.ui.board.taskExpanded =
              ctx.ui.board.taskExpanded === t.dataset.id ? null : (t.dataset.id ?? null);
            this.render();
            break;
          case 'board-properties':
            ctx.ui.board.boardProperties = !ctx.ui.board.boardProperties;
            this.render();
            break;
          case 'property-toggle':
            ctx.act(
              { type: 'property.toggle', world: w.id, id: t.dataset.id ?? '' },
              'mostrar propiedad',
              'BOARD-02',
            );
            break;
          case 'property-remove':
            ctx.act(
              { type: 'property.remove', world: w.id, id: t.dataset.id ?? '' },
              'quitar propiedad',
              'BOARD-02',
            );
            break;
          case 'month-prev':
            this.month--;
            if (this.month < 0) {
              this.month = 11;
              this.year--;
            }
            this.render();
            break;
          case 'month-next':
            this.month++;
            if (this.month > 11) {
              this.month = 0;
              this.year++;
            }
            this.render();
            break;
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'submit',
      (e) => {
        if (!(e.target instanceof HTMLFormElement)) return;
        if (e.target.id === 'quick-task') {
          e.preventDefault();
          const title = value(root, '#quick-task-title');
          ctx.act(
            { type: 'task.create', world: ctx.world().id, title, origin: 'board' },
            'crear tarea',
            'BOARD-01',
          );
          root.querySelector<HTMLInputElement>('#quick-task-title')?.focus();
        }
        if (e.target.id === 'new-property') {
          e.preventDefault();
          const name = value(root, '#property-name').trim(),
            type = value(root, '#property-type');
          if (name && (type === 'text' || type === 'date' || type === 'number'))
            ctx.act(
              {
                type: 'property.add',
                world: ctx.world().id,
                property: { id: 'custom-' + Date.now().toString(36), name, type, custom: true },
              },
              'agregar propiedad',
              'BOARD-02',
            );
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'change',
      (e) => {
        if (!(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ))
          return;
        const id = e.target.dataset.task,
          key = e.target.dataset.field;
        if (id && key) {
          if (key === 'shipping') {
            const role = e.target.value;
            if (role === 'blocker' || role === 'required' || role === 'later')
              ctx.act(
                { type: 'task.shipping', world: ctx.world().id, id, role },
                'definir alcance shipping',
                'SHIPPING-03',
              );
            return;
          }
          ctx.act(
            { type: 'task.edit', world: ctx.world().id, id, field: key, value: e.target.value },
            'editar tarea',
            'BOARD-02',
          );
          if (key === 'status') this.render();
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'dragstart',
      (e) => {
        const item =
          e.target instanceof Element ? e.target.closest<HTMLElement>('[data-card]') : null;
        if (item) {
          this.dragId = item.dataset.card ?? '';
          e.dataTransfer?.setData('text/plain', this.dragId);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'dragover',
      (e) => {
        if (e.target instanceof Element && e.target.closest('[data-drop]')) e.preventDefault();
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'drop',
      (e) => {
        e.preventDefault();
        const status =
          e.target instanceof Element
            ? e.target.closest<HTMLElement>('[data-drop]')?.dataset.drop
            : null;
        if (status && this.dragId) {
          ctx.act(
            {
              type: 'task.edit',
              world: ctx.world().id,
              id: this.dragId,
              field: 'status',
              value: status,
            },
            'mover tarea',
            'BOARD-01',
          );
          this.dragId = '';
          this.render();
        }
      },
      { signal: this.abort.signal },
    );
    this.render();
  }
  private expanded(t: Task): string {
    return `<div class="task-details"><div class="property-row"><span>Lanzamiento</span><select data-task="${t.id}" data-field="shipping" aria-label="Alcance de ${html(t.title)}">${(['blocker', 'required', 'later'] as const).map((role) => `<option value="${role}" ${t.shipping === role ? 'selected' : ''}>${shippingLabels[role]}</option>`).join('')}</select></div><textarea data-task="${t.id}" data-field="description" aria-label="Descripción de ${html(t.title)}" placeholder="Descripción…">${html(t.description)}</textarea>${this.ctx
      .world()
      .properties.filter((p) => this.ctx.world().visibleProperties.includes(p.id))
      .map((p) => `<div class="property-row"><span>${html(p.name)}</span>${field(t, p)}</div>`)
      .join('')}</div>`;
  }
  private card(t: Task): string {
    const r = this.ctx.store.get().route,
      expanded =
        this.ctx.ui.board.taskExpanded === t.id || (r.kind === 'surface' && r.entity === t.id);
    return `<article data-shipping="${t.shipping}" class="task-card ${this.ctx.world().shipping.active && t.shipping === 'later' ? 'shipping-later' : ''} ${expanded ? 'expanded' : ''}" draggable="true" data-card="${t.id}" data-ref-kind="task" data-ref-id="${t.id}"><button class="task-title" data-action="task-expand" data-id="${t.id}">${html(t.title)}</button>${this.ctx.world().shipping.active && t.shipping !== 'later' ? `<span class="release-tag ${t.shipping}">${shippingLabels[t.shipping]}</span>` : ''}<div class="task-card-meta"><span class="priority ${t.priority === 'Alta' ? 'high' : ''}">${t.priority}</span><span>${html(t.assignee) || '—'}</span></div>${expanded ? this.expanded(t) : ''}</article>`;
  }
  private calendar(): string {
    const first = new Date(this.year, this.month, 1).getDay(),
      offset = (first + 6) % 7,
      count = new Date(this.year, this.month + 1, 0).getDate(),
      w = this.ctx.world();
    return `<div class="calendar-head">${btn('month-prev', 'chevron', 'Mes anterior', 'class="previous"')}<strong>${new Date(this.year, this.month).toLocaleDateString('es', { month: 'long', year: 'numeric' })}</strong>${btn('month-next', 'chevron', 'Mes siguiente')}</div><div class="calendar-grid">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => `<span class="day-name">${d}</span>`).join('')}${Array.from({ length: offset }, () => '<div class="calendar-day off"></div>').join('')}${Array.from(
      { length: count },
      (_, i) => {
        const date = `${this.year}-${String(this.month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        return `<div class="calendar-day"><span>${i + 1}</span>${w.tasks
          .filter((t) => t.due === date)
          .map(
            (t) => `<button data-action="task-expand" data-id="${t.id}">${html(t.title)}</button>`,
          )
          .join('')}</div>`;
      },
    ).join('')}</div>${w.tasks
      .filter((t) => t.id === this.ctx.ui.board.taskExpanded)
      .map((t) => this.card(t))
      .join('')}`;
  }
  render(): void {
    const w = this.ctx.world(),
      ordered = shippingTasks(w),
      summary = releaseSummary(w),
      props = w.properties.filter((p) => w.visibleProperties.includes(p.id));
    const table = `<div class="board-table-scroll"><table class="board-table"><thead><tr><th>Tarea</th>${props.map((p) => `<th>${html(p.name)}</th>`).join('')}</tr></thead><tbody>${ordered.map((t) => `<tr data-shipping="${t.shipping}" class="${w.shipping.active && t.shipping === 'later' ? 'shipping-later' : ''}" data-ref-kind="task" data-ref-id="${t.id}"><td><input class="table-title" data-task="${t.id}" data-field="title" aria-label="Título de ${html(t.title)}" value="${html(t.title)}"></td>${props.map((p) => `<td>${field(t, p)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    this.root.innerHTML = `<div class="board-layout ${w.shipping.active ? 'shipping-active' : ''}"><div class="board-toolbar"><div class="view-switch">${btn('board-view', 'board', 'Vista Kanban', 'data-view="kanban"', w.boardView === 'kanban')}${btn('board-view', 'table', 'Vista tabla', 'data-view="table"', w.boardView === 'table')}${btn('board-view', 'calendar', 'Vista calendario', 'data-view="calendar"', w.boardView === 'calendar')}</div><form id="quick-task"><input id="quick-task-title" aria-label="Nueva tarea" placeholder="Nueva tarea…"><button type="submit" class="icon-button" aria-label="Crear tarea">${icon('plus')}</button></form>${btn('board-properties', 'filter', 'Propiedades', '', this.ctx.ui.board.boardProperties)}<button class="shipping-control ${w.shipping.active ? 'on' : ''}" type="button" data-action="shipping-toggle" role="switch" aria-checked="${w.shipping.active}" aria-label="Shipping Mode"><span>Shipping Mode</span><span class="toggle-track ${w.shipping.active ? 'on' : ''}"><i></i></span></button></div>${w.shipping.active ? `<div class="shipping-summary" aria-label="Estado del lanzamiento"><div class="release-heading"><span>${icon('rocket', 16)}Lanzamiento</span><strong>${summary.blockers.length ? `${summary.blockers.length} ${summary.blockers.length === 1 ? 'bloqueante pendiente' : 'bloqueantes pendientes'}` : summary.remaining.length ? 'Sin bloqueantes' : summary.total ? 'Listo para lanzar' : 'Sin tareas de lanzamiento'}</strong></div><div class="release-stats"><span><b>${summary.ready}</b> de ${summary.total} listas</span><span><b>${summary.remaining.length}</b> pendientes</span></div><div class="release-progress" role="progressbar" aria-label="Tareas listas para lanzar" aria-valuemin="0" aria-valuemax="${Math.max(1, summary.total)}" aria-valuenow="${summary.ready}"><i style="width:${summary.total ? (summary.ready / summary.total) * 100 : 0}%"></i></div></div>` : ''}${this.ctx.ui.board.boardProperties ? `<div class="properties-menu">${w.properties.map((p) => `<div><button data-action="property-toggle" data-id="${p.id}" aria-pressed="${w.visibleProperties.includes(p.id)}">${icon(w.visibleProperties.includes(p.id) ? 'check' : 'plus', 14)}${html(p.name)}</button>${p.custom ? btn('property-remove', 'trash', 'Eliminar ' + p.name, `data-id="${p.id}"`) : ''}</div>`).join('')}<form id="new-property"><input id="property-name" placeholder="Nombre de propiedad" aria-label="Nombre de propiedad" required><select id="property-type" aria-label="Tipo de propiedad"><option value="text">Texto</option><option value="date">Fecha</option><option value="number">Número</option></select><button type="submit" class="icon-button" aria-label="Agregar propiedad">${icon('plus')}</button></form></div>` : ''}<div class="board-content">${
      w.boardView === 'table'
        ? table
        : w.boardView === 'calendar'
          ? this.calendar()
          : `<div class="kanban">${statuses
              .map(
                (s) =>
                  `<section class="kanban-column" data-drop="${s}"><div class="column-heading"><i class="status-dot ${s}"></i><span>${statusNames[s]}</span><small>${w.tasks.filter((t) => t.status === s).length}</small></div>${ordered
                    .filter((t) => t.status === s)
                    .map((t) => this.card(t))
                    .join('')}</section>`,
              )
              .join('')}</div>`
    }</div></div>`;
  }
  dispose(): void {
    this.abort.abort();
  }
}
