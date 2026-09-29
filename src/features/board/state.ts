export interface BoardUi {
  taskExpanded: string | null;
  boardProperties: boolean;
}

export function createBoardUi(): BoardUi {
  return {
    taskExpanded: null,
    boardProperties: false,
  };
}
