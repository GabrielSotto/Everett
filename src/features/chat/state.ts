import type { Point } from '../../domain/model';
export const quickChatSize = { width: 310, height: 340 } as const;
export interface ChatUi {
  chatDrafts: Record<string, { text: string; materials: string[] }>;
  chatMode: 'closed' | 'quick' | 'docked';
  chatTab: 'chat' | 'comments';
  chatCompact: boolean;
  chatPosition: Point;
  chatSize: { width: number; height: number } | null;
}

export function createChatUi(): ChatUi {
  return {
    chatDrafts: {},
    chatMode: 'closed',
    chatTab: 'chat',
    chatCompact: false,
    chatPosition: { x: 22, y: 160 },
    chatSize: null,
  };
}
