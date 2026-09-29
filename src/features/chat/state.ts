import type { Point } from '../../domain/model';
export interface ChatUi {
  chatDrafts: Record<string, { text: string; materials: string[] }>;
  chatMode: 'closed' | 'quick' | 'docked' | 'room';
  chatTab: 'chat' | 'comments';
  chatCompact: boolean;
  chatPosition: Point;
}

export function createChatUi(): ChatUi {
  return {
    chatDrafts: {},
    chatMode: 'closed',
    chatTab: 'chat',
    chatCompact: false,
    chatPosition: { x: 22, y: 160 },
  };
}
