import type { World } from './model';
import type { AgentRun } from './operations';
export function stableHash(text: string): number {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}
/** Los datos de ejemplo se reproducen con la semilla de sesión y el identificador del Mundo. */
export function seedAgentActivity(world: World, sessionSeed: number, now: number): void {
  const base = stableHash(world.id) + sessionSeed;
  const activeCount = base % 5 === 0 ? 0 : base % 5 === 4 ? 2 : 1;
  const offset = base % world.agents.length;
  world.runs = [];
  world.agents.forEach((agent, index) => {
    const count = 5 + ((base + index) % 5);
    const isActive = (index - offset + world.agents.length) % world.agents.length < activeCount;
    const tasks = world.tasks;
    for (let n = 0; n < count; n++) {
      const active = isActive && n === count - 1;
      const failed = !active && (base + index + n) % 7 === 0;
      const sample = stableHash(`${world.id}:${sessionSeed}:${agent.id}:${n}`);
      const duration = 9000 + (sample % 260000);
      const startedAt = active
        ? now - (60000 + (base % 180000))
        : now - (count - n) * 520000 - duration;
      const purpose =
        tasks[(n + index) % Math.max(tasks.length, 1)]?.title ?? 'Revisar materiales del mundo';
      const tokens = 850 + (stableHash(`tokens:${sample}`) % 7600);
      const run: AgentRun = {
        id: `history-${agent.id}-${n}`,
        agent: agent.id,
        purpose,
        tools:
          agent.id === 'milo'
            ? ['file.read', 'diff.compare', 'test.run']
            : agent.id === 'nora'
              ? ['context.search', 'document.read', 'reference.verify']
              : ['material.read', 'canvas.inspect', 'proposal.prepare'],
        startedAt,
        finishedAt: active ? null : startedAt + duration,
        status: active ? 'running' : failed ? 'failed' : 'completed',
        tokens,
        costUsd: Math.round(tokens * 0.000002 * 10000) / 10000,
        error: failed
          ? {
              code: 'RESOURCE_TIMEOUT',
              message: 'La fuente no respondió dentro del tiempo previsto',
              stack: `ResourceTimeout: ${purpose}\n    at reference.read (${world.id}/resources)\n    at ${agent.name}.run (${world.id}/agents/${agent.id})`,
            }
          : null,
        traceId: `trace-${world.id}-${agent.id}-${n}`,
      };
      world.runs.push(run);
    }
    agent.memory.push(
      `${world.name}: ${world.objective || 'Desarrollar la idea y conservar sus fuentes.'}`,
    );
  });
}
