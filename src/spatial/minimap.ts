import type { Context } from '../app/context';
import type { WorldSnapshot, Point } from '../domain/model';
import { clamp } from './math';
import { minimapPulseStyle } from './minimap-pulse';
export class Minimap {
  private canvas: HTMLCanvasElement;
  private abort = new AbortController();
  private zoom = 0.027;
  private center: Point = { x: 0, y: 0 };
  private drag: Point | null = null;
  private ownPan = false;
  private manualZoom = false;
  private pulseFrame: number | null = null;
  private pulseTarget: string | null = null;
  private pulseStarted = 0;
  private lastPulsePaint = 0;
  private disposed = false;
  private readonly media = matchMedia('(prefers-reduced-motion: reduce)');
  setWorlds(worlds: readonly WorldSnapshot[]): void {
    this.worlds = worlds;
    this.draw();
  }
  constructor(
    root: HTMLElement,
    private ctx: Context,
    private worlds: readonly WorldSnapshot[],
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 440;
    this.canvas.height = 300;
    this.canvas.setAttribute('aria-label', 'Minimapa del universo');
    this.canvas.tabIndex = 0;
    this.canvas.id = 'minimap';
    this.canvas.className = 'minimap-canvas';
    root.append(this.canvas);
    const radius =
      Math.max(2200, ...worlds.map((w) => Math.max(Math.abs(w.x), Math.abs(w.y)))) + 440;
    this.zoom = 63 / radius;
    this.canvas.addEventListener(
      'pointerdown',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.drag = { x: e.clientX, y: e.clientY };
        this.ownPan = e.shiftKey;
        this.canvas.setPointerCapture(e.pointerId);
        if (!this.ownPan) this.travel(e, true);
      },
      { signal: this.abort.signal },
    );
    this.canvas.addEventListener(
      'pointermove',
      (e) => {
        if (!this.drag) return;
        const d = { x: e.clientX - this.drag.x, y: e.clientY - this.drag.y };
        this.drag = { x: e.clientX, y: e.clientY };
        if (this.ownPan) {
          const box = this.canvas.getBoundingClientRect();
          this.center.x -= (d.x * 220) / box.width / this.zoom;
          this.center.y -= (d.y * 150) / box.height / this.zoom;
          this.draw();
        } else this.travel(e, false);
      },
      { signal: this.abort.signal },
    );
    const release = () => {
      this.drag = null;
    };
    this.canvas.addEventListener('pointerup', release, { signal: this.abort.signal });
    this.canvas.addEventListener('pointercancel', release, { signal: this.abort.signal });
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.manualZoom = true;
        this.zoom = clamp(this.zoom * Math.exp(-e.deltaY * 0.0015), 0.002, 0.18);
        this.draw();
      },
      { passive: false, signal: this.abort.signal },
    );
    this.canvas.addEventListener(
      'keydown',
      (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          const c = ctx.camera?.current;
          if (c)
            ctx.camera?.set({
              ...c,
              x: c.x + (e.key === 'ArrowLeft' ? 160 : e.key === 'ArrowRight' ? -160 : 0),
              y: c.y + (e.key === 'ArrowUp' ? 160 : e.key === 'ArrowDown' ? -160 : 0),
            });
        }
      },
      { signal: this.abort.signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        this.cancelPulse();
        if (!document.hidden) {
          this.pulseStarted = performance.now();
          this.draw();
        }
      },
      { signal: this.abort.signal },
    );
    this.media.addEventListener(
      'change',
      () => {
        this.cancelPulse();
        this.draw();
      },
      { signal: this.abort.signal },
    );
    this.draw();
  }
  private travel(e: PointerEvent, snap: boolean): void {
    const r = this.canvas.getBoundingClientRect(),
      p = {
        x: this.center.x + ((e.clientX - r.left - r.width / 2) * 220) / r.width / this.zoom,
        y: this.center.y + ((e.clientY - r.top - r.height / 2) * 150) / r.height / this.zoom,
      };
    const near = snap
      ? this.worlds
          .map((w) => ({ w, d: Math.hypot(w.x - p.x, w.y - p.y) * this.zoom }))
          .sort((a, b) => a.d - b.d)[0]
      : undefined;
    if (near && near.d < 9) this.ctx.camera?.to(near.w, near.w.id);
    else if (snap) this.ctx.camera?.to(p);
    else this.ctx.camera?.track(p);
    this.draw();
  }
  private cancelPulse(): void {
    if (this.pulseFrame !== null) cancelAnimationFrame(this.pulseFrame);
    this.pulseFrame = null;
  }
  private wakePulse(): void {
    if (
      this.pulseFrame !== null ||
      this.disposed ||
      document.hidden ||
      this.media.matches ||
      !this.pulseTarget
    )
      return;
    this.pulseFrame = requestAnimationFrame((time) => {
      this.pulseFrame = null;
      if (time - this.lastPulsePaint >= 32) {
        this.lastPulsePaint = time;
        this.draw(time);
      } else this.wakePulse();
    });
  }
  draw(time = performance.now()): void {
    if (this.disposed) return;
    const g = this.canvas.getContext('2d');
    if (!g) return;
    const w = 220,
      h = 150;
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.clearRect(0, 0, w, h);
    const cam = this.ctx.camera?.current;
    if (!cam) return;
    const viewport = document.getElementById('viewport')?.getBoundingClientRect();
    if (!this.manualZoom && viewport)
      this.zoom = Math.min(
        this.zoom,
        (220 * 0.48 * cam.z) / viewport.width,
        (150 * 0.48 * cam.z) / viewport.height,
      );
    const to = (p: Point) => ({
      x: w / 2 + (p.x - this.center.x) * this.zoom,
      y: h / 2 + (p.y - this.center.y) * this.zoom,
    });
    const camera = this.ctx.camera;
    const nextTarget =
      camera?.focused && camera.phase === 'captured' && camera.captureFor(camera.focused) > 0.9
        ? camera.focused
        : null;
    if (nextTarget !== this.pulseTarget) {
      this.pulseTarget = nextTarget;
      this.pulseStarted = time;
    }
    const pulse = minimapPulseStyle(time - this.pulseStarted, this.media.matches);
    const drawPulse = (p: Point): void => {
      const glow = g.createRadialGradient(p.x, p.y, 1.8, p.x, p.y, pulse.glowRadius);
      glow.addColorStop(0, `rgba(236,221,255,${Math.min(0.72, pulse.glowOpacity * 0.82)})`);
      glow.addColorStop(0.35, `rgba(220,201,255,${pulse.glowOpacity})`);
      glow.addColorStop(0.72, `rgba(201,178,249,${pulse.glowOpacity * 0.58})`);
      glow.addColorStop(1, 'rgba(201,178,249,0)');
      g.fillStyle = glow;
      g.beginPath();
      g.arc(p.x, p.y, pulse.glowRadius, 0, Math.PI * 2);
      g.fill();
      if (pulse.ringOpacity > 0) {
        g.strokeStyle = `rgba(235,219,255,${pulse.ringOpacity})`;
        g.lineWidth = pulse.ringWidth;
        g.beginPath();
        g.arc(p.x, p.y, pulse.ringRadius, 0, Math.PI * 2);
        g.stroke();
      }
    };
    for (const world of this.worlds) {
      const p = to(world),
        focused = this.ctx.camera?.focused === world.id;
      if (world.id === this.pulseTarget) drawPulse(p);
      g.globalAlpha = world.id === this.pulseTarget ? pulse.coreAlpha : 1;
      g.fillStyle = focused ? '#ead8ff' : world.archived ? '#606777' : '#919aaa';
      g.beginPath();
      g.arc(p.x, p.y, focused ? 3.2 : 1.8, 0, Math.PI * 2);
      g.fill();
      if (world.id === this.pulseTarget) {
        g.globalAlpha = 0.9;
        g.fillStyle = '#f5edff';
        g.beginPath();
        g.arc(p.x, p.y, 0.95, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    const origin = to({ x: 0, y: 0 });
    if (this.pulseTarget === 'new') drawPulse(origin);
    g.strokeStyle = '#8892a7';
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(origin.x, origin.y, 3.2, 0, Math.PI * 2);
    g.stroke();
    const r = document.getElementById('viewport')?.getBoundingClientRect();
    if (r) {
      const p = to({ x: -cam.x / cam.z, y: -cam.y / cam.z }),
        rw = (r.width / cam.z) * this.zoom,
        rh = (r.height / cam.z) * this.zoom;
      g.strokeStyle = '#a9b3cf';
      g.fillStyle = '#9cace914';
      g.lineWidth = 0.8;
      g.fillRect(p.x - rw / 2, p.y - rh / 2, rw, rh);
      g.strokeRect(p.x - rw / 2, p.y - rh / 2, rw, rh);
      this.canvas.dataset.viewportRatio = String(rw / w);
    }
    this.canvas.dataset.zoom = String(this.zoom);
    this.canvas.dataset.center = JSON.stringify(this.center);
    this.canvas.dataset.pulse = JSON.stringify({
      target: this.pulseTarget,
      focused: camera?.focused ?? null,
      active: !!this.pulseTarget && !this.media.matches && !document.hidden,
      elapsedMs: time - this.pulseStarted,
      ...pulse,
    });
    if (this.pulseTarget) this.wakePulse();
    else this.cancelPulse();
  }
  dispose(preserveBitmap = false): void {
    this.disposed = true;
    this.cancelPulse();
    this.abort.abort();
    if (!preserveBitmap) this.canvas.remove();
  }
}
