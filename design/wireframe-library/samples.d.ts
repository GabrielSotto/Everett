export interface LibraryEntry {
  id: string;
  name: string;
  family: string;
  anatomy: string;
  tags: string;
  kind: string;
  combineStates?: boolean;
  states: string[];
  stateDetails: Record<string, { label: string; target: string; reason: string }>;
  variants: { id: string; label: string }[];
  settings: { id: string; label: string }[];
  layout: { width: number; minWidth: number; maxWidth: number };
}
export const entries: LibraryEntry[];
export const families: [string, string, string][];
export const stateNames: Record<string, string>;
export function renderSample(
  item: LibraryEntry,
  state?: string | string[],
  data?: string,
  variant?: string,
  options?: Record<string, string>,
  review?: { width?: number; title?: string },
): string;
export function availableStates(
  item: LibraryEntry,
  variant: string,
  options?: Record<string, string>,
): string[];
export function changeState(
  item: LibraryEntry,
  current: string | string[],
  next: string,
): string | string[];
export function settingOptions(
  item: LibraryEntry,
  setting: { id: string; label: string },
  variant: string,
): { id: string; label: string }[];
