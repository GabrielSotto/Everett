import { getWorld, need, type Message, type WorldSnapshot } from '../domain/model';
import { parseShippingIntent, releaseSummary, shippingLabels } from '../domain/shipping';
import { Store } from './store';
import type { Intent } from './diagnostics/trace';
import { ensure } from '../domain/invariants';
import { materialText } from '../domain/material-content';
import { canvasProposal } from '../domain/canvas-proposal';
import { humanParticipants } from '../domain/conversations';
type Channel = 'messages' | 'chat' | 'codeMessages';

/** Simula respuestas locales y aplica sus acciones mediante los comandos compartidos del Mundo. */
export class AgentService {
  private disposed = false;
  private runs = new Map<string, { world: string; intent: Intent }>();
  private jobs = new Map<
    string,
    {
      timer: ReturnType<typeof setTimeout>;
      intent: Intent;
      run: string;
      world: string;
      assignment: string;
    }
  >();
  constructor(private readonly store: Store) {}
  private startRun(
    world: string,
    agent: string,
    purpose: string,
    tools: string[],
    intent: Intent,
    context?: { conversation: string; channel: Channel },
  ): string {
    ensure(!this.disposed, 'SERVICE_CLOSED', 'El servicio de agentes está cerrado');
    const id = 'run-' + crypto.randomUUID();
    this.store.dispatch(
      {
        type: 'agent.run.start',
        world,
        run: {
          id,
          agent,
          purpose,
          tools,
          startedAt: Date.now(),
          finishedAt: null,
          status: 'running',
          tokens: null,
          costUsd: null,
          error: null,
          traceId: intent.interaction,
          ...context,
        },
      },
      intent,
    );
    this.runs.set(id, { world, intent });
    this.store.log.add('agent.run.started', { world, agent, run: id, tools }, intent);
    return id;
  }
  private finishRun(
    world: string,
    id: string,
    intent: Intent,
    status: 'completed' | 'failed' | 'cancelled' = 'completed',
    error?: unknown,
  ): void {
    const run = getWorld(this.store.get(), world).runs.find((r) => r.id === id);
    if (!run || run.status !== 'running') {
      this.runs.delete(id);
      return;
    }
    const exception =
      error instanceof Error ? error : error === undefined ? null : new Error(String(error));
    this.store.dispatch(
      {
        type: 'agent.run.finish',
        world,
        id,
        at: Date.now(),
        status,
        error: exception
          ? { message: exception.message, stack: exception.stack ?? '', code: exception.name }
          : null,
      },
      intent,
    );
    this.runs.delete(id);
    this.store.log.add('agent.run.finished', { world, run: id, status }, intent);
  }
  private message(
    world: string,
    channel: Channel,
    text: string,
    role: Message['role'],
    name: string,
    intent: Intent,
    plan: string[] | null = null,
    materialIds: string[] = [],
    conversation?: string,
    messageId?: string,
  ): void {
    this.store.dispatch(
      {
        type: 'message',
        world,
        channel,
        message: {
          id: messageId ?? 'msg-' + crypto.randomUUID(),
          role,
          name,
          text,
          refs: [],
          plan,
          materialIds,
        },
        ...(conversation ? { conversation } : {}),
      },
      intent,
    );
  }
  private system(world: string, text: string, parent: Intent): string | null {
    const instruction = parseShippingIntent(text);
    if (!instruction) return null;
    const intent = this.store.log.intent(
      'gestionar shipping',
      'SHIPPING-02',
      'service',
      parent.interaction,
    );
    const w = getWorld(this.store.get(), world);
    if (instruction.type === 'set') {
      this.store.dispatch(
        {
          type: 'world.shipping',
          world,
          active: instruction.active,
          source: 'agent',
          at: Date.now(),
        },
        intent,
      );
      return instruction.active
        ? 'Shipping Mode activado. Voy a priorizar lo que falta para lanzar.'
        : 'Shipping Mode desactivado. El trabajo conserva su organización.';
    }
    if (instruction.type === 'task') {
      const task = w.tasks.find(
        (t) => t.title.toLocaleLowerCase() === instruction.query.toLocaleLowerCase(),
      );
      if (!task) return `No encontré la tarea «${instruction.query}». No cambié el alcance.`;
      this.store.dispatch(
        { type: 'task.shipping', world, id: task.id, role: instruction.role },
        intent,
      );
      return `${task.title}: ${shippingLabels[instruction.role]}.`;
    }
    const summary = releaseSummary(w);
    return `${w.shipping.active ? 'Shipping activo. ' : ''}${summary.ready} de ${summary.total} tareas listas.\n\n${summary.blockers.length ? 'Bloqueantes:\n' + summary.blockers.map((t) => '• ' + t.title).join('\n') : 'No hay bloqueantes abiertos.'}${
      summary.remaining.filter((t) => t.shipping !== 'blocker').length
        ? '\n\nTambién falta:\n' +
          summary.remaining
            .filter((t) => t.shipping !== 'blocker')
            .map((t) => '• ' + t.title)
            .join('\n')
        : ''
    }`;
  }
  private response(w: WorldSnapshot, text: string): { text: string; plan: string[] | null } {
    const shipping = w.shipping.active,
      summary = releaseSummary(w);
    const relevant = shipping ? summary.remaining : w.tasks;
    const plan = /plan|tarea|board/i.test(text)
      ? relevant.length
        ? relevant.slice(0, 4).map((t) => t.title)
        : ['Delimitar la idea', 'Reunir materiales', 'Preparar una prueba']
      : null;
    return {
      text: plan
        ? shipping
          ? 'Prioricemos el lanzamiento:'
          : 'Podemos organizar estos próximos pasos:'
        : shipping
          ? `El mundo está en Shipping Mode. ${summary.blockers.length} bloqueantes pendientes.\n\n${relevant[0]?.title ?? 'El alcance actual está completo.'}`
          : /resum|doc|contexto/i.test(text)
            ? (w.docs[0]?.body ?? w.objective)
            : w.objective || '¿Qué idea vamos a desarrollar?',
      plan,
    };
  }
  private completeConversation(world: string, id: string, intent: Intent): string {
    const w = getWorld(this.store.get(), world),
      run = need(
        w.runs.find((r) => r.id === id),
        'Trabajo inexistente',
      );
    const thread = need(
      w.conversations.find((c) => c.id === run.conversation),
      'Conversación inexistente',
    );
    const existing = thread.messages.find((m) => m.id === 'msg-' + id);
    if (existing) return existing.text;
    const system = this.system(world, run.purpose, intent),
      reply = this.response(getWorld(this.store.get(), world), run.purpose);
    const text = system ?? reply.text;
    this.message(
      world,
      run.channel ?? 'chat',
      text,
      'agent',
      need(
        w.agents.find((a) => a.id === run.agent),
        'Agente inexistente',
      ).name,
      intent,
      system ? null : reply.plan,
      [],
      thread.id,
      'msg-' + id,
    );
    return text;
  }
  async converse(
    world: string,
    channel: 'messages' | 'chat',
    text: string,
    materialIds: string[] = [],
    conversation?: string,
  ): Promise<void> {
    ensure(!this.disposed, 'SERVICE_CLOSED', 'El servicio de agentes está cerrado');
    if (!text.trim() && !materialIds.length) return;
    const intent = this.store.log.intent(
      'conversar',
      channel === 'chat' ? 'CHAT-02' : 'SESSION-01',
      'service',
    );
    this.message(
      world,
      channel,
      text,
      'user',
      this.store.get().profile.name,
      intent,
      null,
      materialIds,
      conversation,
    );
    const w = getWorld(this.store.get(), world),
      invoked = w.agents.find((a) => text.toLowerCase().includes('@' + a.name.toLowerCase()));
    const thread = w.conversations.find((c) => c.id === conversation) ?? w.conversations[0];
    if ((thread ? humanParticipants(thread.participants).length : 1) > 1 && !invoked) return;
    const agent = invoked ?? w.agents[0];
    if (!agent) return;
    const run = this.startRun(
      world,
      agent.id,
      text,
      parseShippingIntent(text) ? ['world.shipping', 'board.read'] : ['context.read'],
      intent,
      { conversation: need(thread, 'Conversación inexistente').id, channel },
    );
    try {
      await Promise.resolve();
      if (this.disposed) return;
      this.completeConversation(world, run, intent);
      this.finishRun(world, run, intent);
    } catch (error) {
      this.finishRun(world, run, intent, 'failed', error);
      throw error;
    }
  }
  async talk(world: string, agentId: string, text: string, conversation?: string): Promise<string> {
    if (!text.trim()) return '';
    const w = getWorld(this.store.get(), world),
      agent = need(
        w.agents.find((a) => a.id === agentId),
        'Agente inexistente',
      );
    const intent = this.store.log.intent('hablar con agente', 'AGENTS-03', 'service');
    const thread = need(
      w.conversations.find((c) => c.id === conversation) ?? w.conversations[0],
      'Conversación inexistente',
    );
    this.message(
      world,
      'messages',
      text,
      'user',
      this.store.get().profile.name,
      intent,
      null,
      [],
      thread.id,
    );
    const run = this.startRun(world, agent.id, text, ['context.read', 'world.shipping'], intent, {
      conversation: thread.id,
      channel: 'messages',
    });
    try {
      await Promise.resolve();
      if (this.disposed) return '';
      return this.completeConversation(world, run, intent);
    } catch (error) {
      this.finishRun(world, run, intent, 'failed', error);
      throw error;
    } finally {
      if (!this.disposed) this.finishRun(world, run, intent);
    }
  }
  async code(world: string, file: string, text: string, conversation?: string): Promise<void> {
    if (!text.trim()) return;
    const intent = this.store.log.intent('proponer cambios', 'CODE-02', 'service');
    const w = getWorld(this.store.get(), world),
      f = need(
        w.files.find((f) => f.id === file),
        'Archivo inexistente',
      );
    const agent = need(w.agents.find((a) => a.id === 'milo') ?? w.agents[0], 'Agente inexistente');
    const run = this.startRun(
      world,
      agent.id,
      text,
      ['file.read', 'proposal.prepare', 'world.shipping'],
      intent,
    );
    try {
      this.message(
        world,
        'codeMessages',
        text,
        'user',
        this.store.get().profile.name,
        intent,
        null,
        [],
        conversation,
      );
      const system = this.system(world, text, intent);
      if (system) {
        this.message(
          world,
          'codeMessages',
          system,
          'agent',
          agent.name,
          intent,
          null,
          [],
          conversation,
        );
        return;
      }
      if (w.proposal) throw new Error('Revisá primero la propuesta pendiente.');
      if (/explic|resum|qué hace|que hace/i.test(text)) {
        this.message(
          world,
          'codeMessages',
          `${f.name} contiene ${f.text.split('\n').length} líneas. ${f.text.includes('createCapture') ? 'createCapture construye un registro conservando su fuente.' : 'El archivo define materiales del mundo y una operación para agregarlos.'}`,
          'agent',
          agent.name,
          intent,
          null,
          [],
          conversation,
        );
        return;
      }
      let after = f.text,
        summary = '';
      if (/format|limpi|espacio/i.test(text)) {
        after =
          f.text
            .replace(/\t/g, '  ')
            .split('\n')
            .map((l) => l.trimEnd())
            .join('\n')
            .trimEnd() + '\n';
        summary = 'Normalización de espacios y final del archivo.';
      } else if (/valid|entrada|vac[ií]/i.test(text)) {
        after =
          f.text +
          '\nexport function isNonEmpty(value: unknown): value is string {\n  return typeof value === "string" && value.trim().length > 0;\n}\n';
        summary = 'Validador de texto para revisar antes de integrarlo.';
      } else if (/document|coment/i.test(text)) {
        after = '/**\n * ' + w.name + '\n * ' + w.objective + '\n */\n' + f.text;
        summary = 'Documentación del propósito del archivo.';
      } else {
        this.message(
          world,
          'codeMessages',
          '¿Querés que explique el archivo, revise su formato o prepare una validación?',
          'agent',
          agent.name,
          intent,
          null,
          [],
          conversation,
        );
        return;
      }
      await Promise.resolve();
      if (this.disposed) return;
      this.store.dispatch(
        {
          type: 'code.propose',
          world,
          proposal: { file, before: f.text, after, revision: f.revision, summary },
        },
        intent,
      );
      this.message(
        world,
        'codeMessages',
        summary,
        'agent',
        agent.name,
        intent,
        null,
        [],
        conversation,
      );
    } catch (error) {
      this.finishRun(world, run, intent, 'failed', error);
      throw error;
    } finally {
      this.finishRun(world, run, intent);
    }
  }
  process(world: string, id: string): void {
    const previous = this.jobs.get(world + ':' + id);
    if (previous) {
      clearTimeout(previous.timer);
      this.jobs.delete(world + ':' + id);
    }
    const w = getWorld(this.store.get(), world),
      a = need(
        w.assignments.find((a) => a.id === id),
        'Asignación inexistente',
      ),
      node = w.nodes.find((n) => n.id === a.node),
      intent = this.store.log.intent('entregar propuesta', 'OWNER-01', 'service');
    if (a.phase !== 'working') return;
    const run =
      a.runId && w.runs.some((r) => r.id === a.runId && r.status === 'running')
        ? a.runId
        : this.startRun(
            world,
            a.agent,
            a.instruction || 'Material asignado',
            ['material.read', 'proposal.prepare'],
            intent,
          );
    const source = a.input ?? (node ? materialText(w, node) : '');
    const instruction = [a.instruction, a.feedback].filter(Boolean).join('\n');
    const dueAt = a.dueAt ?? Date.now() + 1600;
    this.store.dispatch(
      { type: 'assignment.schedule', world, id, input: source, runId: run, dueAt },
      intent,
    );
    const text = canvasProposal(source, instruction, a.feedback);
    const timer = setTimeout(
      () => {
        try {
          const current = getWorld(this.store.get(), world).assignments.find(
            (job) => job.id === id && job.revision === a.revision,
          );
          if (current)
            this.store.dispatch(
              { type: 'assignment.ready', world, id, revision: a.revision, text },
              intent,
            );
          this.finishRun(world, run, intent, current ? 'completed' : 'cancelled');
        } catch (error) {
          this.finishRun(world, run, intent, 'failed', error);
          this.store.dispatch({ type: 'assignment.interrupt', world, id }, intent);
          this.store.log.error(error, 'AgentService.process', intent);
        } finally {
          this.jobs.delete(world + ':' + id);
        }
      },
      Math.max(0, dueAt - Date.now()),
    );
    this.jobs.set(world + ':' + id, { timer, intent, run, world, assignment: id });
  }
  cancel(world: string, id: string): void {
    const key = world + ':' + id,
      job = this.jobs.get(key);
    if (!job) return;
    clearTimeout(job.timer);
    this.finishRun(world, job.run, job.intent, 'cancelled');
    this.store.log.add('agent.job.cancelled', { world, id }, job.intent);
    this.jobs.delete(key);
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const job of this.jobs.values()) clearTimeout(job.timer);
    this.jobs.clear();
    this.runs.clear();
  }
  resume(): void {
    for (const world of this.store.get().worlds) {
      for (const run of world.runs.filter((r) => r.status === 'running' && r.conversation)) {
        const intent = this.store.log.intent('continuar conversación', 'C08-STATE-02', 'service');
        try {
          this.completeConversation(world.id, run.id, intent);
          this.finishRun(world.id, run.id, intent);
        } catch (error) {
          this.finishRun(world.id, run.id, intent, 'failed', error);
        }
      }
      for (const job of world.assignments)
        if (job.phase === 'working') {
          const run = world.runs.find((run) => run.id === job.runId);
          if (run && (run.status === 'failed' || run.status === 'cancelled'))
            this.store.dispatch(
              { type: 'assignment.interrupt', world: world.id, id: job.id },
              this.store.log.intent('recuperar interrupción confirmada', 'C08-STATE-02', 'service'),
            );
          else if (run?.status === 'completed') {
            if (job.text)
              this.store.dispatch(
                {
                  type: 'assignment.ready',
                  world: world.id,
                  id: job.id,
                  revision: job.revision,
                  text: job.text,
                },
                this.store.log.intent('recuperar resultado registrado', 'C08-STATE-02', 'service'),
              );
            else
              this.store.dispatch(
                { type: 'assignment.interrupt', world: world.id, id: job.id },
                this.store.log.intent('recuperar resultado ausente', 'C08-STATE-02', 'service'),
              );
          } else this.process(world.id, job.id);
        }
    }
  }
  cancelZone(world: string, zoneId: string): void {
    const w = getWorld(this.store.get(), world),
      zone = w.zones.find((z) => z.id === zoneId);
    for (const job of w.assignments.filter((a) => a.agent === zone?.agent))
      this.cancel(world, job.id);
  }
}
