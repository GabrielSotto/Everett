import type { Point, Camera } from '../domain/model';
import { clamp, focus } from './math';
import { flightProgress, flightDuration } from './celestial-style';
import { cameraTuning, focusTuning, gravityTuning } from './tuning';
import {
  attractionStep,
  panThroughFields,
  sampleBody,
  sampleField,
  type FieldBody,
  type FieldPhase,
} from './gravity';
export type FocusPhase = FieldPhase;
interface Flight {
  from: Camera;
  to: Camera;
  started: number | null;
  duration: number;
}
export interface GravityDiagnostic {
  phase: FocusPhase;
  field: string | null;
  influence: number;
  distance: number | null;
  radius: number | null;
  inputGain: number;
  attraction: Point;
  manualTravel: boolean;
  halos: Record<string, number>;
}

/** La cámara, la entrada directa y los vuelos comparten un ciclo de presentación. */
export class SpatialCamera {
  private value: Camera;
  private target: Camera;
  private frame = 0;
  private previous: Point | null = null;
  private velocity: Point = { x: 0, y: 0 };
  private items: FieldBody[] = [];
  private flightFocus: string | null = null;
  private flight: Flight | null = null;
  private manualTravel = false;
  private outward = false;
  private inputGain = 1;
  private attraction: Point = { x: 0, y: 0 };
  private lastFrame = 0;
  private readonly halos = new Map<string, number>();
  focused: string | null = null;
  phase: FocusPhase = 'captured';
  constructor(
    c: Camera,
    private readonly changed: (c: Camera, focus: string | null, strength: number) => void,
    private readonly gravity = false,
  ) {
    this.value = { ...c };
    this.target = { ...c };
  }
  get current(): Camera {
    return { ...this.value };
  }
  get destination(): Camera {
    return { ...this.target };
  }
  get isDragging(): boolean {
    return this.previous !== null;
  }
  captureFor(id: string): number {
    return this.halos.get(id) ?? 0;
  }
  diagnostics(): GravityDiagnostic {
    const field = sampleField(this.items, this.value);
    return {
      phase: this.phase,
      field: field?.id ?? null,
      influence: field?.influence ?? 0,
      distance: field?.distance ?? null,
      radius: field?.radius ?? null,
      inputGain: this.inputGain,
      attraction: { ...this.attraction },
      manualTravel: this.manualTravel,
      halos: Object.fromEntries(this.halos),
    };
  }
  setItems(items: FieldBody[], preferred: string | null = null): void {
    this.items = items;
    for (const id of this.halos.keys()) if (!items.some((i) => i.id === id)) this.halos.delete(id);
    if (this.flightFocus && !items.some((i) => i.id === this.flightFocus)) this.flightFocus = null;
    if (preferred && items.some((i) => i.id === preferred)) this.focused = preferred;
    if (this.emit(16)) this.wake();
  }
  private emit(dt = 16): boolean {
    const field = sampleField(this.items, this.value);
    if (this.flightFocus && this.items.some((i) => i.id === this.flightFocus))
      this.focused = this.flightFocus;
    else if (this.gravity) this.focused = field?.id ?? null;
    else
      this.focused = focus(this.items, this.value, this.focused, focusTuning.surfaceHysteresisPx);
    if (!this.focused) this.phase = 'released';
    else if (this.gravity && this.previous && this.outward && !this.manualTravel)
      this.phase = 'escaping';
    else
      this.phase =
        !field || field.distance > field.radius * gravityTuning.capturedCoreRatio
          ? 'approaching'
          : 'captured';
    let settling = false;
    for (const item of this.items) {
      const sample = sampleBody(item, this.items, this.value);
      // La iluminación se deriva de la intensidad continua del campo.
      const desired = this.gravity ? sample.influence : item.id === this.focused ? 1 : 0;
      const old = this.halos.get(item.id) ?? 0;
      const strength =
        Math.abs(desired - old) < 0.001
          ? desired
          : old + (desired - old) * (1 - Math.exp(-dt / gravityTuning.haloResponseMs));
      this.halos.set(item.id, strength);
      if (Math.abs(desired - strength) > 0.0015) settling = true;
    }
    this.changed(this.current, this.focused, this.focused ? this.captureFor(this.focused) : 0);
    return settling;
  }
  set(c: Camera, immediate = false): void {
    this.flight = null;
    this.target = { ...c };
    if (immediate) {
      this.value = { ...c };
      if (this.emit()) this.wake();
    } else this.wake();
  }
  /** El vuelo explícito conserva su destino independientemente de la atracción gravitatoria. */
  to(p: Point, id?: string, zoom = this.target.z): void {
    this.flightFocus = id ?? null;
    this.manualTravel = true;
    if (id) this.focused = id;
    const destination = { x: -p.x * zoom, y: -p.y * zoom, z: zoom };
    const distance = Math.hypot(destination.x - this.value.x, destination.y - this.value.y);
    this.target = destination;
    this.flight = {
      from: this.current,
      to: destination,
      started: null,
      duration: flightDuration(distance),
    };
    this.wake();
  }
  track(p: Point): void {
    this.flightFocus = null;
    this.manualTravel = true;
    this.set({ x: -p.x * this.target.z, y: -p.y * this.target.z, z: this.target.z });
  }
  zoom(delta: number, anchor: Point = { x: 0, y: 0 }): void {
    this.manualTravel = true;
    const z = clamp(
        this.target.z * Math.exp(-delta * cameraTuning.zoomSensitivity),
        cameraTuning.minimumZoom,
        cameraTuning.maximumZoom,
      ),
      ratio = z / this.target.z;
    this.set({
      z,
      x: anchor.x - (anchor.x - this.target.x) * ratio,
      y: anchor.y - (anchor.y - this.target.y) * ratio,
    });
  }
  zoomFocused(delta: number): void {
    const item = this.items.find((i) => i.id === this.focused);
    if (!item || delta > 0) {
      this.flightFocus = null;
      this.zoom(delta);
      return;
    }
    this.flightFocus = item.id;
    this.manualTravel = true;
    const z = clamp(
      this.target.z * Math.exp(-delta * cameraTuning.zoomSensitivity),
      cameraTuning.minimumZoom,
      cameraTuning.maximumZoom,
    );
    const ratio = z / this.target.z,
      centerWeight = Math.min(1, Math.abs(delta) / 370);
    this.set({
      z,
      x: this.target.x * ratio * (1 - centerWeight) - item.x * z * centerWeight,
      y: this.target.y * ratio * (1 - centerWeight) - item.y * z * centerWeight,
    });
  }
  start(p: Point): void {
    this.previous = p;
    this.velocity = { x: 0, y: 0 };
    this.flightFocus = null;
    this.flight = null;
    this.manualTravel = false;
    this.outward = false;
    this.inputGain = 1;
    this.attraction = { x: 0, y: 0 };
    this.target = this.current;
  }
  pan(p: Point): void {
    if (!this.previous) return;
    const delta = { x: p.x - this.previous.x, y: p.y - this.previous.y },
      before = { ...this.target };
    this.previous = p;
    if (this.gravity) {
      const step = panThroughFields(this.target, delta, this.items);
      this.target = step.camera;
      this.outward = step.outward;
      this.inputGain = step.gain;
    } else {
      this.target.x += delta.x;
      this.target.y += delta.y;
    }
    this.velocity = { x: this.target.x - before.x, y: this.target.y - before.y };
    this.wake();
  }
  stop(): void {
    if (!this.previous) return;
    this.previous = null;
    this.outward = false;
    this.target.x += clamp(
      this.velocity.x * cameraTuning.inertiaMultiplier,
      -cameraTuning.maximumInertiaPx,
      cameraTuning.maximumInertiaPx,
    );
    this.target.y += clamp(
      this.velocity.y * cameraTuning.inertiaMultiplier,
      -cameraTuning.maximumInertiaPx,
      cameraTuning.maximumInertiaPx,
    );
    this.wake();
  }
  private pull(dt: number): boolean {
    this.attraction = { x: 0, y: 0 };
    if (!this.gravity || this.manualTravel || (this.previous && this.outward)) return false;
    const field = sampleField(this.items, this.target);
    if (!field || field.distance < 0.04) return false;
    this.attraction = attractionStep(field, dt / 1000);
    this.target.x += this.attraction.x;
    this.target.y += this.attraction.y;
    // La fuerza periférica débil requiere continuar la integración en los siguientes fotogramas.
    return field.distance > 0.04;
  }
  private wake(): void {
    if (!this.frame) this.frame = requestAnimationFrame((t) => this.tick(t));
  }
  private tick(time: number): void {
    this.frame = 0;
    const dt = this.lastFrame ? Math.min(34, time - this.lastFrame) : 16.67;
    this.lastFrame = time;
    let moving = false;
    if (this.flight) {
      const flight = this.flight;
      flight.started ??= time;
      const progress = clamp((time - flight.started) / flight.duration, 0, 1),
        eased = flightProgress(progress);
      for (const key of ['x', 'y', 'z'] as const)
        this.value[key] = flight.from[key] + (flight.to[key] - flight.from[key]) * eased;
      if (progress === 1) this.flight = null;
      else moving = true;
    } else {
      moving = this.pull(dt);
      const response = this.previous
        ? this.gravity
          ? gravityTuning.dragResponseMs
          : cameraTuning.dragResponseMs
        : cameraTuning.releaseResponseMs;
      const alpha = 1 - Math.exp(-dt / response);
      for (const key of ['x', 'y', 'z'] as const) {
        const difference = this.target[key] - this.value[key];
        if (Math.abs(difference) > (key === 'z' ? 0.0001 : 0.035)) {
          this.value[key] += difference * alpha;
          moving = true;
        } else this.value[key] = this.target[key];
      }
    }
    const settling = this.emit(dt);
    if (moving || settling) this.wake();
    else this.lastFrame = 0;
  }
  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.previous = null;
    this.flight = null;
  }
}
