import type { Command } from './command-types';
export function affectsView(c: Command): 'navigation' | 'content' | 'none' {
  return ['navigate', 'back', 'universe', 'world.create', 'node.publish'].includes(c.type)
    ? 'navigation'
    : [
          'camera',
          'asset.preview',
          'node.link-preview',
          'node.resolve-link',
          'node.edit',
          'node.local-edit',
          'wireframe.edit',
          'document.edit',
          'sheet.edit',
          'file.edit',
          'world.rename',
          'task.edit',
        ].includes(c.type)
      ? 'none'
      : 'content';
}
