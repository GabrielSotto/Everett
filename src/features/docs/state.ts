export interface DocsUi {
  docsList: boolean;
}

export function createDocsUi(): DocsUi {
  return {
    docsList: true,
  };
}
