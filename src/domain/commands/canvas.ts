import { type State, getWorld, type Material, need } from '../model';
import type { Command } from '../command-types';
import { ensure } from '../invariants';
import { releaseZoneMaterials } from '../zone-ownership';
import { restoreMaterialLinks } from '../material-links';
import { arrangeProposals } from '../proposal-layout';
import { sameConnection } from '../link-identity';
import { proposalMaterials } from '../proposal-materials';
import { orderMaterials } from '../material-order';
import { validLinkPreview } from '../link-previews';
import { resolveMedia } from '../resolved-media';
import { validWireframe } from '../wireframes';
import { compositionKinds, wireframeComposition } from '../wireframe-compositions';
import { instantiateLibrary, validLibraryComposition } from '../sketch-library';
import { isComponent } from '../manual-groups';
import { resizedComponent } from '../component-resize';

type CanvasCommand = Extract<
  Command,
  {
    type:
      | 'node.create'
      | 'group.resize'
      | 'wireframe.edit'
      | 'wireframe.compose'
      | 'wireframe.library'
      | 'assignment.interrupt'
      | 'assignment.retry'
      | 'node.rename'
      | 'node.style'
      | 'link.label'
      | 'link.reconnect'
      | 'zone.instruction'
      | 'zone.rename'
      | 'assignment.schedule'
      | 'node.move'
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
        if (destination) destination.nodes = [...new Set([...destination.nodes, ...ids])];
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
        !world.links.some((l) => l.id !== link.id && sameConnection(l, next)),
        'LINK',
        'Ya existe una conexión entre esos anclajes',
      );
      Object.assign(link, next);
      break;
    }
    case 'link.label':
      need(
        world.links.find((l) => l.id === command.id),
        'Conexión inexistente',
      ).label = command.text;
      break;
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
      x.data = {
        ...x.data,
        kind: 'note',
        title: command.title,
        text: command.text,
        color: command.color,
        ...(command.font !== undefined ? { font: command.font } : {}),
        ...(command.fontSize !== undefined ? { fontSize: command.fontSize } : {}),
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
      const nodes = resizedComponent(world, group, command.rect);
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
