import type { Camera, Route, WorldSnapshot } from '../domain/model';
import type { Command } from '../domain/command-types';
import type { Store } from './store';
import type { Intent } from './diagnostics/trace';
import type { SpatialCamera } from '../spatial/camera';
import type { AgentService } from './agent-service';
import type { Ui } from './ui-state';
import type { LocalStorage } from '../platform/local-storage';
import type { LinkPreviewService } from './link-preview-service';
export { uiState } from './ui-state';
export type { Ui } from './ui-state';
export type { Tool } from '../features/canvas/state';
export type { Slot } from '../ui/auxiliary-state';

export interface Context {
  store: Store;
  ui: Ui;
  camera: SpatialCamera | null;
  service: AgentService;
  previews: LinkPreviewService;
  storage: LocalStorage | null;
  persist(): void;
  act(
    c: Command,
    verb: string,
    requirement: string,
    source?: Intent['source'],
    interaction?: string,
  ): boolean;
  go(r: Route, origin?: DOMRect, intent?: Intent): void;
  back(intent?: Intent): void;
  locateMaterial(world: string, id: string): void;
  render(): void;
  renderShell(): void;
  cameraChanged?(): void;
  world(): WorldSnapshot;
  currentCamera(): Camera;
  notice(message: string, error?: boolean): void;
  fail(error: unknown, source: string): void;
}
