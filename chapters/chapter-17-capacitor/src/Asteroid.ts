import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";
import { Bullet } from "./Bullet";
import { EnemyBullet } from "./EnemyBullet";
import { CollisionLayer } from "./collisionLayers";
import { random, randomRange } from "./random";

export type AsteroidSize = "XL" | "L" | "M" | "S";

const ASTEROID_RADII: Record<AsteroidSize, number> = {
  XL: 48,
  L: 32,
  M: 22,
  S: 14,
};

const NEXT_SIZE: Record<AsteroidSize, AsteroidSize | null> = {
  XL: "L",
  L: "M",
  M: "S",
  S: null,
};

const SCORE_VALUES: Record<AsteroidSize, number> = {
  XL: 20,
  L: 50,
  M: 100,
  S: 200,
};

export class Asteroid extends Entity implements CircleCollider {
  radius: number;
  colliderType: "circle" = "circle";
  layer: number = CollisionLayer.Asteroid;
  mask: number = CollisionLayer.Player | CollisionLayer.PlayerBullet | CollisionLayer.EnemyBullet | CollisionLayer.Asteroid;
  size: AsteroidSize;
  private angle: number;
  private rotationSpeed: number;
  private velocity: Vec2;
  private shapePoints: Array<{ angle: number; scale: number }>;
  private shouldSplit: boolean = false;
  private hasSplit: boolean = false;
  private onDestroyed?: (asteroid: Asteroid) => void;
  private hasScored: boolean = false;
  private sprite?: HTMLImageElement;
  private spriteRect?: { x: number; y: number; w: number; h: number };
  private rectsBySize?: Record<AsteroidSize, Array<{ x: number; y: number; w: number; h: number }>>;
  private explosionStartColor: string = "#ffffff";
  private explosionEndColor: string = "#ff9a7a";

  constructor(
    position: Vec2,
    size: AsteroidSize = "L",
    onDestroyed?: (asteroid: Asteroid) => void,
    sprite?: HTMLImageElement,
    rectsBySize?: Record<AsteroidSize, Array<{ x: number; y: number; w: number; h: number }>>
  ) {
    super(position);
    this.size = size;
    this.radius = ASTEROID_RADII[size];
    this.onDestroyed = onDestroyed;
    this.sprite = sprite;
    this.rectsBySize = rectsBySize;
    if (this.sprite && this.rectsBySize) {
      const list = this.rectsBySize[this.size];
      if (list && list.length > 0) {
        this.spriteRect = list[Math.floor(random() * list.length)];
        const avg = this.sampleSpriteColor();
        if (avg) {
          const [r, g, b] = avg;
          this.explosionStartColor = `rgb(${r}, ${g}, ${b})`;
          const end = this.blendColor([r, g, b], [255, 120, 90], 0.55);
          this.explosionEndColor = `rgb(${end[0]}, ${end[1]}, ${end[2]})`;
        }
      }
    }
    this.angle = randomRange(0, 360);
    this.rotationSpeed = (random() - 0.5) * 90; // degrees per second
    const speed = 50 + random() * 100;
    const direction = random() * Math.PI * 2;
    this.velocity = {
      x: Math.cos(direction) * speed,
      y: Math.sin(direction) * speed,
    };

    const points = 8;
    this.shapePoints = Array.from({ length: points }, (_, i) => ({
      angle: (i * Math.PI * 2) / points,
      scale: 0.75 + random() * 0.5,
    }));
  }

  update(deltaTime: number, screenSize: Vec2): void {
    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Keep within world bounds (no wrap for camera demo)
    const maxX = screenSize.x;
    const maxY = screenSize.y;
    if (this.position.x < 0 || this.position.x > maxX) {
      this.velocity.x *= -1;
      this.position.x = Math.max(0, Math.min(this.position.x, maxX));
    }
    if (this.position.y < 0 || this.position.y > maxY) {
      this.velocity.y *= -1;
      this.position.y = Math.max(0, Math.min(this.position.y, maxY));
    }

    // Update rotation
    this.angle += this.rotationSpeed * deltaTime;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const r = this.radius;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate((this.angle * Math.PI) / 180);
    if (this.sprite && this.spriteRect) {
      const scale = (r * 2.2) / this.spriteRect.w;
      const w = this.spriteRect.w * scale;
      const h = this.spriteRect.h * scale;
      ctx.drawImage(
        this.sprite,
        this.spriteRect.x,
        this.spriteRect.y,
        this.spriteRect.w,
        this.spriteRect.h,
        -w / 2,
        -h / 2,
        w,
        h
      );
    } else {
      ctx.beginPath();
      const first = this.shapePoints[0];
      ctx.moveTo(
        Math.cos(first.angle) * r * first.scale,
        Math.sin(first.angle) * r * first.scale
      );
      for (let i = 1; i < this.shapePoints.length; i++) {
        const p = this.shapePoints[i];
        ctx.lineTo(Math.cos(p.angle) * r * p.scale, Math.sin(p.angle) * r * p.scale);
      }
      ctx.closePath();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  setVelocity(velocity: Vec2): void {
    this.velocity = velocity;
  }

  getVelocity(): Vec2 {
    return { x: this.velocity.x, y: this.velocity.y };
  }

  setPosition(position: Vec2): void {
    this.position = position;
  }

  split(): Asteroid[] {
    if (!this.shouldSplit || this.hasSplit) return [];
    this.hasSplit = true;
    const next = NEXT_SIZE[this.size];
    if (!next) return [];

    const offset = this.radius * 0.8;
    const angle = random() * Math.PI * 2;
    const dx = Math.cos(angle) * offset;
    const dy = Math.sin(angle) * offset;

    const a = new Asteroid(
      { x: this.position.x + dx, y: this.position.y + dy },
      next,
      this.onDestroyed,
      this.sprite,
      this.rectsBySize
    );
    const b = new Asteroid(
      { x: this.position.x - dx, y: this.position.y - dy },
      next,
      this.onDestroyed,
      this.sprite,
      this.rectsBySize
    );

    a.setVelocity({ x: this.velocity.x + dx * 2, y: this.velocity.y + dy * 2 });
    b.setVelocity({ x: this.velocity.x - dx * 2, y: this.velocity.y - dy * 2 });

    return [a, b];
  }

  getScoreValue(): number {
    return SCORE_VALUES[this.size];
  }

  getExplosionColors(): { start: string; end: string } {
    return { start: this.explosionStartColor, end: this.explosionEndColor };
  }

  onCollision(other: Collidable): void {
    if (other instanceof Bullet) {
      if (!this.hasScored) {
        this.hasScored = true;
        this.onDestroyed?.(this);
      }
      this.shouldSplit = true;
      this.alive = false;
      return;
    }

    if (other instanceof EnemyBullet) {
      this.shouldSplit = true;
      this.alive = false;
      return;
    }

    if (other instanceof Asteroid) {
      Asteroid.resolveCollision(this, other);
    }
  }

  private static resolveCollision(a: Asteroid, b: Asteroid): void {
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    // Separate overlapping asteroids
    const overlap = a.radius + b.radius - dist;
    if (overlap > 0) {
      const push = overlap / 2;
      a.position.x -= nx * push;
      a.position.y -= ny * push;
      b.position.x += nx * push;
      b.position.y += ny * push;
    }

    // Relative velocity along normal
    const rvx = b.velocity.x - a.velocity.x;
    const rvy = b.velocity.y - a.velocity.y;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) return;

    const restitution = 0.9; // slight damping
    const impulse = (-(1 + restitution) * velAlongNormal) / 2; // equal mass

    const ix = impulse * nx;
    const iy = impulse * ny;

    a.velocity.x -= ix;
    a.velocity.y -= iy;
    b.velocity.x += ix;
    b.velocity.y += iy;
  }

  private sampleSpriteColor(): [number, number, number] | undefined {
    if (!this.sprite || !this.spriteRect) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = this.spriteRect.w;
    canvas.height = this.spriteRect.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(
      this.sprite,
      this.spriteRect.x,
      this.spriteRect.y,
      this.spriteRect.w,
      this.spriteRect.h,
      0,
      0,
      this.spriteRect.w,
      this.spriteRect.h
    );
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 10) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
    if (count === 0) return undefined;
    return [
      Math.round(r / count),
      Math.round(g / count),
      Math.round(b / count),
    ];
  }

  private blendColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);
    return [lerp(a[0], b[0]), lerp(a[1], b[1]), lerp(a[2], b[2])];
  }
}