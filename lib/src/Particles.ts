import { Entity } from "./Entity";
import type { Vec2 } from "./types/vec2";

type Range = number | { min: number; max: number };

type ColorSpec =
  | string
  | { start: string; end: string }
  | ((t: number) => string);

export type ParticleShape = "circle" | "square" | "triangle" | "line" | "sprite";
export type SpawnShape = "point" | "circle" | "rect";

export type ParticleOptions = {
  position: Vec2;
  count?: number;
  life?: Range;
  speed?: Range;
  angle?: Range; // degrees
  size?: Range;
  sizeEnd?: Range;
  opacity?: Range;
  opacityEnd?: Range;
  color?: ColorSpec;
  rotation?: Range;
  angularVelocity?: Range;
  gravity?: Vec2;
  drag?: number; // 0..1
  shape?: ParticleShape;
  sprite?: HTMLImageElement;
  blendMode?: GlobalCompositeOperation;
  spawnShape?: SpawnShape;
  spawnRadius?: number;
  spawnWidth?: number;
  spawnHeight?: number;
};

export type ParticleEmitterOptions = ParticleOptions & {
  rate: number; // particles per second
  duration?: number; // seconds
  follow?: () => Vec2;
};

type Particle = {
  position: Vec2;
  velocity: Vec2;
  age: number;
  life: number;
  size: number;
  sizeEnd: number;
  opacity: number;
  opacityEnd: number;
  rotation: number;
  angularVelocity: number;
  color: ColorSpec;
  shape: ParticleShape;
  sprite?: HTMLImageElement;
  blendMode?: GlobalCompositeOperation;
  gravity: Vec2;
  drag: number;
};

const randRange = (range: Range | undefined, fallback: number): number => {
  if (range === undefined) return fallback;
  if (typeof range === "number") return range;
  return range.min + Math.random() * (range.max - range.min);
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const parseHex = (color: string): [number, number, number, number] | null => {
  if (!color.startsWith("#")) return null;
  const hex = color.slice(1);
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return [r, g, b, 1];
  }
  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
  return null;
};

const lerpColor = (start: string, end: string, t: number): string => {
  const a = parseHex(start);
  const b = parseHex(end);
  if (!a || !b) return start;
  const r = Math.round(lerp(a[0], b[0], t));
  const g = Math.round(lerp(a[1], b[1], t));
  const bch = Math.round(lerp(a[2], b[2], t));
  const alpha = lerp(a[3], b[3], t);
  return `rgba(${r}, ${g}, ${bch}, ${alpha})`;
};

const resolveColor = (spec: ColorSpec, t: number): string => {
  if (typeof spec === "function") return spec(t);
  if (typeof spec === "string") return spec;
  return lerpColor(spec.start, spec.end, t);
};

export class ParticleSystem extends Entity {
  private particles: Particle[] = [];

  clear(): void {
    this.particles = [];
  }

  emit(options: ParticleOptions): void {
    const count = options.count ?? 1;
    const shape = options.shape ?? "circle";
    const gravity = options.gravity ?? { x: 0, y: 0 };
    const drag = clamp(options.drag ?? 0, 0, 1);

    for (let i = 0; i < count; i++) {
      const spawn = this.getSpawnPosition(options);
      const angle = randRange(options.angle, 0) * (Math.PI / 180);
      const speed = randRange(options.speed, 0);
      const life = Math.max(0.01, randRange(options.life, 0.6));
      const size = Math.max(0.1, randRange(options.size, 4));
      const sizeEnd = Math.max(0, randRange(options.sizeEnd, size));
      const opacity = clamp(randRange(options.opacity, 1), 0, 1);
      const opacityEnd = clamp(randRange(options.opacityEnd, 0), 0, 1);
      const rotation = randRange(options.rotation, 0);
      const angularVelocity = randRange(options.angularVelocity, 0);

      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      };

      this.particles.push({
        position: spawn,
        velocity,
        age: 0,
        life,
        size,
        sizeEnd,
        opacity,
        opacityEnd,
        rotation,
        angularVelocity,
        color: options.color ?? "#ffffff",
        shape,
        sprite: options.sprite,
        blendMode: options.blendMode,
        gravity,
        drag,
      });
    }
  }

  update(deltaTime: number): void {
    for (const p of this.particles) {
      p.age += deltaTime;
      if (p.age >= p.life) {
        p.opacity = 0;
        continue;
      }

      p.velocity.x += p.gravity.x * deltaTime;
      p.velocity.y += p.gravity.y * deltaTime;
      p.velocity.x *= 1 - p.drag;
      p.velocity.y *= 1 - p.drag;
      p.position.x += p.velocity.x * deltaTime;
      p.position.y += p.velocity.y * deltaTime;
      p.rotation += p.angularVelocity * deltaTime;
    }

    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const t = clamp(p.age / p.life, 0, 1);
      const size = lerp(p.size, p.sizeEnd, t);
      const alpha = lerp(p.opacity, p.opacityEnd, t);
      if (alpha <= 0 || size <= 0) continue;

      ctx.save();
      if (p.blendMode) {
        ctx.globalCompositeOperation = p.blendMode;
      }
      ctx.globalAlpha = alpha;
      ctx.translate(p.position.x, p.position.y);
      ctx.rotate(p.rotation);

      const color = resolveColor(p.color, t);
      if (p.shape === "sprite" && p.sprite) {
        const w = size * 2;
        const h = size * 2;
        ctx.drawImage(p.sprite, -w / 2, -h / 2, w, h);
      } else if (p.shape === "square") {
        ctx.fillStyle = color;
        ctx.fillRect(-size / 2, -size / 2, size, size);
      } else if (p.shape === "triangle") {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size, size);
        ctx.lineTo(-size, size);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === "line") {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, size * 0.35);
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private getSpawnPosition(options: ParticleOptions): Vec2 {
    const spawnShape = options.spawnShape ?? "point";
    const base = options.position;
    if (spawnShape === "circle") {
      const r = options.spawnRadius ?? 4;
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r;
      return { x: base.x + Math.cos(a) * d, y: base.y + Math.sin(a) * d };
    }
    if (spawnShape === "rect") {
      const w = options.spawnWidth ?? 8;
      const h = options.spawnHeight ?? 8;
      return {
        x: base.x + (Math.random() - 0.5) * w,
        y: base.y + (Math.random() - 0.5) * h,
      };
    }
    return { x: base.x, y: base.y };
  }
}

export class ParticleEmitter extends Entity {
  private system: ParticleSystem;
  private options: ParticleEmitterOptions;
  private timeSinceEmit = 0;
  private remaining: number | null;

  constructor(system: ParticleSystem, options: ParticleEmitterOptions) {
    super(options.position ?? { x: 0, y: 0 });
    this.system = system;
    this.options = options;
    this.remaining = options.duration ?? null;
  }

  update(deltaTime: number): void {
    if (this.remaining !== null) {
      this.remaining -= deltaTime;
      if (this.remaining <= 0) {
        this.alive = false;
        return;
      }
    }

    const rate = Math.max(0, this.options.rate);
    if (rate === 0) return;

    const interval = 1 / rate;
    this.timeSinceEmit += deltaTime;

    while (this.timeSinceEmit >= interval) {
      this.timeSinceEmit -= interval;
      const position = this.options.follow ? this.options.follow() : this.options.position;
      this.system.emit({ ...this.options, position, count: 1 });
    }
  }

  render(): void {}
}
