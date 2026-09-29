import { type State, getWorld } from '../model';
import type { Command } from '../command-types';

type ConversationsCommand = Extract<Command, { type: 'message' | 'participant' }>;

export function applyConversationsCommand(state: State, command: ConversationsCommand): void {
  const world = getWorld(state, command.world);
  switch (command.type) {
    case 'message':
      world[command.channel].push(command.message);
      break;
    case 'participant':
      if (command.name.trim() && !world.participants.includes(command.name.trim()))
        world.participants.push(command.name.trim());
      break;
  }
}
