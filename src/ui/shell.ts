import { exportDiagnostics } from '../platform/export-diagnostics';
import type { Context } from '../app/context';
import { profileLimits } from '../domain/profile';
import { surfaces, surfaceNames, activeWorld } from '../domain/model';
import { conversationContext } from '../domain/conversation-context';
import { html, target } from './dom';
import { btn, icon } from './icons';
import { bindDismiss } from './popover';
import { PanelMotion } from './panel-motion';
import { trace } from '../app/diagnostics/trace';

export class Shell {
  private abort = new AbortController();
  private readonly panels: PanelMotion;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    this.panels = new PanelMotion(root, [
      '.profile-pop',
      '.status-pop',
      '.filter-pop',
      '.surface-menu',
    ]);
    bindDismiss(
      this.abort.signal,
      () =>
        ctx.ui.shell.profile ||
        ctx.ui.shell.status ||
        ctx.ui.shell.filters ||
        ctx.ui.shell.surfaceMenu,
      (source) => {
        const action = ctx.ui.shell.profile
          ? 'profile'
          : ctx.ui.shell.status
            ? 'status'
            : ctx.ui.shell.filters
              ? 'filters'
              : 'surface-menu';
        ctx.ui.shell.profile =
          ctx.ui.shell.status =
          ctx.ui.shell.filters =
          ctx.ui.shell.surfaceMenu =
            false;
        this.render();
        if (source === 'keyboard')
          root
            .querySelector<HTMLElement>(`[data-action="${action}"]`)
            ?.focus({ preventScroll: true });
      },
      '#shell',
    );
    root.addEventListener(
      'click',
      (e) => {
        const t = target(e);
        if (!t) return;
        const ui = ctx.ui;
        switch (t.dataset.action) {
          case 'wordmark':
            ctx.act({ type: 'universe' }, 'volver al universo', 'NAV-01');
            break;
          case 'search':
            ui.shell.searchOpen = !ui.shell.searchOpen;
            ui.shell.filters = false;
            this.render();
            if (ui.shell.searchOpen)
              root.querySelector<HTMLInputElement>('#global-search')?.focus();
            break;
          case 'search-clear':
            ui.shell.search = '';
            ui.shell.searchOpen = false;
            this.render();
            ctx.render();
            break;
          case 'filters':
            ui.shell.filters = !ui.shell.filters;
            ui.shell.status = ui.shell.profile = ui.shell.surfaceMenu = false;
            this.render();
            break;
          case 'status':
            ui.shell.status = !ui.shell.status;
            ui.shell.profile = ui.shell.filters = ui.shell.surfaceMenu = false;
            this.render();
            break;
          case 'profile':
            ui.shell.profile = !ui.shell.profile;
            ui.shell.status = ui.shell.filters = ui.shell.surfaceMenu = false;
            this.render();
            break;
          case 'profile-tab': {
            const tab = t.dataset.tab;
            if (tab === 'identity' || tab === 'preferences' || tab === 'tools') {
              ui.shell.profileTab = tab;
              this.render();
            }
            break;
          }
          case 'surface-menu':
            ui.shell.surfaceMenu = !ui.shell.surfaceMenu;
            ui.shell.profile = ui.shell.filters = ui.shell.status = false;
            this.render();
            break;
          case 'surface': {
            const s = surfaces.find((s) => s === t.dataset.id),
              w = activeWorld(ctx.store.get());
            if (s && w) {
              ui.shell.surfaceMenu = false;
              ctx.go({ kind: 'surface', world: w.id, surface: s, entity: null });
            }
            break;
          }
          case 'archived-filter':
            ui.shell.archived = !ui.shell.archived;
            this.render();
            ctx.render();
            break;
          case 'archive': {
            const w = activeWorld(ctx.store.get());
            if (w) ctx.act({ type: 'world.archive', world: w.id }, 'archivar mundo', 'UNIVERSE-05');
            break;
          }
          case 'diagnostics':
            exportDiagnostics(trace, {
              route: ctx.store.get().route,
              camera: ctx.currentCamera(),
              worldCount: ctx.store.get().worlds.length,
            });
            break;
          case 'shortcuts':
            ctx.notice(
              'Alt + rueda: entrar / salir · H: panear · V: seleccionar · Ctrl K: buscar · Ctrl Shift D: diagnóstico',
            );
            break;
          case 'search-result': {
            const world = t.dataset.world,
              id = t.dataset.id,
              s = t.dataset.surface;
            if (!world) return;
            ui.shell.searchOpen = false;
            ui.shell.search = '';
            if (s === 'docs' || s === 'code' || s === 'board' || s === 'agents')
              ctx.go({ kind: 'surface', world, surface: s, entity: id ?? null });
            else ctx.go({ kind: 'world', world });
            break;
          }
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'paste',
      (e) => {
        const field = e.target;
        if (
          !(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) ||
          !['profile-name', 'profile-bio'].includes(field.id)
        )
          return;
        const limit = field.id === 'profile-name' ? profileLimits.name : profileLimits.bio;
        const pasted = e.clipboardData?.getData('text/plain') ?? '';
        const length =
          field.value.length -
          ((field.selectionEnd ?? 0) - (field.selectionStart ?? 0)) +
          pasted.length;
        if (length > limit) {
          e.preventDefault();
          ctx.notice(`Máximo ${limit} caracteres. No se pegó el texto.`, true);
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'input',
      (e) => {
        if (e.target instanceof HTMLTextAreaElement && e.target.id === 'profile-bio') {
          const count = root.querySelector('#profile-bio-count');
          if (count) count.textContent = `${e.target.value.length} / ${profileLimits.bio}`;
        }
        if (e.target instanceof HTMLInputElement && e.target.id === 'global-search') {
          ctx.ui.shell.search = e.target.value;
          if (ctx.store.get().route.kind === 'universe') ctx.render();
          else this.results();
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'change',
      (e) => {
        if (e.target instanceof HTMLSelectElement && e.target.id === 'world-filter') {
          ctx.ui.shell.region = e.target.value;
          ctx.render();
        }
        if (e.target instanceof HTMLInputElement && e.target.id === 'world-name') {
          const w = activeWorld(ctx.store.get());
          if (w)
            ctx.act(
              { type: 'world.rename', world: w.id, name: e.target.value },
              'nombrar mundo',
              'UNIVERSE-03',
            );
        }
        const el = e.target;
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement
        ) {
          const p = ctx.store.get().profile;
          if (el.id === 'profile-name')
            ctx.act(
              { type: 'profile.edit', profile: { ...p, name: el.value } },
              'editar perfil',
              'PROFILE-01',
            );
          if (el.id === 'profile-bio')
            ctx.act(
              { type: 'profile.edit', profile: { ...p, bio: el.value } },
              'editar perfil',
              'PROFILE-01',
            );
          if (el.id === 'profile-language' && (el.value === 'es-AR' || el.value === 'es-ES'))
            ctx.act(
              { type: 'profile.edit', profile: { ...p, language: el.value } },
              'cambiar idioma de dictado',
              'PROFILE-01',
            );
        }
      },
      { signal: this.abort.signal },
    );
  }
  private results(): void {
    const holder = this.root.querySelector<HTMLElement>('#global-results');
    if (!holder) return;
    const q = this.ctx.ui.shell.search.toLocaleLowerCase();
    if (!q) {
      holder.innerHTML = '';
      return;
    }
    const results: string[] = [];
    for (const w of this.ctx.store.get().worlds) {
      if (w.name.toLocaleLowerCase().includes(q))
        results.push(
          `<button data-action="search-result" data-world="${w.id}">${html(w.name)}</button>`,
        );
      for (const d of w.docs)
        if ((d.title + ' ' + d.body).toLocaleLowerCase().includes(q))
          results.push(
            `<button data-action="search-result" data-world="${w.id}" data-surface="docs" data-id="${d.id}">${icon('docs', 14)}${html(d.title)}</button>`,
          );
    }
    holder.innerHTML = results.slice(0, 7).join('');
  }
  private status(): string {
    const s = this.ctx.store.get(),
      w = activeWorld(s);
    if (!w) {
      const focused = s.worlds.find((item) => item.id === this.ctx.camera?.focused);
      return `<div class="popover status-pop"><h3>Estado</h3><dl><dt>Mundos</dt><dd>${s.worlds.length}</dd><dt>En foco</dt><dd>${html(focused?.name ?? (this.ctx.camera?.focused === 'new' ? 'Nuevo mundo' : 'Sin foco'))}</dd></dl></div>`;
    }
    const r = s.route,
      context = conversationContext(w),
      conversational = r.kind === 'surface' && r.surface === 'session';
    const count = (n: number) => n.toLocaleString('es-AR');
    return `<div class="popover status-pop"><h3>Estado</h3><dl><dt>Mundo</dt><dd>${html(w.name)}</dd><dt>Superficie</dt><dd>${r.kind === 'surface' ? surfaceNames[r.surface] : r.kind === 'note' ? 'Canvas' : 'Superficies'}</dd>${r.kind === 'surface' && r.surface === 'code' ? `<dt>Rama</dt><dd>${html(w.branch)}</dd><dt>Archivos modificados</dt><dd>${w.files.filter((f) => f.text !== f.saved).length}</dd>` : ''}<dt>Agentes trabajando</dt><dd>${new Set(w.runs.filter((run) => run.status === 'running').map((run) => run.agent)).size}</dd><dt>Shipping Mode</dt><dd class="shipping-value">${w.shipping.active ? 'Activo' : 'Desactivado'}</dd></dl>${conversational ? `<section class="context-budget" data-used="${context.used}" data-capacity="${context.capacity}"><h4>Ventana de contexto</h4><div class="budget-value"><strong>${count(context.used)}</strong><span>/ ${count(context.capacity)} tokens</span></div><div class="budget-track"><i style="width:${Math.min(100, (context.used / context.capacity) * 100)}%"></i></div><dl><dt>Conversación</dt><dd>${count(context.conversation)}</dd><dt>Materiales incluidos</dt><dd>${count(context.materials)}</dd><dt>Memoria fijada</dt><dd>${count(context.memory)}</dd><dt>Disponible</dt><dd>${count(context.available)}</dd></dl><small>Estimación por caracteres</small></section>` : ''}<h4>Recursos del mundo</h4><div class="context-resources">${w.docs
      .slice(0, 3)
      .map((d) => `<span>${icon('docs', 12)}${html(d.title)}</span>`)
      .join('')}${w.files
      .slice(0, 2)
      .map((f) => `<span>${icon('code', 12)}${html(f.name)}</span>`)
      .join('')}</div></div>`;
  }
  private profile(): string {
    const p = this.ctx.store.get().profile,
      tab = this.ctx.ui.shell.profileTab,
      w = activeWorld(this.ctx.store.get());
    return `<div class="popover profile-pop"><div class="profile-identity"><span class="profile-avatar">${html(p.name.slice(0, 1).toUpperCase())}</span><div><strong>${html(p.name)}</strong><small>${this.ctx.store.get().worlds.length} mundos en total · ${this.ctx.store.get().worlds.filter((world) => world.archived).length} archivados</small></div></div><nav class="profile-tabs">${(['identity', 'preferences', 'tools'] as const).map((t) => `<button data-action="profile-tab" data-tab="${t}" class="${t === tab ? 'active' : ''}">${{ identity: 'Perfil', preferences: 'Preferencias', tools: 'Herramientas' }[t]}</button>`).join('')}</nav>${tab === 'identity' ? `<div class="profile-field"><label for="profile-name">Nombre</label><input id="profile-name" aria-label="Nombre de perfil" maxlength="${profileLimits.name}" value="${html(p.name)}"></div><div class="profile-field"><label for="profile-bio">Sobre vos</label><textarea id="profile-bio" rows="4" maxlength="${profileLimits.bio}" aria-label="Descripción del perfil" placeholder="Sobre vos…">${html(p.bio)}</textarea><span class="profile-counter" id="profile-bio-count">${p.bio.length} / ${profileLimits.bio}</span></div>` : tab === 'preferences' ? `<label class="preference-line" for="profile-language">Idioma de dictado<select id="profile-language"><option value="es-AR" ${p.language === 'es-AR' ? 'selected' : ''}>Español · Argentina</option><option value="es-ES" ${p.language === 'es-ES' ? 'selected' : ''}>Español · España</option></select></label>` : `${w ? `<button data-action="archive">${icon('archive', 15)}${w.archived ? 'Desarchivar mundo' : 'Archivar mundo'}</button>` : ''}<button data-action="shortcuts">${icon('help', 15)}Atajos</button><button data-action="diagnostics">${icon('download', 15)}Exportar diagnóstico</button>`}</div>`;
  }
  render(): void {
    const finishPanels = this.panels.prepare();
    const { ctx } = this,
      ui = ctx.ui,
      s = ctx.store.get(),
      w = activeWorld(s),
      p = s.profile;
    this.root.className =
      'shell ' + (s.route.kind === 'universe' || s.route.kind === 'world' ? 'dark-shell' : '');
    this.root.innerHTML = `<button class="wordmark" data-action="wordmark">Everett</button>${w ? `<div class="location"><input id="world-name" aria-label="Nombre del mundo" value="${html(w.name)}" style="width:${Math.min(250, Math.max(75, w.name.length * 8 + 12))}px">${s.route.kind === 'surface' || s.route.kind === 'note' ? icon('chevron', 12) + `<span>${s.route.kind === 'note' ? 'Canvas' : surfaceNames[s.route.surface]}</span>` : ''}${w.shipping.active ? `<span class="shipping-indicator" data-tip="Shipping Mode activo" aria-label="Shipping Mode activo">${icon('rocket', 13)}</span>` : ''}</div>` : ''}<div class="shell-spacer"></div><div class="global-search ${ui.shell.searchOpen ? 'open' : ''}"><input id="global-search" aria-label="Buscar en Everett" placeholder="Buscar…" value="${html(ui.shell.search)}" ${ui.shell.searchOpen ? '' : 'inert'}>${ui.shell.searchOpen ? btn('search-clear', 'close', 'Cerrar búsqueda') : ''}${btn('search', 'search', 'Buscar en Everett', 'aria-expanded="' + ui.shell.searchOpen + '"')}</div>${s.route.kind === 'universe' ? btn('filters', 'filter', 'Filtrar mundos', `data-count="${s.worlds.length}"`, ui.shell.filters) : btn('surface-menu', 'grid', 'Superficies', '', ui.shell.surfaceMenu)}${btn('status', 'status', 'Estado', '', ui.shell.status)}<button class="profile-button" data-action="profile" aria-label="Perfil de ${html(p.name)}" data-tip="${html(p.name)}">${html(p.name.slice(0, 1).toUpperCase())}</button>${ui.shell.surfaceMenu ? `<div class="surface-menu">${surfaces.map((surface) => btn('surface', surface, surfaceNames[surface], `data-id="${surface}"`, s.route.kind === 'surface' && s.route.surface === surface)).join('')}</div>` : ''}${ui.shell.filters ? `<div class="popover filter-pop"><span class="world-count">${s.worlds.length} mundos actuales</span><span class="world-count-details">${s.worlds.length - s.worlds.filter((world) => world.archived).length} activos · ${s.worlds.filter((world) => world.archived).length} archivados</span><select id="world-filter" aria-label="Región">${['Todas', 'Desarrollo', 'Diseño', 'Investigación', 'Ideas'].map((x) => `<option ${ui.shell.region === x ? 'selected' : ''}>${x}</option>`).join('')}</select><button class="filter-archive ${ui.shell.archived ? 'active' : ''}" data-action="archived-filter">${icon('archive', 14)}Archivados</button></div>` : ''}${ui.shell.status ? this.status() : ''}${ui.shell.profile ? this.profile() : ''}<div id="global-results" class="search-results"></div>`;
    if (ui.shell.searchOpen && s.route.kind !== 'universe') this.results();
    finishPanels();
  }
  dispose(): void {
    this.panels.dispose();
    this.abort.abort();
  }
}
