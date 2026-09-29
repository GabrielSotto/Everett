export interface Intent {
  verb: string;
  requirement: string;
  interaction: string;
  source: 'pointer' | 'wheel' | 'keyboard' | 'service' | 'test';
}
export interface Entry {
  sequence: number;
  at: string;
  event: string;
  level: 'info' | 'warn' | 'error';
  interaction: string;
  command: string | null;
  verb: string | null;
  requirement: string | null;
  details: Record<string, unknown>;
}
export class Trace {
  private entries: Entry[] = [];
  private sequence = 0;
  private interactions = 0;
  private currentIntent: Intent | undefined;
  get activeIntent(): Intent | undefined {
    return this.currentIntent;
  }
  readonly session = 'ev-' + Date.now().toString(36);
  intent(
    verb: string,
    requirement: string,
    source: Intent['source'] = 'pointer',
    interaction?: string,
  ): Intent {
    return {
      verb,
      requirement,
      source,
      interaction: interaction ?? `${this.session}-${++this.interactions}`,
    };
  }
  add(
    event: string,
    details: Record<string, unknown> = {},
    intent?: Intent,
    command: string | null = null,
    level: Entry['level'] = 'info',
  ): void {
    if (intent) this.currentIntent = { ...intent };
    this.entries.push({
      sequence: ++this.sequence,
      at: new Date().toISOString(),
      event,
      level,
      interaction: intent?.interaction ?? this.session,
      command,
      verb: intent?.verb ?? null,
      requirement: intent?.requirement ?? null,
      details: structuredClone(details),
    });
    if (this.entries.length > 2000) this.entries.splice(0, this.entries.length - 2000);
  }
  error(error: unknown, source: string, intent?: Intent, command: string | null = null): void {
    const e = error instanceof Error ? error : new Error(String(error));
    this.add(
      'error',
      {
        source,
        name: e.name,
        message: e.message,
        stack: e.stack ?? '',
        cause: e.cause instanceof Error ? e.cause.message : null,
      },
      intent ?? this.currentIntent,
      command,
      'error',
    );
  }
  snapshot(): Entry[] {
    return structuredClone(this.entries);
  }
}
export const trace = new Trace();
