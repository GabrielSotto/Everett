import { routeKey, type Camera, type Frame, type Route, type State, type Surface } from './model';

/** El historial contiene los contextos que permiten regresar a una escala superior. */
export function initialCamera(route: Route): Camera {
  return {
    x: 0,
    y: 0,
    z:
      route.kind === 'universe'
        ? 0.68
        : route.kind === 'world'
          ? 0.82
          : route.kind === 'surface' && route.surface === 'canvas'
            ? 0.88
            : 1,
  };
}
export function surfaceOf(route: Route): Surface | null {
  return route.kind === 'note' || route.kind === 'material'
    ? 'canvas'
    : route.kind === 'surface'
      ? route.surface
      : null;
}
export function isObject(route: Route): boolean {
  return (
    route.kind === 'note' ||
    route.kind === 'material' ||
    (route.kind === 'surface' && route.entity !== null)
  );
}
export function sameSurface(a: Route, b: Route): boolean {
  return (
    a.kind !== 'universe' &&
    b.kind !== 'universe' &&
    a.world === b.world &&
    surfaceOf(a) !== null &&
    surfaceOf(a) === surfaceOf(b)
  );
}
export function semanticParent(route: Route): Route {
  if (route.kind === 'note' || route.kind === 'material')
    return { kind: 'surface', world: route.world, surface: 'canvas', entity: null };
  if (route.kind === 'surface')
    return route.entity !== null
      ? { kind: 'surface', world: route.world, surface: route.surface, entity: null }
      : { kind: 'world', world: route.world };
  return { kind: 'universe' };
}
function savedFrame(state: State, route: Route, camera: Camera): Frame {
  if (routeKey(state.route) === routeKey(route)) return { route, camera: { ...camera } };
  return structuredClone(
    state.history.find((f) => routeKey(f.route) === routeKey(route)) ?? {
      route,
      camera: initialCamera(route),
    },
  );
}
function rootFrames(state: State, target: Route, camera: Camera): Frame[] {
  const universe = savedFrame(state, { kind: 'universe' }, camera);
  if (target.kind === 'universe') return [];
  if (target.kind === 'world') return [universe];
  return [universe, savedFrame(state, { kind: 'world', world: target.world }, camera)];
}
export function enterRoute(
  state: State,
  target: Route,
  camera: Camera,
): Pick<State, 'route' | 'camera' | 'history'> {
  if (routeKey(target) === routeKey(state.route))
    return { route: target, camera: { ...camera }, history: state.history };
  // Reabrir la superficie contenedora recupera su contexto de salida.
  const ancestorIndex = state.history.findIndex((f) => routeKey(f.route) === routeKey(target));
  if (ancestorIndex >= 0) {
    const frame = state.history[ancestorIndex]!;
    return {
      route: target,
      camera: { ...frame.camera },
      history: state.history.slice(0, ancestorIndex),
    };
  }
  if (sameSurface(state.route, target) && isObject(state.route) && isObject(target)) {
    return { route: target, camera: { ...camera }, history: state.history };
  }
  let history = rootFrames(state, target, camera);
  if (isObject(target)) {
    const old = state.route;
    if (old.kind === 'surface' && old.world === targetWorld(target)) {
      // Una referencia entre superficies conserva un único contexto de regreso con su cámara.
      if (old.entity === null) history = [...state.history, { route: old, camera: { ...camera } }];
      else if (sameSurface(old, target)) history = state.history;
      else history.push(savedFrame(state, semanticParent(target), camera));
    } else {
      history.push(savedFrame(state, semanticParent(target), camera));
    }
  }
  // Elimina duplicados adyacentes y conserva los demás contextos de regreso.
  history = history.filter(
    (f, i) => i === 0 || routeKey(f.route) !== routeKey(history[i - 1]!.route),
  );
  return { route: target, camera: initialCamera(target), history };
}
function targetWorld(route: Route): string | null {
  return route.kind === 'universe' ? null : route.world;
}
export function leaveRoute(state: State): Pick<State, 'route' | 'camera' | 'history'> {
  if (state.route.kind === 'universe')
    return { route: state.route, camera: state.camera, history: [] };
  const history = [...state.history];
  const frame = history.pop();
  const route = frame?.route ?? semanticParent(state.route);
  return { route, camera: { ...(frame?.camera ?? initialCamera(route)) }, history };
}
