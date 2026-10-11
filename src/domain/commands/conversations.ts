import { type State, getWorld, need } from '../model';
import type { Command } from '../command-types';

type ConversationsCommand = Extract<
  Command,
  { type: 'message' | 'participant' | 'conversation.create' | 'conversation.rename' }
>;

export function applyConversationsCommand(state: State, command: ConversationsCommand): void {
  const world = getWorld(state, command.world);
  switch (command.type) {
    case 'conversation.create':
      world.conversations.push({
        id: `conversation-${++state.seq}`,
        name: 'Nueva conversación',
        origin: command.origin,
        participants: [state.profile.name, world.agents[0]?.name ?? 'Eve'],
        messages: [],
      });
      break;
    case 'conversation.rename':
      if (command.name.trim())
        need(
          world.conversations.find((c) => c.id === command.id),
          'Conversación inexistente',
        ).name = command.name.trim();
      break;
    case 'message':
      world[command.channel].push(command.message);
      need(
        command.conversation
          ? world.conversations.find((c) => c.id === command.conversation)
          : world.conversations[0],
        'Conversación inexistente',
      ).messages.push(command.message);
      break;
    case 'participant':
      {
        const thread = need(
          command.conversation
            ? world.conversations.find((c) => c.id === command.conversation)
            : world.conversations[0],
          'Conversación inexistente',
        );
        if (command.name.trim() && !thread.participants.includes(command.name.trim()))
          thread.participants.push(command.name.trim());
        if (command.name.trim() && !world.participants.includes(command.name.trim()))
          world.participants.push(command.name.trim());
      }
      break;
  }
}
