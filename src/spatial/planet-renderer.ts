import type { Camera } from '../domain/model';
import { trace } from '../app/diagnostics/trace';
import { globeMaps, type GlobeMap } from '../assets/planet-maps';
import { planetAppearance } from './appearance';
import { atmosphereStyle, longitudeAt, spinProfile } from './celestial-style';
import { ambientSeconds, suspendAmbient } from './ambient-clock';
import { clamp } from './math';
import { PlanetAtmosphere } from './planet-atmosphere';
import { drawOrbit, orbitPosition, orbitProfile } from './planet-orbit';

interface Body {
  id: string;
  x: number;
  y: number;
  seed: number;
}
interface Pixels {
  bytes: Uint8ClampedArray;
  width: number;
  height: number;
  meta: GlobeMap;
}
interface SphereGrid {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  alpha: Uint8ClampedArray;
}
interface Projection {
  u: Float32Array;
  row: Uint32Array;
  nextRow: Uint32Array;
  fy: Float32Array;
  shade: Float32Array;
  rim: Float32Array;
  alpha: Uint8ClampedArray;
}
interface Sprite {
  canvas: HTMLCanvasElement;
  angle: number;
  resolution: number;
  projection: Projection | null;
}
const textures = new Map<number, Promise<Pixels>>();
const grids = new Map<number, SphereGrid>();

function texture(index: number): Promise<Pixels> {
  const old = textures.get(index);
  if (old) return old;
  const result = new Promise<Pixels>((resolve, reject) => {
    const meta = globeMaps[index];
    if (!meta) {
      reject(new Error(`Missing globe map ${index}`));
      return;
    }
    const image = new Image();
    image.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = image.naturalWidth;
        c.height = image.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Globe texture decoder unavailable');
        ctx.drawImage(image, 0, 0);
        resolve({
          bytes: ctx.getImageData(0, 0, c.width, c.height).data,
          width: c.width,
          height: c.height,
          meta,
        });
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error(`Globe texture ${index} could not be decoded`));
    image.src = meta.data;
  });
  textures.set(index, result);
  return result;
}
function grid(size: number): SphereGrid {
  const old = grids.get(size);
  if (old) return old;
  const length = size * size,
    result: SphereGrid = {
      x: new Float32Array(length),
      y: new Float32Array(length),
      z: new Float32Array(length),
      alpha: new Uint8ClampedArray(length),
    };
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const i = row * size + col,
        x = (col + 0.5 - size / 2) / (size / 2),
        y = (row + 0.5 - size / 2) / (size / 2),
        r = x * x + y * y;
      result.x[i] = x;
      result.y[i] = y;
      result.z[i] = Math.sqrt(Math.max(0, 1 - r));
      result.alpha[i] = clamp((1 - r) * size * 255, 0, 255);
    }
  grids.set(size, result);
  return result;
}
/** La rotación de longitud conserva latitud e iluminación y permite reutilizar los cálculos trigonométricos. */
function projection(map: Pixels, size: number, tilt: number, lightingTilt: number): Projection {
  const geometry = grid(size),
    n = size * size;
  const p: Projection = {
    u: new Float32Array(n),
    row: new Uint32Array(n),
    nextRow: new Uint32Array(n),
    fy: new Float32Array(n),
    shade: new Float32Array(n),
    rim: new Float32Array(n),
    alpha: geometry.alpha,
  };
  const ct = Math.cos(tilt),
    st = Math.sin(tilt),
    cl = Math.cos(lightingTilt),
    sl = Math.sin(lightingTilt),
    light = map.meta.light;
  for (let i = 0; i < n; i++) {
    if (!p.alpha[i]) continue;
    const x = geometry.x[i]!,
      y = geometry.y[i]!,
      z = geometry.z[i]!;
    const tx = x * ct + y * st,
      ty = -x * st + y * ct;
    p.u[i] = (Math.atan2(tx, z) / (Math.PI * 2) + 0.5) * map.width;
    const v = clamp((Math.asin(clamp(ty, -1, 1)) / Math.PI + 0.5) * map.height, 0, map.height - 1),
      row = Math.floor(v);
    p.row[i] = row * map.width * 4;
    p.nextRow[i] = Math.min(row + 1, map.height - 1) * map.width * 4;
    p.fy[i] = v - row;
    const l = Math.max(
      0,
      (x * cl + y * sl) * light[0] + (-x * sl + y * cl) * light[1] + z * light[2],
    );
    p.shade[i] = 0.033 + Math.pow(l, 0.86) * 0.967;
    p.rim[i] = Math.pow(1 - z, 4) * l * 0.58;
  }
  return p;
}
/** Reproyecta la longitud de la textura manteniendo fijo el límite de sombra. */
function project(
  map: Pixels,
  size: number,
  angle: number,
  p: Projection,
  canvas: HTMLCanvasElement,
): void {
  if (canvas.width !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Globe projection context unavailable');
  const output = ctx.createImageData(size, size),
    dest = output.data,
    source = map.bytes,
    width = map.width;
  const shift = ((angle / (Math.PI * 2)) % 1) * width,
    atmosphere = map.meta.atmosphere;
  for (let i = 0; i < p.alpha.length; i++) {
    const alpha = p.alpha[i]!;
    if (!alpha) continue;
    let u = p.u[i]! - shift;
    if (u < 0) u += width;
    if (u >= width) u -= width;
    const x0 = Math.floor(u),
      x1 = (x0 + 1) % width,
      fx = u - x0,
      fy = p.fy[i]!;
    const p00 = p.row[i]! + x0 * 4,
      p10 = p.row[i]! + x1 * 4,
      p01 = p.nextRow[i]! + x0 * 4,
      p11 = p.nextRow[i]! + x1 * 4;
    const out = i * 4,
      shade = p.shade[i]!,
      rim = p.rim[i]!;
    for (let channel = 0; channel < 3; channel++) {
      const upper = source[p00 + channel]! * (1 - fx) + source[p10 + channel]! * fx;
      const lower = source[p01 + channel]! * (1 - fx) + source[p11 + channel]! * fx;
      dest[out + channel] = (upper * (1 - fy) + lower * fy) * shade + rim * atmosphere[channel]!;
    }
    dest[out + 3] = alpha;
  }
  ctx.putImageData(output, 0, 0);
}

/** Un canvas transparente proyecta los Mundos visibles y reutiliza sprites al mover la cámara. */
export class PlanetRenderer {
  readonly canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private camera: Camera = { x: 0, y: 0, z: 1 };
  private bodies: readonly Body[] = [];
  private elements = new Map<string, HTMLElement>();
  private captures = new Map<string, number>();
  private decoded = new Map<number, Pixels>();
  private loading = new Set<number>();
  private sprites = new Map<string, Sprite>();
  private readonly atmosphere = new PlanetAtmosphere();
  private frame = 0;
  private lastPaint = 0;
  private disposed = false;
  private seconds = 0;
  private readonly media = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly abort = new AbortController();
  private readonly resize: ResizeObserver;
  constructor(private host: HTMLElement) {
    this.canvas.className = 'planet-renderer';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.dataset.renderer = 'spherical-albedo';
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Planet renderer requires Canvas2D');
    this.ctx = context;
    host.insertBefore(this.canvas, host.querySelector('.space-plane'));
    this.resize = new ResizeObserver(() => this.paint(true));
    this.resize.observe(host);
    document.addEventListener(
      'visibilitychange',
      () => {
        suspendAmbient();
        if (document.hidden) {
          cancelAnimationFrame(this.frame);
          this.frame = 0;
        } else this.wake();
      },
      { signal: this.abort.signal },
    );
    this.media.addEventListener(
      'change',
      () => {
        suspendAmbient();
        this.paint(true);
        this.wake();
      },
      { signal: this.abort.signal },
    );
    this.seconds = ambientSeconds(performance.now(), false);
    this.wake();
  }
  setBodies(bodies: readonly Body[]): void {
    this.bodies = bodies;
    this.elements = new Map(
      Array.from(this.host.querySelectorAll<HTMLElement>('.world-body[data-focus]')).map((el) => [
        el.dataset.focus!,
        el,
      ]),
    );
    this.paint(true);
  }
  update(camera: Camera, capture: (id: string) => number): void {
    this.camera = camera;
    for (const body of this.bodies) this.captures.set(body.id, capture(body.id));
    this.paint(false);
  }
  private wake(): void {
    if (!this.frame && !this.disposed && !document.hidden)
      this.frame = requestAnimationFrame((t) => this.tick(t));
  }
  private tick(time: number): void {
    this.frame = 0;
    if (this.disposed || document.hidden) return;
    this.seconds = ambientSeconds(time, !this.media.matches);
    if (time - this.lastPaint > 85) {
      this.paint(true);
      this.lastPaint = time;
    }
    if (!this.media.matches) this.wake();
  }
  private paint(rotate: boolean): void {
    if (this.disposed) return;
    const width = this.host.clientWidth,
      height = this.host.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    if (
      this.canvas.width !== Math.round(width * ratio) ||
      this.canvas.height !== Math.round(height * ratio)
    ) {
      this.canvas.width = Math.round(width * ratio);
      this.canvas.height = Math.round(height * ratio);
    }
    const ctx = this.ctx;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const evidence: object[] = [];
    for (const body of this.bodies) {
      const el = this.elements.get(body.id);
      if (!el) continue;
      const capture = this.captures.get(body.id) ?? 0,
        z = this.camera.z;
      const radius = 97 * z * (1 + 0.035 * capture);
      const x = width / 2 + this.camera.x + body.x * z,
        y = height / 2 + this.camera.y + body.y * z - 26 * z;
      const appearance = planetAppearance(body.seed, body.id, globeMaps.length),
        extent = radius * (appearance.orbit ? 2 : 1) + 12;
      if (x + extent < 0 || x - extent > width || y + extent < 0 || y - extent > height) continue;
      const index = appearance.texture;
      const map = this.decoded.get(index);
      if (!map) {
        if (!this.loading.has(index)) {
          this.loading.add(index);
          void texture(index)
            .then((value) => {
              if (!this.disposed) {
                this.decoded.set(index, value);
                this.paint(true);
              }
            })
            .catch((error) => {
              if (!this.disposed) trace.error(error, 'planet.texture');
            });
        }
        continue;
      }
      const profile = spinProfile(body.id),
        angle = longitudeAt(profile, this.seconds),
        baseTilt = (appearance.rotation * Math.PI) / 180;
      // La resolución del proyector disminuye con el tamaño visible del planeta.
      const resolution =
        radius < 15
          ? 32
          : radius < 30
            ? 64
            : radius < 60
              ? 128
              : radius < 100
                ? 192
                : radius < 150
                  ? 288
                  : 384;
      let sprite = this.sprites.get(body.id);
      if (!sprite) {
        sprite = {
          canvas: document.createElement('canvas'),
          angle: Infinity,
          resolution,
          projection: null,
        };
        this.sprites.set(body.id, sprite);
      }
      if (
        sprite.resolution !== resolution ||
        !Number.isFinite(sprite.angle) ||
        (rotate && Math.abs(sprite.angle - angle) > 0.00045)
      ) {
        if (!sprite.projection || sprite.resolution !== resolution)
          sprite.projection = projection(map, resolution, baseTilt + profile.tiltRadians, baseTilt);
        project(map, resolution, angle, sprite.projection, sprite.canvas);
        sprite.angle = angle;
        sprite.resolution = resolution;
      }
      el.dataset.liveGlobe = 'true';
      const style = atmosphereStyle(radius, capture),
        dim = el.classList.contains('dimmed') ? 0.12 : 1;
      const orbit = appearance.orbit ? orbitProfile(body.id, appearance.orbitAngle) : null,
        moon = orbit ? orbitPosition(orbit, this.seconds) : null;
      ctx.save();
      ctx.globalAlpha = dim;
      if (orbit && moon) drawOrbit(ctx, { x, y }, radius, orbit, moon, 'back');
      this.atmosphere.draw(
        ctx,
        body.id,
        x,
        y,
        style,
        map.meta.atmosphere,
        map.meta.light,
        baseTilt,
        ratio,
      );
      ctx.filter = `hue-rotate(${appearance.hueShift}deg)`;
      ctx.drawImage(sprite.canvas, x - radius, y - radius, radius * 2, radius * 2);
      ctx.filter = 'none';
      if (orbit && moon) drawOrbit(ctx, { x, y }, radius, orbit, moon, 'front');
      ctx.restore();
      evidence.push({
        id: body.id,
        x,
        y,
        radius,
        halo: style,
        angle: sprite.angle,
        tilt: baseTilt + profile.tiltRadians,
        direction: profile.direction,
        period: profile.periodSeconds,
        resolution,
        orbit: orbit && moon ? { ...orbit, moon } : null,
      });
    }
    this.canvas.dataset.worlds = JSON.stringify(evidence);
    this.canvas.dataset.seconds = this.seconds.toFixed(4);
    this.canvas.dataset.paused = String(this.media.matches || document.hidden);
    this.canvas.dataset.frame = String(Number(this.canvas.dataset.frame ?? '0') + 1);
  }
  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.abort.abort();
    this.resize.disconnect();
    this.sprites.clear();
    this.atmosphere.dispose();
    suspendAmbient();
  }
}
