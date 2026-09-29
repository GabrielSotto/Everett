export interface CodeUi {
  codeComposer: boolean;
  codeResponse: boolean;
  codeDiff: boolean;
  currentFile: string | null;
  codeFind: boolean;
  codeTree: boolean;
}

export function createCodeUi(): CodeUi {
  return {
    codeComposer: false,
    codeResponse: false,
    codeDiff: false,
    currentFile: null,
    codeFind: false,
    codeTree: true,
  };
}
