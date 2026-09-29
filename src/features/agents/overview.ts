import type { WorldSnapshot, Agent } from '../../domain/model';
import type { AgentRun } from '../../domain/operations';
import type { DeepReadonly } from '../../domain/readonly';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';
export function formatDuration(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return seconds < 60
    ? `${seconds}s`
    : seconds < 3600
      ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
      : `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
export function agentStatus(
  world: WorldSnapshot,
  agent: DeepReadonly<Agent>,
): { label: string; state: string; run: DeepReadonly<AgentRun> | undefined } {
  const active = world.runs.find((r) => r.agent === agent.id && r.status === 'running');
  return {
    label: active ? 'Trabajando' : agent.active ? 'Disponible' : 'En pausa',
    state: active ? 'progress' : agent.active ? 'done' : 'pending',
    run: active,
  };
}
function chart(runs: readonly DeepReadonly<AgentRun>[], metric: 'duration' | 'tokens'): string {
  const values = runs
    .slice(-9)
    .map((r) =>
      metric === 'tokens'
        ? (r.tokens ?? 0)
        : Math.max(0, (r.finishedAt ?? Date.now()) - r.startedAt) / 1000,
    );
  const max = Math.max(1, ...values),
    gap = 9,
    width = 260 / Math.max(1, values.length) - gap;
  return `<svg viewBox="0 0 280 100" role="img" aria-label="${metric === 'tokens' ? 'Tokens por ejecución' : 'Duración en segundos por ejecución'}"><path d="M10 85H274" stroke="currentColor" opacity=".16"/><path d="M10 46H274" stroke="currentColor" stroke-dasharray="2 5" opacity=".10"/>${values.map((v, i) => `<rect data-value="${v}" x="${10 + i * (width + gap)}" y="${85 - (v / max) * 64}" width="${width}" height="${Math.max(1, (v / max) * 64)}" rx="3" fill="currentColor" opacity="${runs.slice(-9)[i]?.status === 'failed' ? '.36' : '.80'}"><title>${metric === 'tokens' ? v.toLocaleString('es-AR') + ' tokens' : formatDuration(v * 1000)}</title></rect>`).join('')}<text x="274" y="13" text-anchor="end" fill="currentColor" font-size="8">${Math.ceil(max).toLocaleString('es-AR')}${metric === 'duration' ? ' s' : ''}</text></svg>`;
}
export function agentOverview(world: WorldSnapshot, agent: DeepReadonly<Agent>): string {
  const runs = world.runs.filter((run) => run.agent === agent.id),
    active = runs.filter((run) => run.status === 'running'),
    completed = runs.filter((run) => run.status === 'completed'),
    failed = runs.filter((run) => run.status === 'failed');
  const elapsed = runs.reduce(
    (sum, run) => sum + Math.max(0, (run.finishedAt ?? Date.now()) - run.startedAt),
    0,
  );
  const cost = runs.some((run) => run.costUsd !== null)
    ? '$' + runs.reduce((n, run) => n + (run.costUsd ?? 0), 0).toFixed(4)
    : '—';
  const tokens = runs.some((run) => run.tokens !== null)
    ? runs.reduce((n, run) => n + (run.tokens ?? 0), 0).toLocaleString('es-AR')
    : '—';
  const now = active[0],
    tools = [...new Set((now ? [now] : runs).flatMap((run) => run.tools))];
  return `<section class="agent-overview" aria-label="Actividad del agente" data-agent="${agent.id}"><div class="operation-metrics"><div><span>En actividad</span><strong data-metric="active">${active.length}</strong></div><div><span>Completadas</span><strong data-metric="completed">${completed.length}</strong></div><div><span>Duración acumulada</span><strong data-metric="elapsed">${formatDuration(elapsed)}</strong></div><div><span>Coste · USD</span><strong data-metric="cost">${cost}</strong></div><div><span>Tokens</span><strong data-metric="tokens">${tokens}</strong></div><div><span>Errores</span><strong data-metric="errors">${failed.length}</strong></div></div><div class="current-operation ${now ? 'running' : ''}"><span class="status-dot ${now ? 'progress' : 'done'}"></span><div><h3>${now ? 'Ahora' : 'Disponible'}</h3><p>${html(now?.purpose ?? 'Sin trabajo activo')}</p>${now ? `<span class="live-duration" data-live-start="${now.startedAt}">${formatDuration(Date.now() - now.startedAt)}</span>` : ''}</div>${world.shipping.active ? `<span class="release-tag">${icon('rocket', 12)}Shipping Mode</span>` : ''}</div>${tools.length ? `<div class="tool-tags">${tools.map((tool) => `<span>${html(tool)}</span>`).join('')}</div>` : ''}<div class="operation-charts"><figure class="run-chart"><figcaption>Duración por ejecución</figcaption>${chart(runs, 'duration')}</figure><figure class="run-chart token-chart"><figcaption>Consumo por ejecución</figcaption>${chart(runs, 'tokens')}</figure></div><div class="execution-list">${runs
    .slice(-7)
    .reverse()
    .map(
      (run) =>
        `<details class="execution" data-run="${run.id}"><summary><i class="status-dot ${run.status === 'completed' ? 'done' : run.status === 'running' ? 'progress' : 'review'}"></i><strong>${html(run.purpose)}</strong><span>${run.status === 'running' ? 'En curso' : formatDuration((run.finishedAt ?? Date.now()) - run.startedAt)}</span></summary><div class="execution-detail"><dl><dt>Inicio</dt><dd>${new Date(run.startedAt).toLocaleString('es-AR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd><dt>Duración</dt><dd>${formatDuration((run.finishedAt ?? Date.now()) - run.startedAt)}</dd><dt>Herramientas</dt><dd>${html(run.tools.join(' → ')) || '—'}</dd><dt>Tokens</dt><dd>${run.tokens === null ? 'Sin medición' : run.tokens.toLocaleString('es-AR')}</dd><dt>Coste · USD</dt><dd>${run.costUsd === null ? 'Sin medición' : '$' + run.costUsd.toFixed(4)}</dd><dt>Estado</dt><dd>${run.status === 'running' ? 'En curso' : run.status === 'completed' ? 'Completada' : run.status === 'failed' ? 'Error' : 'Cancelada'}</dd><dt>Traza</dt><dd><code>${html(run.traceId)}</code></dd></dl>${run.error ? `<p class="error-message">${html(run.error.message)}</p><pre>${html(run.error.stack)}</pre>` : ''}</div></details>`,
    )
    .join(
      '',
    )}</div>${failed.length ? `<div class="agent-errors"><h3>Errores recientes</h3>${failed.map((run) => `<details data-error-code="${html(run.error?.code)}"><summary>${html(run.error?.message)}<time>${new Date(run.finishedAt ?? run.startedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time></summary><code>${html(run.traceId)}</code><pre>${html(run.error?.stack)}</pre></details>`).join('')}</div>` : ''}</section>`;
}
