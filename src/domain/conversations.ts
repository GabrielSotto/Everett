import { need, type WorldSnapshot } from './model';
import type { Ui } from '../app/ui-state';

export function conversation(world: WorldSnapshot, ui: Ui) {
  const active = need(
    world.conversations.find((c) => c.id === ui.conversations[world.id]) ?? world.conversations[0],
    'Conversación inexistente',
  );
  ui.conversations[world.id] = active.id;
  return active;
}
export function conversationDraft(world: WorldSnapshot, ui: Ui) {
  const id = conversation(world, ui).id;
  const key = JSON.stringify([ui.userId, world.id, id]);
  return (ui.chat.chatDrafts[key] ??= { text: '', materials: [] });
}
