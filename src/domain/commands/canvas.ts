import { fittedImage } from '../image-fit';
import { validBarRows } from '../bar-chart';
import { adoptMaterials } from '../canvas-frames';
import { centerOf, rotatedPose } from '../rotation';
import { selectionBounds } from '../alignment';
import { noteTypography, validNoteTextStyle } from '../note-fonts';
import { type State, getWorld, type Material, need } from '../model';
import type { Command } from '../command-types';
import { ensure, DomainError } from '../invariants';
import { releaseZoneMaterials } from '../zone-ownership';
import { restoreMaterialLinks } from '../material-links';
import { arrangeProposals } from '../proposal-layout';
import { sameConnection } from '../link-identity';
import { proposalMaterials } from '../proposal-materials';
import { orderMaterials } from '../material-order';
import { validLinkPreview } from '../link-previews';
import { resolveMedia } from '../resolved-media';
import { validWireframe } from '../wireframes';
import { editArrow, isArrow, restrokeArrow } from '../free-arrow';
import { connectVisualFlow } from '../visual-flow';
import { validDetail } from '../cable-geometry';
import { createImageCallout } from '../image-callout';
import { insertGraphic } from '../visual-graphics';
import { validLabelPlacement } from '../cable-labels';
import { validLinkDirection, validLinkWeight } from '../link-stroke';
import { validCanvasText } from '../canvas-text';
import { compositionKinds, wireframeComposition } from '../wireframe-compositions';
import { instantiateLibrary, validLibraryComposition } from '../sketch-library';
import { isComponent } from '../manual-groups';
import { resizedComponent } from '../component-resize';
import { applyComponentCommand } from './components';

type CanvasCommand = Extract<
  Command,
  {
    type:
      | 'node.create'
      | 'group.resize'
      | 'wireframe.edit'
      | 'text.measure'
      | 'text.edit'
      | 'wireframe.compose'
      | 'wireframe.library'
      | 'assignment.interrupt'
      | 'assignment.retry'
      | 'node.rename'
      | 'image.replace'
      | 'node.style'
      | 'arrow.reshape'
      | 'link.direction'
      | 'graphic.connect'
      | 'graphic.callout'
      | 'graphic.insert'
      | 'bars.edit'
      | 'link.thickness'
      | 'link.label'
      | 'link.reconnect'
      | 'zone.instruction'
      | 'zone.rename'
      | 'assignment.schedule'
      | 'node.move'
      | 'nodes.rotate'
      | 'nodes.move'
      | 'nodes.order'
      | 'nodes.delete'
      | 'nodes.assign'
      | 'asset.preview'
      | 'node.link-preview'
      | 'node.resolve-link'
      | 'node.edit'
      | 'node.delete'
      | 'link.create'
      | 'link.delete'
      | 'node.resize'
      | 'zone.create'
      | 'zone.edit'
      | 'zone.delete'
      | 'zone.agent'
      | 'canvas.undo'
      | 'canvas.redo'
      | 'assign'
      | 'assignment.ready'
      | 'assignment.revise'
      | 'assignment.finish'
      | 'comment'
      | 'comment.resolve'
      | 'comment.reply';
  }
>;

export function applyCanvasCommand(state: State, command: CanvasCommand): void {
  const world = getWorld(state, command.world);
  const uid = (): string => `e-${++state.seq}`;
  const node = (id: string): Material =>
    need(
      world.nodes.find((material) => material.id === id),
      'Material inexistente',
    );
  switch (command.type) {
    case 'wireframe.library': {
      ensure(
        validLibraryComposition(command.composition) &&
          [command.center.x, command.center.y].every(Number.isFinite),
        'WIREFRAME_CONTENT',
        'La composición no es válida.',
      );
      const result = instantiateLibrary(command.composition, command.id, command.center);
      ensure(
        !world.nodes.some((n) => result.nodes.some((part) => part.id === n.id)) &&
          !world.canvasGroups?.some((g) => g.id === result.group?.id),
        'WIREFRAME_ID',
        'La composición ya existe.',
      );
      world.nodes.push(...result.nodes);
      if (result.group) (world.canvasGroups ??= []).push(result.group);
      break;
    }
    case 'wireframe.compose': {
      ensure(
        compositionKinds.includes(command.kind) &&
          Number.isFinite(command.center.x) &&
          Number.isFinite(command.center.y),
        'WIREFRAME_CONTENT',
        'La composición no es válida.',
      );
      const composition = wireframeComposition(command.kind, command.id, command.center);
      ensure(
        !world.nodes.some((node) => composition.group.nodes.includes(node.id)) &&
          !world.canvasGroups?.some((group) => group.id === composition.group.id),
        'WIREFRAME_ID',
        'La composición ya existe.',
      );
      world.nodes.push(...composition.nodes);
      (world.canvasGroups ??= []).push(composition.group);
      break;
    }
    case 'text.measure': {
      const material = node(command.id);
      ensure(!material.owner, 'LOCKED', 'El agente está usando el material.');
      if (material.data.kind !== 'text')
        throw new DomainError('TEXT_FORMAT', 'Este material no es texto.');
      // La vista ya respetó el ancho del párrafo salvo para contener un grafema.
      // Confirmar ambas medidas evita volver a solicitar el mismo ajuste al renderizar.
      material.width = command.width;
      material.height = command.height;
      break;
    }
    case 'text.edit': {
      ensure(validCanvasText(command.data), 'TEXT_FORMAT', 'El texto o su formato no son válidos.');
      if (command.insertAt) {
        ensure(
          !world.nodes.some((n) => n.id === command.id),
          'MATERIAL',
          'Ya existe un material con este identificador.',
        );
        if (command.data.text.trim())
          world.nodes.push({
            id: command.id,
            x: command.insertAt.x,
            y: command.insertAt.y,
            width: command.width,
            height: command.height,
            owner: null,
            data: structuredClone(command.data),
          });
        break;
      }
      const material = node(command.id);
      ensure(!material.owner, 'LOCKED', 'El agente está usando el material.');
      ensure(material.data.kind === 'text', 'TEXT_FORMAT', 'Este material no es texto.');
      if (!command.data.text.trim()) {
        applyCanvasCommand(state, { type: 'node.delete', world: world.id, id: command.id });
        break;
      }
      material.data = structuredClone(command.data);
      material.width = command.width;
      material.height = command.height;
      break;
    }
    case 'wireframe.edit': {
      const material = node(command.id);
      ensure(!material.owner, 'LOCKED', 'El agente está usando el material.');
      ensure(
        material.data.kind === 'wireframe',
        'WIREFRAME_KIND',
        'Este material no es un bosquejo.',
      );
      ensure(
        validWireframe(command.content),
        'WIREFRAME_CONTENT',
        'El contenido del bosquejo no es válido.',
      );
      if (material.data.kind === 'wireframe') {
        ensure(
          command.content.type === material.data.content.type,
          'WIREFRAME_KIND',
          'La edición no puede cambiar el tipo de pieza.',
        );
        material.data.content = structuredClone(command.content);
        if (command.content.type === 'screen')
          material.data.title = command.content.text.trim() || 'Pantalla';
        if (command.height !== undefined) {
          ensure(
            command.content.type === 'text' &&
              Number.isFinite(command.height) &&
              command.height >= 24 &&
              command.height <= 10000,
            'WIREFRAME_SIZE',
            'Tamaño del texto no válido.',
          );
          material.height = command.height;
        }
      }
      break;
    }
    case 'node.resolve-link': {
      ensure(
        ['image', 'video'].includes(command.data.kind) &&
          !!command.data.asset &&
          Number.isFinite(command.data.ratio) &&
          command.data.ratio > 0,
        'ASSET',
        'Archivo remoto inválido',
      );
      const material = world.nodes.find((n) => n.id === command.id);
      if (material) resolveMedia(material, command.url, command.data);
      for (const job of world.assignments.filter((a) => a.node === command.id))
        for (const output of job.output ?? [])
          resolveMedia(output.material, command.url, command.data);
      break;
    }
    case 'node.link-preview': {
      ensure(validLinkPreview(command.metadata), 'PREVIEW', 'Vista previa de enlace inválida');
      const material = world.nodes.find((n) => n.id === command.id);
      // Una respuesta tardía nunca recrea un material ni modifica otro destino.
      if (material?.data.kind === 'link' && material.data.url === command.url) {
        material.data.metadata = structuredClone(command.metadata);
        for (const job of world.assignments.filter((a) => a.node === command.id))
          for (const output of job.output ?? [])
            if (output.material.data.kind === 'link' && output.material.data.url === command.url)
              output.material.data.metadata = structuredClone(command.metadata);
      }
      break;
    }
    case 'nodes.order': {
      ensure(
        command.nodes.length > 0 && new Set(command.nodes).size === command.nodes.length,
        'SELECTION',
        'Elegí materiales distintos',
      );
      ensure(
        ['front', 'forward', 'backward', 'back'].includes(command.order),
        'ORDER',
        'Orden de materiales inválido',
      );
      for (const id of command.nodes)
        ensure(!node(id).owner, 'LOCKED', 'Un material está siendo usado por un agente');
      world.nodes = orderMaterials(world.nodes, command.nodes, command.order);
      break;
    }
    case 'nodes.move':
    case 'nodes.assign':
    case 'nodes.delete': {
      const ids = command.type === 'nodes.delete' ? command.nodes : command.nodes.map((n) => n.id);
      ensure(
        ids.length > 0 && new Set(ids).size === ids.length,
        'SELECTION',
        'Elegí materiales distintos',
      );
      for (const id of ids)
        ensure(!node(id).owner, 'LOCKED', 'Un material está siendo usado por un agente');
      // Store publica el candidato completo después de validar todo el grupo.
      if (command.type === 'nodes.move') {
        const detached = command.detach ?? [];
        ensure(
          new Set(detached).size === detached.length &&
            detached.every(
              (id) => ids.includes(id) && world.canvasGroups?.some((g) => g.nodes.includes(id)),
            ),
          'GROUP',
          'La retirada debe pertenecer a los materiales movidos',
        );
        const destination =
          command.join !== undefined
            ? need(
                world.canvasGroups?.find((g) => g.id === command.join),
                'Conjunto de destino inexistente',
              )
            : null;
        if (destination)
          ensure(
            ids.every(
              (id) =>
                !world.canvasGroups?.some(
                  (g) => g.id !== destination.id && g.nodes.includes(id) && !detached.includes(id),
                ),
            ),
            'GROUP',
            'Retirá primero los materiales de su conjunto anterior',
          );
        for (const item of command.nodes)
          applyCanvasCommand(state, {
            type: 'node.move',
            world: world.id,
            id: item.id,
            point: item.point,
          });
        for (const group of world.canvasGroups ?? [])
          group.nodes = group.nodes.filter((id) => !detached.includes(id));
        if (destination?.structure?.root.frame) {
          ensure(
            destination.nodes.every((id) => !node(id).owner),
            'LOCKED',
            'El agente está usando partes de este marco.',
          );
          ensure(
            destination.structure.root.layout.direction === 'free',
            'FRAME_LAYOUT',
            'Usá el inspector para incorporar materiales en una fila o columna.',
          );
          adoptMaterials(world, destination, destination.structure.root, ids, uid);
        } else if (destination) destination.nodes = [...new Set([...destination.nodes, ...ids])];
        if (world.canvasGroups)
          world.canvasGroups = world.canvasGroups.filter((g) => g.nodes.length > 0);
      } else if (command.type === 'nodes.delete')
        for (const id of command.nodes)
          applyCanvasCommand(state, { type: 'node.delete', world: world.id, id });
      else
        for (const item of command.nodes)
          applyCanvasCommand(state, {
            type: 'assign',
            world: world.id,
            node: item.id,
            agent: command.agent,
            instruction: command.instruction,
            returnTo: item.returnTo,
          });
      break;
    }
    case 'asset.preview': {
      ensure(
        /^data:image\/(jpeg|png);base64,/.test(command.preview),
        'PREVIEW',
        'Vista previa de archivo inválida',
      );
      for (const material of [
        ...world.nodes,
        ...world.assignments.flatMap((job) => job.output?.map((d) => d.material) ?? []),
      ])
        if (
          material.data.kind === 'video' &&
          material.data.asset === command.asset &&
          !material.data.preview
        )
          material.data.preview = command.preview;
      break;
    }
    case 'assignment.interrupt': {
      const job = need(
        world.assignments.find((a) => a.id === command.id),
        'Trabajo inexistente',
      );
      if (job.phase === 'working') job.phase = 'interrupted';
      break;
    }
    case 'assignment.retry': {
      const job = need(
        world.assignments.find((a) => a.id === command.id),
        'Trabajo inexistente',
      );
      ensure(job.phase === 'interrupted', 'RETRY', 'El trabajo no está interrumpido');
      job.phase = 'working';
      delete job.dueAt;
      delete job.runId;
      break;
    }
    case 'node.rename': {
      const material = node(command.id);
      ensure(
        !material.owner && !!command.name.trim(),
        'NAME',
        'Ingresá un nombre para un material disponible',
      );
      if (material.data.kind === 'reference') {
        const ref = material.data.ref;
        if (ref.kind === 'document')
          need(
            world.docs.find((d) => d.id === ref.id),
            'Documento inexistente',
          ).title = command.name.trim();
        else if (ref.kind === 'task')
          need(
            world.tasks.find((t) => t.id === ref.id),
            'Tarea inexistente',
          ).title = command.name.trim();
        else if (ref.kind === 'file')
          need(
            world.files.find((f) => f.id === ref.id),
            'Archivo inexistente',
          ).name = command.name.trim();
        else
          need(
            world.agents.find((a) => a.id === ref.id),
            'Agente inexistente',
          ).name = command.name.trim();
      } else material.data.title = command.name.trim();
      break;
    }
    case 'node.style': {
      const material = node(command.id);
      ensure(
        !material.owner && (material.data.kind === 'shape' || material.data.kind === 'drawing'),
        'STYLE',
        'Este material no tiene estilo de trazo',
      );
      if (material.data.kind === 'shape' || material.data.kind === 'drawing') {
        if (isArrow(material)) Object.assign(material, restrokeArrow(material, command.thickness));
        material.data.color = command.color;
        material.data.thickness = command.thickness;
        if (material.data.kind === 'shape') {
          material.data.fill = command.fill;
          material.data.stroke = command.stroke;
        }
      }
      break;
    }
    case 'link.reconnect': {
      const link = need(
        world.links.find((l) => l.id === command.id),
        'Conexión inexistente',
      );
      const destination = node(command.node);
      const other = node(command.end === 'from' ? link.to : link.from);
      ensure(
        !destination.owner && !other.owner && destination.id !== other.id,
        'LINK',
        'Elegir dos materiales disponibles',
      );
      const next = {
        ...link,
        [command.end]: destination.id,
        [command.end === 'from' ? 'fromAnchor' : 'toAnchor']: command.anchor,
      };
      ensure(
        command.detail === undefined ||
          (command.end === 'to' &&
            destination.data.kind === 'image' &&
            validDetail(command.detail)),
        'LINK_DETAIL',
        'Elegí un punto dentro de la imagen.',
      );
      if (command.end === 'to') {
        delete next.detail;
        if (command.detail) next.detail = { ...command.detail };
      }
      ensure(
        !world.links.some((l) => l.id !== link.id && sameConnection(l, next)),
        'LINK',
        'Ya existe una conexión entre esos anclajes',
      );
      Object.assign(link, next);
      if (!next.detail) delete link.detail;
      break;
    }
    case 'arrow.reshape': {
      const material = node(command.id);
      ensure(!material.owner && isArrow(material), 'ARROW', 'Elegí una flecha libre disponible');
      ensure(
        ['start', 'bend', 'end'].includes(command.handle) &&
          [command.point.x, command.point.y].every(Number.isFinite),
        'GEOMETRY',
        'Punto de flecha inválido',
      );
      if (isArrow(material))
        Object.assign(material, editArrow(material, command.handle, command.point));
      break;
    }
    case 'graphic.callout':
      createImageCallout(world, command.image, command.detail, command.text, uid);
      break;
    case 'graphic.connect':
      connectVisualFlow(world, command.nodes, command.kind, uid);
      break;
    case 'bars.edit': {
      const material = node(command.id);
      ensure(!material.owner, 'LOCKED', 'El agente está usando el material.');
      if (material.data.kind !== 'bars')
        throw new DomainError('BAR_KIND', 'Elegí un gráfico de barras.');
      ensure(
        validBarRows(command.rows),
        'BAR_DATA',
        'Completá las categorías y usá números finitos. Dejá vacío un dato desconocido.',
      );
      const oldCount = material.data.rows.length;
      material.height = Math.max(4, (material.height * (command.rows.length + 1)) / (oldCount + 1));
      material.data.rows = structuredClone(command.rows);
      break;
    }
    case 'graphic.insert':
      insertGraphic(world, command.kind, command.center, uid);
      break;
    case 'link.direction': {
      const link = need(
        world.links.find((item) => item.id === command.id),
        'Conexión inexistente',
      );
      ensure(
        validLinkDirection(command.direction),
        'LINK_DIRECTION',
        'Sentido de conexión inválido',
      );
      if (command.direction === 'none') delete link.direction;
      else link.direction = command.direction;
      break;
    }
    case 'link.thickness': {
      const link = need(
        world.links.find((l) => l.id === command.id),
        'Conexión inexistente',
      );
      ensure(validLinkWeight(command.thickness), 'LINK_STYLE', 'Grosor de conexión inválido');
      if (command.thickness === 1.4) delete link.thickness;
      else link.thickness = command.thickness;
      break;
    }
    case 'link.label': {
      const link = need(
        world.links.find((l) => l.id === command.id),
        'Conexión inexistente',
      );
      if (command.placement !== undefined) {
        ensure(
          validLabelPlacement(command.placement),
          'LINK_LABEL_PLACEMENT',
          'Ubicación de etiqueta inválida',
        );
        if (command.placement === 'center') delete link.labelPlacement;
        else link.labelPlacement = command.placement;
      }
      link.label = command.text;
      if (!link.label) delete link.labelPlacement;
      break;
    }
    case 'zone.instruction':
      need(
        world.zones.find((z) => z.id === command.id),
        'Zona inexistente',
      ).instruction = command.text;
      break;
    case 'zone.rename': {
      const name = command.name.trim();
      ensure(name.length > 0, 'ZONE_NAME', 'Ingresá un nombre para la zona');
      need(
        world.zones.find((zone) => zone.id === command.id),
        'Zona inexistente',
      ).name = name;
      break;
    }
    case 'assignment.schedule': {
      const job = need(
        world.assignments.find((a) => a.id === command.id),
        'Trabajo inexistente',
      );
      job.dueAt = command.dueAt;
      job.runId = command.runId;
      job.input = command.input;
      break;
    }
    case 'nodes.rotate': {
      ensure(
        Number.isFinite(command.degrees) && command.nodes.length > 0,
        'GEOMETRY',
        'Elegí materiales y un ángulo válido.',
      );
      const ids = new Set(command.nodes);
      const selected = world.nodes.filter((n) => ids.has(n.id));
      ensure(selected.length === ids.size, 'MATERIAL', 'La selección ya no está disponible.');
      ensure(
        selected.every((n) => !n.owner),
        'LOCKED',
        'Devolvé los materiales del agente antes de girarlos.',
      );
      const pivot = centerOf(selectionBounds(selected));
      for (const item of selected) Object.assign(item, rotatedPose(item, pivot, command.degrees));
      for (const group of world.canvasGroups ?? []) {
        const tree = group.structure;
        if (!tree || !group.nodes.every((id) => ids.has(id))) continue;
        const root = {
          ...tree.root,
          x: tree.origin.x + tree.root.x,
          y: tree.origin.y + tree.root.y,
          rotation: tree.rotation,
        };
        const pose = rotatedPose(root, pivot, command.degrees);
        tree.rotation = pose.rotation;
        tree.origin = { x: pose.x - tree.root.x, y: pose.y - tree.root.y };
      }
      break;
    }
    case 'image.replace': {
      const material = node(command.id);
      if (material.owner || material.data.kind !== 'image')
        throw new DomainError('EDIT', 'Elegí una imagen disponible.');
      ensure(
        !!command.asset &&
          command.mime.startsWith('image/') &&
          Number.isFinite(command.ratio) &&
          command.ratio > 0,
        'ASSET',
        'La imagen o sus dimensiones no son válidas.',
      );
      Object.assign(material, fittedImage(material, command.ratio));
      material.data = {
        kind: 'image',
        title: material.data.title,
        asset: command.asset,
        mime: command.mime,
        ratio: command.ratio,
      };
      break;
    }
    case 'node.create':
      if (command.node.data.kind === 'wireframe' && command.node.data.content.type === 'screen')
        world.nodes.unshift(command.node);
      else world.nodes.push(command.node);
      break;
    case 'node.move': {
      const x = node(command.id);
      ensure(!x.owner, 'LOCKED', 'El agente está usando el material');
      x.x = command.point.x;
      x.y = command.point.y;
      break;
    }
    case 'node.edit': {
      const x = node(command.id);
      ensure(!x.owner && x.data.kind === 'note', 'EDIT', 'Nota no disponible');
      if (command.typography !== undefined)
        ensure(
          !!command.typography &&
            ['title', 'body'].includes(command.typography.part) &&
            validNoteTextStyle(command.typography.style),
          'NOTE_FORMAT',
          'Elegí una tipografía y un peso válidos para el título o el cuerpo.',
        );
      x.data = {
        ...x.data,
        kind: 'note',
        title: command.title,
        text: command.text,
        color: command.color,
        ...(command.font !== undefined ? { font: command.font } : {}),
        ...(command.fontSize !== undefined ? { fontSize: command.fontSize } : {}),
        ...(command.fontWeight !== undefined ? { fontWeight: command.fontWeight } : {}),
        ...(command.fontItalic !== undefined ? { fontItalic: command.fontItalic } : {}),
        ...(command.typography && x.data.kind === 'note'
          ? {
              typography: {
                ...noteTypography(x.data),
                [command.typography.part]: { ...command.typography.style },
              },
            }
          : {}),
      };
      break;
    }
    case 'node.delete': {
      const material = node(command.id);
      ensure(!material.owner, 'LOCKED', 'Cancelar el trabajo antes de quitar el material');
      if (material.data.kind === 'reference')
        (world.referenceTargets ??= {})[material.id] = { ...material.data.ref };
      world.nodes = world.nodes.filter((x) => x.id !== command.id);
      world.canvasGroups =
        world.canvasGroups
          ?.map((g) => ({ ...g, nodes: g.nodes.filter((id) => id !== command.id) }))
          .filter((g) => g.nodes.length) ?? [];
      world.links = world.links.filter((l) => l.from !== command.id && l.to !== command.id);
      world.comments = world.comments.filter((x) => x.node !== command.id);
      break;
    }
    case 'link.create': {
      const a = node(command.from),
        b = node(command.to);
      ensure(a.id !== b.id && !a.owner && !b.owner, 'LINK', 'Elegir dos materiales disponibles');
      const existing = world.links.some((l) => sameConnection(l, command));
      if (!existing)
        world.links.push({
          id: uid(),
          from: a.id,
          to: b.id,
          fromAnchor: command.fromAnchor,
          toAnchor: command.toAnchor,
        });
      break;
    }
    case 'link.delete':
      ensure(
        world.links.some((l) => l.id === command.id),
        'LINK',
        'Conexión inexistente',
      );
      world.links = world.links.filter((l) => l.id !== command.id);
      break;
    case 'group.resize': {
      const group = need(
        world.canvasGroups?.find((g) => g.id === command.id),
        'Componente inexistente',
      );
      ensure(isComponent(world, group), 'GROUP', 'Elegí un componente');
      if (group.structure) {
        applyComponentCommand(state, {
          type: 'component.edit',
          world: command.world,
          id: command.id,
          edit: { kind: 'resize', rect: command.rect, scale: false },
        });
        break;
      }
      const { nodes } = resizedComponent(world, group, command.rect);
      ensure(
        nodes.every(
          (n) =>
            !n.owner &&
            [n.x, n.y, n.width, n.height].every(Number.isFinite) &&
            n.width >= 4 &&
            n.height >= 4,
        ),
        'GEOMETRY',
        'El componente no puede reducirse más',
      );
      for (const resized of nodes) Object.assign(node(resized.id), resized);
      break;
    }
    case 'node.resize': {
      const material = node(command.id);
      ensure(!material.owner, 'LOCKED', 'El agente está usando el material');
      if (material.data.kind === 'text') {
        const style = command.textStyle ?? { size: material.data.size, sizing: 'wrap' };
        ensure(
          validCanvasText({ ...material.data, size: style.size, sizing: style.sizing }),
          'STYLE',
          'Tamaño de texto inválido',
        );
        Object.assign(material.data, { size: style.size, sizing: style.sizing });
      }
      if (material.data.kind === 'drawing')
        material.data.points = material.data.points.map((p) => ({
          x: (p.x * command.rect.width) / material.width,
          y: (p.y * command.rect.height) / material.height,
        }));
      Object.assign(material, command.rect);
      break;
    }
    case 'zone.create':
      world.zones.push(command.zone);
      break;
    case 'zone.edit':
      ensure(false, 'ZONE_FIXED', 'La geometría de esta zona queda fijada al crearla');
      break;
    case 'zone.delete': {
      const zone = need(
        world.zones.find((z) => z.id === command.id),
        'Zona inexistente',
      );
      releaseZoneMaterials(world, zone, Date.now());
      world.zones = world.zones.filter((z) => z.id !== command.id);
      break;
    }
    case 'zone.agent': {
      const zone = need(
        world.zones.find((z) => z.id === command.id),
        'Zona inexistente',
      );
      ensure(
        command.agent === null || world.agents.some((a) => a.id === command.agent),
        'AGENT',
        'Agente inexistente',
      );
      if (zone.agent === command.agent) break;
      releaseZoneMaterials(world, zone, Date.now());
      if (command.agent && world.zones.some((z) => z.id !== zone.id && z.agent === command.agent)) {
        const template = need(
          world.agents.find((a) => a.id === command.agent),
          'Agente inexistente',
        );
        const instance = {
          ...structuredClone(template),
          id: uid(),
          templateId: template.templateId ?? template.id,
        };
        world.agents.push(instance);
        zone.agent = instance.id;
      } else {
        zone.agent = command.agent;
      }
      break;
    }
    case 'canvas.undo':
    case 'canvas.redo':
      throw new Error('El historial del Canvas debe ejecutarse desde Store');
    case 'assign': {
      const m = node(command.node),
        a = need(
          world.agents.find((a) => a.id === command.agent),
          'Agente inexistente',
        );
      ensure(!m.owner && a.active, 'ASSIGN', 'Material o agente no disponible');
      if (m.data.kind === 'reference' && m.data.ref.fragment) {
        const fragment = m.data.ref.fragment;
        ensure(
          world.referenceAnchors?.some(
            (anchor) => anchor.id === fragment && anchor.status === 'attached',
          ) === true,
          'FRAGMENT',
          'Revisá el fragmento no disponible o elegí Referencia completa antes de asignarlo.',
        );
      }
      const links = world.links.filter((l) => l.from === m.id || l.to === m.id);
      world.links = world.links.filter((l) => !links.includes(l));
      m.owner = a.id;
      const z = world.zones.find((z) => z.agent === a.id);
      world.assignments.push({
        id: uid(),
        agent: a.id,
        node: m.id,
        links,
        phase: 'working',
        revision: 1,
        text: '',
        instruction: command.instruction ?? '',
        returnTo: command.returnTo ?? { x: m.x, y: m.y },
        position: {
          x: (z?.x ?? 300) + world.assignments.filter((job) => job.agent === a.id).length * 350,
          y: z ? z.y + z.height + 50 : 300,
        },
      });
      arrangeProposals(world);
      break;
    }
    case 'assignment.ready': {
      const a = world.assignments.find((a) => a.id === command.id);
      if (a && a.revision === command.revision && a.phase === 'working') {
        a.text = command.text;
        a.output = command.output ?? proposalMaterials(world, a, true);
        a.phase = 'ready';
      }
      break;
    }
    case 'assignment.revise': {
      const a = need(
        world.assignments.find((a) => a.id === command.id),
        'Propuesta inexistente',
      );
      ensure(
        a.phase === 'ready' && !!command.text.trim(),
        'REVISION',
        'La propuesta debe estar lista y el pedido debe tener texto',
      );
      a.revision++;
      a.phase = 'working';
      a.feedback = command.text;
      delete a.output;
      delete a.dueAt;
      delete a.runId;
      break;
    }
    case 'assignment.finish': {
      const a = need(
        world.assignments.find((a) => a.id === command.id),
        'Asignación inexistente',
      );
      ensure(
        command.decision !== 'accept' || a.phase === 'ready',
        'NOT_READY',
        'El resultado todavía no está listo',
      );
      const m = node(a.node);
      m.owner = null;
      m.x = a.returnTo.x;
      m.y = a.returnTo.y;
      if (command.decision === 'accept') {
        if (m.data.kind === 'reference' && m.data.ref.fragment) {
          const fragment = m.data.ref.fragment;
          ensure(
            world.referenceAnchors?.some(
              (anchor) => anchor.id === fragment && anchor.status === 'attached',
            ) === true,
            'FRAGMENT',
            'El fragmento dejó de estar disponible. Cancelá el trabajo y revisá su origen antes de asignarlo otra vez.',
          );
        }
        const results = a.output ?? proposalMaterials(world, a, true);
        ensure(results.length > 0, 'PROPOSAL_EMPTY', 'La propuesta no contiene materiales');
        results.forEach((draft, index) => {
          if (draft.document) {
            const document = need(
              world.docs.find((d) => d.id === draft.document!.id),
              'Documento inexistente',
            );
            ensure(
              draft.document.before === undefined || document.body === draft.document.before,
              'STALE_FRAGMENT',
              'El documento cambió desde la propuesta. Pedí una revisión antes de aceptar.',
            );
            if (m.data.kind === 'reference' && m.data.ref.fragment) {
              const fragment = m.data.ref.fragment;
              const anchor = world.referenceAnchors?.find((a) => a.id === fragment);
              if (anchor?.status === 'attached') {
                anchor.end += draft.document.body.length - document.body.length;
                anchor.quote = draft.document.body.slice(anchor.start, anchor.end);
              }
            }
            document.body = draft.document.body;
          }
          const result = structuredClone(draft.material);
          ensure(
            !world.nodes.some((node) => node.id === result.id),
            'PROPOSAL_DUPLICATE',
            'Este resultado ya fue aplicado',
          );
          result.x = a.position.x + (index % 2) * 290;
          result.y = a.position.y + Math.floor(index / 2) * 250;
          world.nodes.push(result);
        });
      }
      world.assignments = world.assignments.filter((x) => x.id !== a.id);
      restoreMaterialLinks(world, a.links);
      break;
    }
    case 'comment':
      ensure(
        !!command.text.trim() && world.nodes.some((n) => n.id === command.node),
        'COMMENT',
        'Elegí un material y escribí un comentario',
      );
      world.comments.push({
        id: uid(),
        node: command.node,
        author: state.profile.name,
        text: command.text,
        resolved: false,
        replies: [],
      });
      break;
    case 'comment.resolve': {
      const x = need(
        world.comments.find((x) => x.id === command.id),
        'Comentario inexistente',
      );
      x.resolved = !x.resolved;
      break;
    }
    case 'comment.reply':
      if (command.text.trim())
        need(
          world.comments.find((x) => x.id === command.id),
          'Comentario inexistente',
        ).replies.push(command.text);
      break;
  }
}
