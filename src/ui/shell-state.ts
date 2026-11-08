export interface ShellUi {
  searchOpen: boolean;
  search: string;
  filters: boolean;
  region: string;
  archived: boolean;
  profile: boolean;
  status: boolean;
  surfaceMenu: boolean;
  showSurfaceMenu: boolean;
  canvasDockOrientation: 'horizontal' | 'vertical';
  canvasBackground: 'dots' | 'grid';
  canvasReducedMotion: boolean;
  canvasAlignmentGuides: boolean;
  canvasLayoutGuides: boolean;
  canvasLayoutSnap: boolean;
  profileTab: 'identity' | 'preferences' | 'tools' | 'settings';
}

export function createShellUi(): ShellUi {
  return {
    searchOpen: false,
    search: '',
    filters: false,
    region: 'Todas',
    archived: false,
    profile: false,
    status: false,
    surfaceMenu: false,
    showSurfaceMenu: false,
    canvasDockOrientation: 'horizontal',
    canvasBackground: 'dots',
    canvasReducedMotion: false,
    canvasAlignmentGuides: true,
    canvasLayoutGuides: true,
    canvasLayoutSnap: true,
    profileTab: 'identity',
  };
}
