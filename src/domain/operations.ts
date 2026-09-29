export interface AgentRun {
  id: string;
  agent: string;
  purpose: string;
  tools: string[];
  startedAt: number;
  finishedAt: number | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  tokens: number | null;
  costUsd: number | null;
  error: { message: string; stack: string; code: string } | null;
  traceId: string;
}
