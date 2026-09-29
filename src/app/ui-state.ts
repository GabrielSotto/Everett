import { createShellUi, type ShellUi } from '../ui/shell-state';
import { createCanvasUi, type CanvasUi } from '../features/canvas/state';
import { createChatUi, type ChatUi } from '../features/chat/state';
import { createAuxiliaryUi, type AuxiliaryUi } from '../ui/auxiliary-state';
import { createCodeUi, type CodeUi } from '../features/code/state';
import { createDocsUi, type DocsUi } from '../features/docs/state';
import { createBoardUi, type BoardUi } from '../features/board/state';
import { createAgentsUi, type AgentsUi } from '../features/agents/state';

export interface Ui {
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
