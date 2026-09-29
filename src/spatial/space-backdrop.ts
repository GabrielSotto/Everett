import type { Camera } from '../domain/model';
import { stableHash } from '../domain/agent-fixtures';
import { deepSkyAssets } from '../assets/deep-sky-assets';
import { trace } from '../app/diagnostics/trace';

export interface BackgroundStar {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Las regiones del fondo conservan posiciones estables en el espacio del Mundo. */
export function starTile(column: number, row: number): BackgroundStar[] {
  const next = random(stableHash(`stars-072:${column}:${row}`)),
    colors = ['216,227,247', '235,232,214', '236,211,170', '186,211,241'];
  const clustered = next() > 0.67,
    groupX = 150 + next() * 400,
    groupY = 150 + next() * 400;
  return Array.from({ length: 78 }, (_, index) => {
    const weight = next();
    let x = next() * 700,
      y = next() * 700;
    if (clustered && index < 15) {
      const scatter = Math.sqrt(-2 * Math.log(Math.max(0.001, next()))) * 49,
        angle = next() * Math.PI * 2;
      x = Math.min(680, Math.max(20, groupX + Math.cos(angle) * scatter));
      y = Math.min(680, Math.max(20, groupY + Math.sin(angle) * scatter));
    }
    return {
      x,
      y,
      radius:
        weight > 0.975
          ? 1.45 + next() * 0.3
          : weight > 0.7
            ? 0.85 + next() * 0.45
            : 0.38 + next() * 0.4,
      alpha: 0.36 + next() * 0.47,
      color: colors[Math.floor(next() * colors.length)]!,
    };
  });
}
const tileCache = new Map<string, BackgroundStar[]>();
export class SpaceBackdrop {
  readonly canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private camera: Camera = { x: 0, y: 0, z: 1 };
  private pictures = new Map<number, HTMLImageElement>();
  private disposed = false;
  private resize: ResizeObserver;
  constructor(private host: HTMLElement) {
    this.canvas.className = 'stars space-backdrop';
    this.canvas.setAttribute('aria-hidden', 'true');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Space backdrop requires Canvas2D');
    this.ctx = ctx;
    host.prepend(this.canvas);
    this.resize = new ResizeObserver(() => this.draw());
    this.resize.observe(host);
    deepSkyAssets.forEach((asset, index) => {
      const image = new Image();
      image.onload = () => {
        if (!this.disposed) {
          this.pictures.set(index, image);
          this.draw();
        }
      };
      image.onerror = () => {
        if (!this.disposed)
          trace.error(new Error(`Deep sky texture ${index} could not load`), 'background.texture');
      };
      image.src = asset.data;
    });
    this.draw();
  }
  update(camera: Camera): void {
    this.camera = camera;
    this.draw();
  }
  private draw(): void {
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
    const cx = width / 2 + this.camera.x * 0.18,
      cy = height / 2 + this.camera.y * 0.18;
    const sky: object[] = [];
    // Los objetos decorativos se ven durante la navegación y quedan fuera de la interacción y del minimapa.
    const gx = Math.floor(-cx / 1550),
      gy = Math.floor(-cy / 1550);
    for (let column = gx - 1; column <= gx + Math.ceil(width / 1550) + 1; column++)
      for (let row = gy - 1; row <= gy + Math.ceil(height / 1550) + 1; row++) {
        const next = random(stableHash(`sky-072:${column}:${row}`));
        const index = Math.floor(next() * 8),
          x = column * 1550 + next() * 1100 + 220 + cx,
          y = row * 1550 + next() * 1100 + 210 + cy;
        const nebula = index < 4,
          size = nebula ? 530 + next() * 310 : 180 + next() * 180;
        const angle = (next() - 0.5) * 2.5,
          opacity = nebula ? 0.4 + next() * 0.16 : 0.45 + next() * 0.18;
        if (x + size < 0 || x - size > width || y + size < 0 || y - size > height) continue;
        const image = this.pictures.get(index);
        if (!image) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = opacity;
        ctx.drawImage(image, -size / 2, -size / 2, size, size);
        ctx.restore();
        sky.push({ kind: nebula ? 'nebula' : 'galaxy', x, y, size, opacity, index });
      }
    // La nebulosa próxima a la vista inicial mantiene su posición en el fondo al mover la cámara.
    const landmark = this.pictures.get(0),
      lx = cx - 470,
      ly = cy - 160;
    if (landmark && lx > -700 && lx < width + 700 && ly > -700 && ly < height + 700) {
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.translate(lx, ly);
      ctx.rotate(-0.36);
      ctx.drawImage(landmark, -390, -390, 780, 780);
      ctx.restore();
      sky.push({ kind: 'nebula', x: lx, y: ly, size: 780, opacity: 0.38, index: 0 });
    }
    const sx = width / 2 + this.camera.x * 0.11,
      sy = height / 2 + this.camera.y * 0.11;
    const startX = Math.floor(-sx / 700),
      startY = Math.floor(-sy / 700);
    let stars = 0,
      bright = 0;
    for (let col = startX; col <= startX + Math.ceil(width / 700) + 1; col++)
      for (let row = startY; row <= startY + Math.ceil(height / 700) + 1; row++) {
        const key = `${col}:${row}`;
        let tile = tileCache.get(key);
        if (!tile) {
          tile = starTile(col, row);
          tileCache.set(key, tile);
          if (tileCache.size > 180) tileCache.delete(tileCache.keys().next().value!);
        }
        for (const star of tile) {
          const x = col * 700 + star.x + sx,
            y = row * 700 + star.y + sy;
          if (x < -4 || y < -4 || x > width + 4 || y > height + 4) continue;
          if (star.radius > 1.4) {
            const glow = ctx.createRadialGradient(x, y, 0, x, y, star.radius * 3);
            glow.addColorStop(0, `rgba(${star.color},.26)`);
            glow.addColorStop(1, `rgba(${star.color},0)`);
            ctx.fillStyle = glow;
            ctx.fillRect(x - 6, y - 6, 12, 12);
            bright++;
          }
          ctx.fillStyle = `rgba(${star.color},${star.alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, star.radius, 0, Math.PI * 2);
          ctx.fill();
          stars++;
        }
      }
    this.canvas.dataset.sky = JSON.stringify(sky);
    this.canvas.dataset.stars = String(stars);
    this.canvas.dataset.brightStars = String(bright);
  }
  dispose(): void {
    this.disposed = true;
    this.resize.disconnect();
  }
}
