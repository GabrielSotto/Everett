import { type State } from './model';
import type { Command } from './command-types';
import { affectsView } from './command-effects';
export { affectsView } from './command-effects';
export { initialCamera } from './navigation';
import { applyWorkspaceCommand } from './commands/workspace';
import { applyBoardCommand } from './commands/board';
import { applyCanvasCommand } from './commands/canvas';
import { applyDocumentsCommand } from './commands/documents';
import { applyCodeCommand } from './commands/code';
import { applyAgentsCommand } from './commands/agents';
import { applyConversationsCommand } from './commands/conversations';
import { arrangeProposals } from './proposal-layout';
import { applyOrganizationCommand } from './commands/organization';
import { rebaseReferences } from './reference-anchors';
import { applyCopyCommand } from './commands/copies';
import { applyComponentCommand } from './commands/components';
import { reconcileComponentTrees, elementAt } from './component-tree';

export function reduce(state: State, command: Command): State {
  const next = structuredClone(state);
  switch (command.type) {
    case 'component.edit':
    case 'composition.save':
    case 'composition.insert':
    case 'composition.update':
    case 'screen-flow.set':
      applyComponentCommand(next, command);
      break;
    case 'node.duplicate':
    case 'nodes.duplicate':
    case 'nodes.paste':
    case 'node.local-edit':
    case 'node.publish':
      applyCopyCommand(next, command);
      break;
    case 'group.create':
    case 'layout-guides.set':
    case 'group.rename':
    case 'group.ungroup':
    case 'group.remove':
    case 'reference.fragment':
      applyOrganizationCommand(next, command);
      break;
    case 'world.shipping':
    case 'profile.edit':
    case 'navigate':
    case 'back':
    case 'universe':
    case 'camera':
    case 'world.create':
    case 'world.rename':
    case 'world.archive':
      applyWorkspaceCommand(next, command);
      break;
    case 'task.shipping':
    case 'task.create':
    case 'task.edit':
    case 'board.view':
    case 'property.add':
    case 'property.remove':
    case 'property.toggle':
      applyBoardCommand(next, command);
      break;
    case 'node.create':
    case 'group.resize':
    case 'assignment.interrupt':
    case 'assignment.retry':
    case 'node.rename':
    case 'node.style':
    case 'link.label':
    case 'link.reconnect':
    case 'zone.instruction':
    case 'zone.rename':
    case 'assignment.schedule':
    case 'node.move':
    case 'nodes.move':
    case 'nodes.order':
    case 'nodes.delete':
    case 'nodes.assign':
    case 'asset.preview':
    case 'node.link-preview':
    case 'node.resolve-link':
    case 'node.edit':
    case 'wireframe.edit':
    case 'text.measure':
    case 'text.edit':
    case 'wireframe.compose':
    case 'wireframe.library':
    case 'node.delete':
    case 'link.create':
    case 'link.delete':
    case 'node.resize':
    case 'zone.create':
    case 'zone.edit':
    case 'zone.delete':
    case 'zone.agent':
    case 'canvas.undo':
    case 'canvas.redo':
    case 'assign':
    case 'assignment.ready':
    case 'assignment.revise':
    case 'assignment.finish':
    case 'comment':
    case 'comment.resolve':
    case 'comment.reply':
      applyCanvasCommand(next, command);
      break;
    case 'document.create':
    case 'document.edit':
    case 'sheet.edit':
      applyDocumentsCommand(next, command);
      break;
    case 'file.create':
    case 'file.edit':
    case 'file.save':
    case 'branch':
    case 'code.propose':
    case 'code.accept':
      applyCodeCommand(next, command);
      break;
    case 'agent.run.start':
    case 'agent.run.finish':
    case 'agent.create':
    case 'agent.toggle':
    case 'agent.memory':
      applyAgentsCommand(next, command);
      break;
    case 'message':
    case 'conversation.create':
    case 'conversation.rename':
    case 'participant':
      applyConversationsCommand(next, command);
      break;
    default: {
      const unhandled: never = command;
      throw new Error('Comando desconocido: ' + JSON.stringify(unhandled));
    }
  }
  if ('world' in command) {
    const before = state.worlds.find((w) => w.id === command.world);
    const after = next.worlds.find((w) => w.id === command.world);
    if (before && after) {
      reconcileComponentTrees(before, after);
      if (after.screenFlows)
        after.screenFlows = after.screenFlows.filter(
          (f) =>
            after.canvasGroups?.some(
              (g) =>
                g.id === f.from &&
                (!f.part || (!!g.structure && !!elementAt(g.structure.root, f.part))),
            ) && after.canvasGroups?.some((g) => g.id === f.to),
        );
      rebaseReferences(before, after);
    }
  }
  if ('world' in command && affectsView(command) !== 'none') {
    const world = next.worlds.find((candidate) => candidate.id === command.world);
    if (!world) throw new Error('Mundo inexistente');
    arrangeProposals(world);
    world.activity.unshift({ action: command.type, at: new Date().toISOString() });
    world.activity = world.activity.slice(0, 30);
  }
  return next;
}
