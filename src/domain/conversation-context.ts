import type { WorldSnapshot } from './model';
export interface ConversationContext {
  capacity: number;
  conversation: number;
  materials: number;
  memory: number;
  used: number;
  available: number;
}
/** Estima por caracteres el uso del presupuesto de contexto configurado en el prototipo. */
export function conversationContext(world: WorldSnapshot): ConversationContext {
  const estimate = (text: string) => Math.ceil(text.length / 4);
  const conversation = estimate(world.messages.map((m) => m.text).join('\n'));
  const materials = estimate(world.objective + '\n' + world.docs.map((d) => d.body).join('\n'));
  const memory = estimate(world.agents.flatMap((a) => a.memory).join('\n'));
  const capacity = 128000,
    used = conversation + materials + memory;
  return {
    capacity,
    conversation,
    materials,
    memory,
    used,
    available: Math.max(0, capacity - used),
  };
}
