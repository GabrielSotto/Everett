export interface ShellUi {
  searchOpen: boolean;
  search: string;
  filters: boolean;
  region: string;
  archived: boolean;
  profile: boolean;
  status: boolean;
  surfaceMenu: boolean;
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
    profileTab: 'identity',
  };
}
