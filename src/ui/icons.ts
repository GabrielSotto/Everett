import { html } from './dom';
const paths: Record<string, string> = {
  'arrange-left':
    '<path d="M4 3v18"/><rect x="7" y="5" width="13" height="5" rx="1"/><rect x="7" y="14" width="8" height="5" rx="1"/>',
  'arrange-center-x':
    '<path d="M12 2v20"/><rect x="3" y="5" width="18" height="5" rx="1"/><rect x="7" y="14" width="10" height="5" rx="1"/>',
  'arrange-right':
    '<path d="M20 3v18"/><rect x="4" y="5" width="13" height="5" rx="1"/><rect x="9" y="14" width="8" height="5" rx="1"/>',
  'arrange-top':
    '<path d="M3 4h18"/><rect x="5" y="7" width="5" height="13" rx="1"/><rect x="14" y="7" width="5" height="8" rx="1"/>',
  'arrange-center-y':
    '<path d="M2 12h20"/><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="7" width="5" height="10" rx="1"/>',
  'arrange-bottom':
    '<path d="M3 20h18"/><rect x="5" y="4" width="5" height="13" rx="1"/><rect x="14" y="9" width="5" height="8" rx="1"/>',
  'arrange-space-x':
    '<path d="M3 4v16M21 4v16M7 12h2m6 0h2"/><rect x="10" y="6" width="4" height="12" rx="1"/>',
  'arrange-space-y':
    '<path d="M4 3h16M4 21h16M12 7v2m0 6v2"/><rect x="6" y="10" width="12" height="4" rx="1"/>',
  undo: '<path d="M9 4 4 9l5 5M4 9h9a7 7 0 0 1 0 14"/>',
  redo: '<path d="m15 4 5 5-5 5m5-5h-9a7 7 0 0 0 0 14"/>',
  bubble: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H8l-5 3v-7a8.5 8.5 0 1 1 18-4.5z"/>',
  flag: '<path d="M5 21V3m0 1h13l-3 4 3 4H5"/>',
  unplug: '<path d="m5 5 14 14M8 3l3 3M3 8l3 3m7 4 3-3m-6 8 3-3M5 11l6-6m2 14 6-6"/>',
  draw: '<path d="m4 16 12-12 4 4-12 12-5 1zM14 6l4 4M3 21h18"/>',
  'panel-left': '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/>',
  'panel-right': '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M15 4v16"/>',
  status:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5A8.5 8.5 0 0 1 20.5 12" stroke-width="3.5"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  rocket:
    '<path d="M14 4c3-2 6-1 6-1s1 3-1 6l-7 8-5-5zM7 12l-4 1 3-6 5-1M12 17l-1 4 6-3 1-5M5 16l-2 5 5-2"/><circle cx="16" cy="7" r="1.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  shapes: '<rect x="3" y="3" width="10" height="10" rx="2"/><circle cx="16" cy="16" r="6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minimize: '<path d="M5 17h14"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  restore: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
  conversation: '<path d="M3 3h14v10H8l-5 4zM17 7h4v14l-5-4h-5v-4"/>',
  annotation: '<path d="M4 3h16v14H9l-5 4z"/><path d="M8 8h8M8 12h5"/>',
  keyboard:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h1m3 0h1m3 0h1m3 0h1M6 13h1m3 0h1m3 0h1m3 0h1M7 16h10"/>',
  'chevron-up': '<path d="m6 15 6-6 6 6"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
  session:
    '<path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z"/><path d="M8 8h8M8 12h5"/>',
  canvas:
    '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><path d="M7 14v3h3M14 7h3v3"/>',
  docs: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h6"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16"/>',
  board:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18M6 7v4M12 7v7M18 7v3"/>',
  agents: '<path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7z"/>',
  hand: '<path d="M7 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v8l-2 7H9l-6-7a2 2 0 0 1 3-2l1 1"/>',
  select: '<path d="m5 3 14 10-7 1-3 7z"/>',
  note: '<path d="M4 4h16v11l-5 5H4zM15 20v-5h5M8 8h8M8 12h5"/>',
  rectangle: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="7"/>',
  triangle: '<path d="m12 3 10 18H2z"/>',
  zone: '<rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="3 3"/><path d="M9 12h6m-3-3v6"/>',
  link: '<path d="m10 13 4-4M8 16l-2 2a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m4-1 2-2a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0"/>',
  comment:
    '<path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z"/><path d="M8 10h8"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  terminal: '<path d="m4 6 6 6-6 6m9 0h7"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M8 14h1m6 0h1"/>',
  at: '<circle cx="11" cy="12" r="4"/><path d="M15 8v7a3 3 0 0 0 6 0v-3a9 9 0 1 0-5 8"/>',
  dock: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
  pin: '<path d="m8 3 8 2-1 5 3 4-7 1-4 4v-6l-3-3z"/>',
  pause: '<path d="M8 5v14m8-14v14"/>',
  play: '<path d="m7 3 14 9-14 9z"/>',
  archive: '<path d="M4 7v13h16V7M3 3h18v4H3zM9 11h6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-4 4 4 4-6 5 5"/>',
  branch:
    '<circle cx="6" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 6v12m0-5c9 0 12-1 12-5"/>',
  save: '<path d="M4 3h13l4 4v14H3V3zM7 3v6h9V3M7 21v-8h10v8"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3l-1 2m0 3h.01"/>',
  grip: '<circle cx="9" cy="6" r=".7"/><circle cx="15" cy="6" r=".7"/><circle cx="9" cy="12" r=".7"/><circle cx="15" cy="12" r=".7"/><circle cx="9" cy="18" r=".7"/><circle cx="15" cy="18" r=".7"/>',
};
export function icon(name: string, size = 18): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths['agents']}</svg>`;
}
export function btn(
  action: string,
  ico: string,
  label: string,
  attrs = '',
  active = false,
): string {
  return `<button type="button" class="icon-button${active ? ' active' : ''}" data-action="${action}" aria-label="${html(label)}" data-tip="${html(label)}" ${active ? 'aria-pressed="true"' : ''} ${attrs}>${icon(ico)}</button>`;
}
