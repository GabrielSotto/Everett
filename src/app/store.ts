import { routeKey, type State, type Route } from '../domain/model';
import type { Command } from '../domain/command-types';
import { reduce, affectsView } from '../domain/reducer';
import { CanvasHistory } from '../domain/canvas-history';
import { validate } from '../domain/invariants';
import { trace, Trace, type Intent } from './diagnostics/trace';
import { traceInput } from './diagnostics/trace-input';
import { freezeState, type DeepReadonly } from '../domain/readonly';
export type Change = {
  command: Command;
  refresh: ReturnType<typeof affectsView>;
  intent: Intent;
  beforeRoute: Route;
};
export class Store {
  private state: State;
  private listeners = new Set<(change: Change) => void>();
  private seq = 0;
  readonly canvasHistory = new CanvasHistory();
  constructor(
    state: State,
    readonly log: Trace = trace,
  ) {
    validate(state);
    this.state = structuredClone(state);
    freezeState(this.state);
  }
  get(): DeepReadonly<State> {
    return this.state;
  }
  snapshot(): State {
    return structuredClone(this.state);
  }
  subscribe(fn: (change: Change) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  dispatch(command: Command, intent: Intent): void {
    command = structuredClone(command);
    const commandId = 'c-' + ++this.seq,
      before = routeKey(this.state.route);
    const beforeState = this.state,
      beforeRoute = beforeState.route;
    const summarize = (s: State) => ({
      route: routeKey(s.route),
      camera: s.camera,
      ancestry: s.history.map((f) => routeKey(f.route)),
      worlds: s.worlds.length,
      entities:
        'world' in command
          ? (() => {
              const w = s.worlds.find((w) => w.id === command.world);
              return w
                ? {
                    nodes: w.nodes.length,
                    zones: w.zones.length,
                    links: w.links.length,
                    agents: w.agents.length,
                    assignments: w.assignments.length,
                    shipping: w.shipping.active,
                  }
                : null;
            })()
          : null,
    });
    const target: Record<string, unknown> = {};
    if ('world' in command) target.world = command.world;
    if ('id' in command) target.id = command.id;
    if ('node' in command && typeof command.node === 'string') target.node = command.node;
    if ('agent' in command) target.agent = command.agent;
    if ('from' in command) target.from = command.from;
    if ('to' in command) target.to = command.to;
    if (command.type === 'navigate') target.route = routeKey(command.route);
    this.log.add(
      'command.received',
      {
        type: command.type,
        target,
        before,
        preState: summarize(beforeState),
        input: traceInput(command),
      },
      intent,
      commandId,
    );
    try {
      const direction =
        command.type === 'canvas.undo' ? 'undo' : command.type === 'canvas.redo' ? 'redo' : null;
      const candidate =
        direction && 'world' in command
          ? this.canvasHistory.candidate(this.state, command.world, direction)
          : reduce(this.state, command);
      validate(candidate);
      if (direction && 'world' in command)
        this.canvasHistory.commit(command.world, direction, this.state);
      else this.canvasHistory.record(this.state, candidate, command);
      this.state = candidate;
      freezeState(this.state);
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      this.log.add(
        'command.rejected',
        {
          type: command.type,
          target,
          before,
          name: e.name,
          message: e.message,
          stack: e.stack ?? '',
        },
        intent,
        commandId,
        'warn',
      );
      throw error;
    }
    this.log.add(
      'command.committed',
      {
        type: command.type,
        target,
        before,
        after: routeKey(this.state.route),
        postState: summarize(this.state),
      },
      intent,
      commandId,
    );
    this.listeners.forEach((fn) => {
      try {
        fn({ command, refresh: affectsView(command), intent, beforeRoute });
      } catch (error) {
        this.log.error(error, 'render.after:' + command.type, intent, commandId);
        throw error;
      }
    });
  }
}
