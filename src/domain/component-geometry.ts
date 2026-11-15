import type { ComponentElement, ComponentTree } from './component-tree';
import type { DeepReadonly } from './readonly';
import { centerOf, rotatedPose, type OrientedRect } from './rotation';

/** Una caja local se expresa desde la esquina del padre y gira alrededor de su centro. */
export function childPose(parent: OrientedRect, local: OrientedRect): OrientedRect {
  const rect = {
    x: parent.x + local.x,
    y: parent.y + local.y,
    width: local.width,
    height: local.height,
    rotation: local.rotation,
  };
  if (!parent.rotation) return rect;
  const pose = rotatedPose(rect, centerOf(parent), parent.rotation);
  return { x: pose.x, y: pose.y, width: rect.width, height: rect.height, rotation: pose.rotation };
}

export function localPose(parent: OrientedRect, world: OrientedRect): OrientedRect {
  const local = parent.rotation ? rotatedPose(world, centerOf(parent), -parent.rotation) : world;
  return {
    x: local.x - parent.x,
    y: local.y - parent.y,
    width: world.width,
    height: world.height,
    rotation: local.rotation,
  };
}

export function componentPoses(tree: DeepReadonly<ComponentTree>): Map<string, OrientedRect> {
  const poses = new Map<string, OrientedRect>();
  const visit = (e: DeepReadonly<ComponentElement>, pose: OrientedRect) => {
    poses.set(e.id, pose);
    for (const child of e.children) visit(child, childPose(pose, child));
  };
  visit(tree.root, {
    x: tree.origin.x + tree.root.x,
    y: tree.origin.y + tree.root.y,
    width: tree.root.width,
    height: tree.root.height,
    rotation: tree.rotation,
  });
  return poses;
}
