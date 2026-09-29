import type { AtmosphereStyle } from './celestial-style';

interface GlowSprite {
  key: string;
  canvas: HTMLCanvasElement;
  halfSize: number;
}

/** La atmósfera se almacena por cuerpo visible y mantiene su proporción al cambiar el zoom. */
export class PlanetAtmosphere {
  private readonly sprites = new Map<string, GlowSprite>();

  draw(
    ctx: CanvasRenderingContext2D,
    id: string,
    x: number,
    y: number,
    style: AtmosphereStyle,
    tint: readonly number[],
    light: readonly number[],
    lightingTilt: number,
    pixelRatio: number,
  ): void {
    const r = style.radiusPx,
      t = style.thicknessPx,
      extent = style.extentPx;
    const key = [r.toFixed(3), t.toFixed(3), extent.toFixed(3), pixelRatio].join(':');
    let sprite = this.sprites.get(id);
    if (!sprite || sprite.key !== key) {
      const halfSize = Math.ceil((r + extent + 1) * pixelRatio) / pixelRatio;
      const canvas = sprite?.canvas ?? document.createElement('canvas');
      canvas.width = Math.round(halfSize * 2 * pixelRatio);
      canvas.height = canvas.width;
      const g = canvas.getContext('2d');
      if (!g) throw new Error('Atmosphere sprite requires Canvas2D');
      g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const base = r - t,
        span = extent + t;
      const color = tint.map((value, channel) =>
        Math.round(value * 0.42 + [194, 224, 255][channel]! * 0.58),
      );
      const rgba = (alpha: number): string => `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
      const glow = g.createRadialGradient(halfSize, halfSize, base, halfSize, halfSize, r + extent);
      glow.addColorStop(0, rgba(0));
      // El foco extiende la luz dentro del radio exterior fijo.
      // Los puntos del gradiente disminuyen desde el borde del cuerpo
      // para conservar la continuidad de la atmósfera.
      glow.addColorStop(t / span, rgba(0.96));
      glow.addColorStop((t + extent * 0.16) / span, rgba(0.9));
      glow.addColorStop((t + extent * 0.34) / span, rgba(0.62));
      glow.addColorStop((t + extent * 0.58) / span, rgba(0.21));
      glow.addColorStop((t + extent * 0.8) / span, rgba(0.035));
      glow.addColorStop(1, rgba(0));
      g.fillStyle = glow;
      g.fillRect(0, 0, halfSize * 2, halfSize * 2);
      // La cara orientada a la estrella recibe más luz; el límite de sombra permanece fijo al rotar la textura.
      const c = Math.cos(lightingTilt),
        s = Math.sin(lightingTilt);
      const lx = light[0]! * c - light[1]! * s,
        ly = light[0]! * s + light[1]! * c;
      const length = Math.hypot(lx, ly) || 1,
        dx = (lx / length) * r,
        dy = (ly / length) * r;
      const daylight = g.createLinearGradient(
        halfSize - dx,
        halfSize - dy,
        halfSize + dx,
        halfSize + dy,
      );
      daylight.addColorStop(0, 'rgba(255,255,255,.34)');
      daylight.addColorStop(0.55, 'rgba(255,255,255,.74)');
      daylight.addColorStop(1, '#fff');
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = daylight;
      g.fillRect(0, 0, halfSize * 2, halfSize * 2);
      g.globalCompositeOperation = 'source-over';
      sprite = { key, canvas, halfSize };
      this.sprites.set(id, sprite);
    }
    ctx.save();
    ctx.globalAlpha *= style.opacity;
    ctx.drawImage(
      sprite.canvas,
      x - sprite.halfSize,
      y - sprite.halfSize,
      sprite.halfSize * 2,
      sprite.halfSize * 2,
    );
    ctx.restore();
  }

  dispose(): void {
    this.sprites.clear();
  }
}
