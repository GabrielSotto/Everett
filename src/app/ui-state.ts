import { createShellUi, type ShellUi } from '../ui/shell-state';
import { createCanvasUi, type CanvasUi } from '../features/canvas/state';
import { createChatUi, type ChatUi } from '../features/chat/state';
import { createAuxiliaryUi, type AuxiliaryUi } from '../ui/auxiliary-state';
import { createCodeUi, type CodeUi } from '../features/code/state';
import { createDocsUi, type DocsUi } from '../features/docs/state';
import { createBoardUi, type BoardUi } from '../features/board/state';
import { createAgentsUi, type AgentsUi } from '../features/agents/state';
import type { Camera } from '../domain/model';

export interface Ui {
  userId: string;
  conversations: Record<string, string>;
  canvasContexts: Record<
    string,
    {
      camera: Camera;
      selection: string | null;
      selections: string[];
      zone: string | null;
      link: string | null;
    }
  >;
  chatContexts: Record<string, Omit<ChatUi, 'chatDrafts'>>;
  commentDrafts: Record<string, string>;
  revisionDrafts: Record<string, string>;
  shortcuts: Record<string, string>;
  composerDrafts: Record<string, string>;
  shell: ShellUi;
  canvas: CanvasUi;
  chat: ChatUi;
  auxiliary: AuxiliaryUi;
  code: CodeUi;
  docs: DocsUi;
  board: BoardUi;
  agents: AgentsUi;
}

export function uiState(): Ui {
  return {
    userId: 'local-user',
    conversations: {},
    canvasContexts: {},
    chatContexts: {},
    commentDrafts: {},
    revisionDrafts: {},
    shortcuts: { select: 'V', hand: 'H', note: 'N', comment: 'C', connect: 'L', rename: '' },
    composerDrafts: {},
    shell: createShellUi(),
    canvas: createCanvasUi(),
    chat: createChatUi(),
    auxiliary: createAuxiliaryUi(),
    code: createCodeUi(),
    docs: createDocsUi(),
    board: createBoardUi(),
    agents: createAgentsUi(),
  };
}
