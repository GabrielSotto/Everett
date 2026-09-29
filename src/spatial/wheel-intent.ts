/** Cada ráfaga produce como máximo una intención de navegación y utiliza un único reloj. */
export class WheelIntent {
  private sum = 0;
  private last = 0;
  private lockedUntil = 0;
  lock(milliseconds = 420, now = Date.now()): void {
    this.lockedUntil = now + milliseconds;
    this.sum = 0;
  }
  get progress(): number {
    return Math.min(1, Math.abs(this.sum) / 160);
  }
  consume(delta: number, now = Date.now()): 'enter' | 'leave' | null {
    if (now < this.lockedUntil || !Number.isFinite(delta) || delta === 0) return null;
    if (now - this.last > 420 || Math.sign(delta) !== Math.sign(this.sum)) this.sum = 0;
    this.sum += delta;
    this.last = now;
    if (Math.abs(this.sum) < 160) return null;
    const direction = this.sum < 0 ? 'enter' : 'leave';
    this.sum = 0;
    this.lockedUntil = now + 340;
    return direction;
  }
}
