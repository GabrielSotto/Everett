import type {
  Profile,
  Route,
  Camera,
  Material,
  Anchor,
  Rect,
  Point,
  World,
  Property,
  Surface,
  Proposal,
  Message,
  ShippingRole,
  Zone,
  ProposalMaterial,
  LinkPreview,
  NodeData,
  CanvasClipboard,
  LocalContent,
} from './model';
import type { AgentRun } from './operations';
import type { MaterialOrder } from './material-order';
import type { NoteFont, NoteTypographyEdit } from './note-fonts';

export type Command =
  | {
      type: 'component.edit';
      world: string;
      id: string;
      edit: import('./commands/components').ComponentEdit;
    }
  | { type: 'composition.save'; world: string; id: string; name: string; replace?: string }
  | { type: 'composition.insert'; world: string; id: string; center: Point; linked: boolean }
  | { type: 'composition.update'; world: string; id: string }
  | {
      type: 'screen-flow.set';
      world: string;
      from: string;
      to: string | null;
      part?: string;
      label: string;
    }
  | {
      type: 'layout-guides.set';
      world: string;
      target: import('./layout-guides').LayoutTarget;
      guides: import('./layout-guides').LayoutGuides | null;
    }
  | { type: 'group.create'; world: string; nodes: string[]; name: string }
  | { type: 'group.rename'; world: string; id: string; name: string }
  | { type: 'group.ungroup'; world: string; id: string }
  | { type: 'group.remove'; world: string; id: string; nodes: string[] }
  | {
      type: 'reference.fragment';
      world: string;
      id: string;
      range: { start: number; end: number } | null;
    }
  | { type: 'assignment.interrupt' | 'assignment.retry'; world: string; id: string }
  | { type: 'node.rename'; world: string; id: string; name: string }
  | { type: 'image.replace'; world: string; id: string; asset: string; mime: string; ratio: number }
  | { type: 'node.duplicate'; world: string; id: string }
  | { type: 'nodes.duplicate'; world: string; nodes: string[]; offset: Point }
  | { type: 'nodes.paste'; world: string; clipboard: CanvasClipboard; offset: Point }
  | { type: 'node.local-edit'; world: string; id: string; title: string; content: LocalContent }
  | { type: 'node.publish'; world: string; id: string; name: string }
  | {
      type: 'node.style';
      world: string;
      id: string;
      color: string;
      thickness: number;
      fill: boolean;
      stroke: string;
    }
  | {
      type: 'arrow.reshape';
      world: string;
      id: string;
      handle: import('./free-arrow').ArrowHandle;
      point: Point;
    }
  | {
      type: 'link.direction';
      world: string;
      id: string;
      direction: import('./link-stroke').LinkDirection;
    }
  | {
      type: 'graphic.connect';
      world: string;
      nodes: string[];
      kind: import('./visual-flow').FlowKind;
    }
  | {
      type: 'graphic.insert';
      world: string;
      kind: import('./visual-graphics').GraphicKind;
      center: Point;
    }
  | {
      type: 'bars.edit';
      world: string;
      id: string;
      rows: readonly import('./bar-chart').BarDatum[];
    }
  | { type: 'graphic.callout'; world: string; image: string; detail: Point; text: string }
  | { type: 'link.thickness'; world: string; id: string; thickness: number }
  | {
      type: 'link.label';
      world: string;
      id: string;
      text: string;
      placement?: import('./cable-labels').LabelPlacement;
    }
  | {
      type: 'link.reconnect';
      world: string;
      id: string;
      end: 'from' | 'to';
      detail?: Point;
      node: string;
      anchor: Anchor;
    }
  | { type: 'zone.instruction'; world: string; id: string; text: string }
  | { type: 'zone.rename'; world: string; id: string; name: string }
  | {
      type: 'assignment.schedule';
      world: string;
      id: string;
      dueAt: number;
      runId: string;
      input: string;
    }
  | { type: 'conversation.create'; world: string; origin: Surface }
  | { type: 'conversation.rename'; world: string; id: string; name: string }
  | {
      type: 'world.shipping';
      world: string;
      active: boolean;
      source: 'board' | 'agent';
      at: number;
    }
  | {
      type: 'task.shipping';
      world: string;
      id: string;
      role: ShippingRole;
    }
  | {
      type: 'profile.edit';
      profile: Profile;
    }
  | {
      type: 'agent.run.start';
      world: string;
      run: AgentRun;
    }
  | {
      type: 'agent.run.finish';
      world: string;
      id: string;
      at: number;
      status: 'completed' | 'failed' | 'cancelled';
      error: AgentRun['error'];
    }
  | {
      type: 'navigate';
      route: Route;
      camera: Camera;
    }
  | {
      type: 'back';
    }
  | {
      type: 'universe';
    }
  | {
      type: 'camera';
      camera: Camera;
    }
  | {
      type: 'world.create';
      name: string;
    }
  | {
      type: 'world.rename';
      world: string;
      name: string;
    }
  | {
      type: 'world.archive';
      world: string;
    }
  | {
      type: 'node.create';
      world: string;
      node: Material;
    }
  | {
      type: 'node.move';
      world: string;
      id: string;
      point: Point;
    }
  | {
      type: 'nodes.move';
      world: string;
      nodes: { id: string; point: Point }[];
      detach?: string[];
      join?: string;
    }
  | { type: 'nodes.rotate'; world: string; nodes: string[]; degrees: number }
  | { type: 'nodes.delete'; world: string; nodes: string[] }
  | {
      type: 'nodes.order';
      world: string;
      nodes: string[];
      order: MaterialOrder;
    }
  | {
      type: 'nodes.assign';
      world: string;
      nodes: { id: string; returnTo: Point }[];
      agent: string;
      instruction: string;
    }
  | { type: 'asset.preview'; world: string; asset: string; preview: string }
  | { type: 'node.link-preview'; world: string; id: string; url: string; metadata: LinkPreview }
  | {
      type: 'node.resolve-link';
      world: string;
      id: string;
      url: string;
      data: Extract<NodeData, { kind: 'image' | 'video' | 'pdf' }>;
    }
  | {
      type: 'text.measure';
      world: string;
      id: string;
      width: number;
      height: number;
    }
  | {
      type: 'text.edit';
      session: string;
      insertAt?: Point;
      world: string;
      id: string;
      data: import('./canvas-text').CanvasText;
      width: number;
      height: number;
    }
  | {
      type: 'wireframe.edit';
      world: string;
      id: string;
      content: import('./wireframes').WireframeContent;
      height?: number;
    }
  | {
      type: 'wireframe.library';
      world: string;
      id: string;
      center: Point;
      composition: import('./sketch-library').LibraryComposition;
    }
  | {
      type: 'wireframe.compose';
      world: string;
      kind: import('./wireframe-compositions').CompositionKind;
      id: string;
      center: Point;
    }
  | {
      type: 'node.edit';
      world: string;
      id: string;
      title: string;
      text: string;
      color: string;
      font?: NoteFont;
      fontSize?: number;
      fontWeight?: number;
      fontItalic?: boolean;
      typography?: NoteTypographyEdit;
    }
  | {
      type: 'node.delete';
      world: string;
      id: string;
    }
  | {
      type: 'link.create';
      world: string;
      from: string;
      to: string;
      fromAnchor: Anchor;
      toAnchor: Anchor;
    }
  | {
      type: 'link.delete';
      world: string;
      id: string;
    }
  | {
      type: 'node.resize';
      world: string;
      id: string;
      rect: Rect;
      textStyle?: Pick<import('./canvas-text').CanvasText, 'size' | 'sizing'>;
    }
  | { type: 'group.resize'; world: string; id: string; rect: Rect }
  | {
      type: 'zone.edit';
      world: string;
      id: string;
      rect: Rect;
    }
  | {
      type: 'zone.delete';
      world: string;
      id: string;
    }
  | {
      type: 'zone.agent';
      world: string;
      id: string;
      agent: string | null;
    }
  | {
      type: 'canvas.undo' | 'canvas.redo';
      world: string;
    }
  | {
      type: 'zone.create';
      world: string;
      zone: Zone;
    }
  | {
      type: 'assign';
      world: string;
      node: string;
      agent: string;
      instruction?: string;
      returnTo?: Point;
    }
  | {
      type: 'assignment.ready';
      world: string;
      id: string;
      revision: number;
      text: string;
      output?: ProposalMaterial[];
    }
  | {
      type: 'assignment.revise';
      world: string;
      id: string;
      text: string;
    }
  | {
      type: 'assignment.finish';
      world: string;
      id: string;
      decision: 'accept' | 'reject' | 'cancel';
    }
  | {
      type: 'document.create';
      world: string;
      sheet: boolean;
    }
  | {
      type: 'document.edit';
      world: string;
      id: string;
      title: string;
      body: string;
    }
  | {
      type: 'sheet.edit';
      world: string;
      id: string;
      row: number;
      col: number;
      value: string;
    }
  | {
      type: 'file.create';
      world: string;
      name: string;
    }
  | {
      type: 'file.edit';
      world: string;
      id: string;
      text: string;
    }
  | {
      type: 'file.save';
      world: string;
      id: string;
    }
  | {
      type: 'branch';
      world: string;
      name: string;
    }
  | {
      type: 'code.propose';
      world: string;
      proposal: Proposal;
    }
  | {
      type: 'code.accept';
      world: string;
      accept: boolean;
    }
  | {
      type: 'task.create';
      world: string;
      title: string;
      origin: Surface;
    }
  | {
      type: 'task.edit';
      world: string;
      id: string;
      field: string;
      value: string;
    }
  | {
      type: 'board.view';
      world: string;
      view: World['boardView'];
    }
  | {
      type: 'property.add';
      world: string;
      property: Property;
    }
  | {
      type: 'property.remove';
      world: string;
      id: string;
    }
  | {
      type: 'property.toggle';
      world: string;
      id: string;
    }
  | {
      type: 'agent.create';
      world: string;
      name: string;
    }
  | {
      type: 'agent.toggle';
      world: string;
      id: string;
    }
  | {
      type: 'agent.memory';
      world: string;
      id: string;
      text: string;
      remove: number | null;
    }
  | {
      type: 'message';
      world: string;
      channel: 'messages' | 'chat' | 'codeMessages';
      message: Message;
      conversation?: string;
    }
  | {
      type: 'participant';
      world: string;
      name: string;
      conversation?: string;
    }
  | {
      type: 'comment';
      world: string;
      node: string;
      text: string;
    }
  | {
      type: 'comment.resolve';
      world: string;
      id: string;
    }
  | {
      type: 'comment.reply';
      world: string;
      id: string;
      text: string;
    };
