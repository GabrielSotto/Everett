import type { World, Zone } from './model';
import { restoreMaterialLinks } from './material-links';

/** Retirar al agente devuelve todos los materiales de la zona en una única operación. */
export function releaseZoneMaterials(world: World, zone: Zone, at: number): void {
  if (!zone.agent) return;
  const jobs = world.assignments.filter((a) => a.agent === zone.agent);
  for (const job of jobs) {
    const node = world.nodes.find((n) => n.id === job.node);
    if (node) {
      node.owner = null;
      node.x = job.returnTo.x;
      node.y = job.returnTo.y;
    }
  }
  world.assignments = world.assignments.filter((a) => a.agent !== zone.agent);
  for (const job of jobs) restoreMaterialLinks(world, job.links);
  for (const run of world.runs.filter((r) => r.agent === zone.agent && r.status === 'running')) {
    run.status = 'cancelled';
    run.finishedAt = Math.max(at, run.startedAt);
  }
}
