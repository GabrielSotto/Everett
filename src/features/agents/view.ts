import type { Context } from '../../app/context';
import { html, target, value, preserveFocus, type View } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
import { contextualComposer, bindComposer, preserveComposerDrafts } from '../../ui/composer';
import { agentOverview, agentStatus, formatDuration } from './overview';
import { ComposerDisclosure } from '../../ui/disclosure';
export class AgentsView implements View {
  private abort = new AbortController();
  private disclosure: ComposerDisclosure;
  private creating = false;
  private talk = false;
  private answer = '';
  private busy = false;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    this.disclosure = new ComposerDisclosure(root, '.agent-space');
    bindComposer(root, this.abort.signal, ctx);
    root.addEventListener(
      'click',
      (e) => {
        const t = target(e);
        if (!t) return;
        const w = ctx.world(),
          a = this.agent();
        switch (t.dataset.action) {
          case 'agent-open':
            ctx.go(
              { kind: 'surface', world: w.id, surface: 'agents', entity: t.dataset.id ?? null },
              t.getBoundingClientRect(),
            );
            break;
          case 'agent-new':
            this.creating = !this.creating;
            this.render();
            root.querySelector<HTMLInputElement>('#agent-name')?.focus();
            break;
          case 'agent-create-confirm':
            this.create();
            break;
          case 'agent-tab': {
            const tab = t.dataset.tab;
            if (tab === 'work' || tab === 'memory' || tab === 'capabilities') {
              ctx.ui.agents.agentTab = tab;
              this.render();
            }
            break;
          }
          case 'agent-toggle':
            if (a)
              ctx.act(
                { type: 'agent.toggle', world: w.id, id: a.id },
                'pausar agente',
                'AGENTS-01',
              );
            break;
          case 'memory-remove':
            if (a)
              ctx.act(
                {
                  type: 'agent.memory',
                  world: w.id,
                  id: a.id,
                  text: '',
                  remove: Number(t.dataset.index),
                },
                'quitar memoria',
                'AGENTS-01',
              );
            break;
          case 'agent-talk':
            this.talk = !this.talk;
            this.disclosure.setOpen(this.talk);
            break;
          case 'agent-task':
            ctx.go({
              kind: 'surface',
              world: w.id,
              surface: 'board',
              entity: t.dataset.id ?? null,
            });
            break;
          case 'response-close':
            this.answer = '';
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
        const a = this.agent();
        if (e.target.id === 'agent-create') {
          e.preventDefault();
          this.create();
        }
        if (e.target.id === 'memory-add' && a) {
          e.preventDefault();
          ctx.act(
            {
              type: 'agent.memory',
              world: ctx.world().id,
              id: a.id,
              text: value(root, '#memory-input'),
              remove: null,
            },
            'fijar memoria',
            'AGENTS-01',
          );
        }
        if (e.target.id === 'agent-composer' && a) {
          e.preventDefault();
          const text = value(root, '#agent-composer-input');
          if (!text.trim() || this.busy) return;
          const field = root.querySelector<HTMLTextAreaElement>('#agent-composer-input');
          if (field) {
            field.value = '';
            field.dispatchEvent(new Event('input', { bubbles: true }));
          }
          this.busy = true;
          void ctx.service
            .talk(ctx.world().id, a.id, text)
            .then((answer) => {
              this.answer = answer;
            })
            .catch((error) => ctx.fail(error, 'agents.talk'))
            .finally(() => {
              this.busy = false;
              if (!this.abort.signal.aborted) this.render();
            });
        }
      },
      { signal: this.abort.signal },
    );
    const timer = setInterval(
      () =>
        root.querySelectorAll<HTMLElement>('[data-live-start]').forEach((el) => {
          el.textContent = formatDuration(Date.now() - Number(el.dataset.liveStart));
        }),
      1000,
    );
    this.abort.signal.addEventListener('abort', () => clearInterval(timer), { once: true });
    this.render();
  }
  private create(): void {
    const name = value(this.root, '#agent-name');
    this.creating = false;
    if (
      this.ctx.act(
        { type: 'agent.create', world: this.ctx.world().id, name },
        'crear agente',
        'CREATE-02',
      )
    ) {
      const created = this.ctx.world().agents.at(-1);
      if (created)
        this.ctx.go({
          kind: 'surface',
          world: this.ctx.world().id,
          surface: 'agents',
          entity: created.id,
        });
    }
  }
  private agent() {
    const r = this.ctx.store.get().route;
    return r.kind === 'surface'
      ? this.ctx.world().agents.find((a) => a.id === r.entity)
      : undefined;
  }
  render(): void {
    const w = this.ctx.world(),
      a = this.agent(),
      tab = this.ctx.ui.agents.agentTab;
    const restoreDraft = preserveComposerDrafts(this.root),
      restoreFocus = preserveFocus(this.root);
    if (!a) {
      this.root.innerHTML = `<div class="agents-layout"><div class="agents-toolbar">${this.creating ? `<form id="agent-create"><input id="agent-name" placeholder="Nombre del agente" aria-label="Nombre del agente"><button type="button" data-action="agent-create-confirm" class="icon-button" aria-label="Confirmar creación del agente" data-tip="Crear agente">${icon('check', 18)}</button></form>` : ''}${btn('agent-new', this.creating ? 'close' : 'plus', this.creating ? 'Cancelar creación' : 'Crear agente')}</div><div class="agents-grid">${w.agents
        .map((agent) => {
          const status = agentStatus(w, agent),
            runs = w.runs.filter((run) => run.agent === agent.id);
          return `<button class="agent-card ${status.run ? 'working' : ''}" data-action="agent-open" data-id="${agent.id}" data-ref-kind="agent" data-ref-id="${agent.id}"><div class="agent-orb" style="--agent-color:${agent.color}">${icon('agents', 32)}</div><h2>${html(agent.name)}</h2><p>${html(agent.role)}</p><span class="agent-availability" data-status="${status.state}"><i class="status-dot ${status.state}"></i>${status.label}</span><div class="agent-current">${html(status.run?.purpose ?? runs.at(-1)?.purpose ?? 'Sin actividad previa')}</div><div class="agent-card-foot"><span>${runs.filter((r) => r.status === 'completed').length} completadas</span><span>${agent.memory.length} notas</span></div></button>`;
        })
        .join('')}</div></div>`;
      return;
    }
    const status = agentStatus(w, a);
    this.root.innerHTML = `<div class="agent-space"><div class="agent-identity"><div class="agent-orb" style="--agent-color:${a.color}">${icon('agents', 34)}</div><div><h1>${html(a.name)}</h1><p>${html(a.role)} <span class="agent-availability"><i class="status-dot ${status.state}"></i>${status.label}</span></p></div>${btn('agent-toggle', a.active ? 'pause' : 'play', a.active ? 'Pausar agente' : 'Activar agente')}</div><div class="agent-tabs">${btn('agent-tab', 'board', 'Trabajo', 'data-tab="work"', tab === 'work')}${btn('agent-tab', 'pin', 'Memoria', 'data-tab="memory"', tab === 'memory')}${btn('agent-tab', 'agents', 'Capacidades', 'data-tab="capabilities"', tab === 'capabilities')}</div><div class="agent-body">${
      tab === 'work'
        ? `<div class="agent-work">${agentOverview(w, a)}${w.tasks
            .filter((t) => t.assignee === a.name)
            .map(
              (t) =>
                `<button data-action="agent-task" data-id="${t.id}"><i class="status-dot ${t.status}"></i>${html(t.title)}${icon('chevron', 14)}</button>`,
            )
            .join('')}</div>`
        : tab === 'memory'
          ? `<div class="memory-grid">${a.memory.map((m, i) => `<article class="memory-note">${icon('pin', 15)}<p>${html(m)}</p>${btn('memory-remove', 'close', 'Quitar nota', `data-index="${i}"`)}</article>`).join('')}</div><form id="memory-add"><input id="memory-input" aria-label="Fijar contexto" placeholder="Fijar una nota…"><button type="submit" class="icon-button" aria-label="Guardar nota">${icon('plus')}</button></form>`
          : `<div class="capabilities">${a.capabilities.map((cap) => `<div>${icon('check', 16)}<span>${html(cap)}</span></div>`).join('')}</div>`
    }</div></div><div class="code-fab-anchor"><button class="agent-fab ${this.talk ? 'active' : ''}" data-action="agent-talk" aria-label="Hablar con ${html(a.name)}" aria-expanded="${this.talk}" data-tip="Hablar con ${html(a.name)}">${icon('session', 21)}</button><div class="composer-reveal ${this.talk ? 'open' : ''}" ${this.talk ? '' : 'inert'}>${contextualComposer(this.ctx, 'agent-composer', 'Conversá con ' + a.name + '…', false, '', a.id)}</div>${this.answer ? `<div class="agent-response"><div class="response-close">${btn('response-close', 'close', 'Cerrar respuesta')}</div><p>${html(this.answer)}</p></div>` : ''}</div>`;
    restoreDraft();
    restoreFocus();
    this.disclosure.sync(this.talk);
  }
  closeTransient(): boolean {
    if (!this.talk) return false;
    this.talk = false;
    this.disclosure.setOpen(false);
    return true;
  }
  dispose(): void {
    this.disclosure.dispose();
    this.abort.abort();
  }
}
