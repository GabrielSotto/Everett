export interface PendingResources {
  timeouts: number;
  intervals: number;
  frames: number;
}

declare global {
  interface Window {
    EverettResourceProbe?: () => PendingResources;
  }
}

/** Cuenta trabajo pendiente sin retener nodos, callbacks ni vistas del producto. */
export function installResourceProbe(): void {
  const browser: Window = window;
  const timeouts = new Set<number>();
  const intervals = new Set<number>();
  const frames = new Set<number>();
  const timeout = browser.setTimeout.bind(window);
  const interval = browser.setInterval.bind(window);
  const clearTimeout = browser.clearTimeout.bind(window);
  const clearInterval = browser.clearInterval.bind(window);
  const requestFrame = browser.requestAnimationFrame.bind(window);
  const cancelFrame = browser.cancelAnimationFrame.bind(window);
  browser.setTimeout = (handler, delay, ...args) => {
    if (typeof handler !== 'function') return timeout(handler, delay, ...args);
    const id = timeout(() => {
      timeouts.delete(id);
      handler.apply(browser, args);
    }, delay);
    timeouts.add(id);
    return id;
  };
  browser.setInterval = (handler, delay, ...args) => {
    const id = interval(handler, delay, ...args);
    intervals.add(id);
    return id;
  };
  browser.clearTimeout = (id) => {
    timeouts.delete(id ?? 0);
    intervals.delete(id ?? 0);
    clearTimeout(id);
  };
  browser.clearInterval = (id) => {
    timeouts.delete(id ?? 0);
    intervals.delete(id ?? 0);
    clearInterval(id);
  };
  browser.requestAnimationFrame = (callback) => {
    const id = requestFrame((time) => {
      frames.delete(id);
      callback(time);
    });
    frames.add(id);
    return id;
  };
  browser.cancelAnimationFrame = (id) => {
    frames.delete(id);
    cancelFrame(id);
  };
  browser.EverettResourceProbe = () => ({
    timeouts: timeouts.size,
    intervals: intervals.size,
    frames: frames.size,
  });
}

export function seededOrder<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let state = seed >>> 0;
  for (let index = result.length - 1; index > 0; index--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const other = (state >>> 0) % (index + 1);
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}
