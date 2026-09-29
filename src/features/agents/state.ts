export interface AgentsUi {
  agentTab: 'work' | 'memory' | 'capabilities';
}

export function createAgentsUi(): AgentsUi {
  return {
    agentTab: 'work',
  };
}
