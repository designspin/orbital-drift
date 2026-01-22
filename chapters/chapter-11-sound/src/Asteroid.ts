import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";
import { Bullet } from "./Bullet";

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
  size: AsteroidSize;
  private angle: number;
  private rotationSpeed: number;
  private velocity: Vec2;
  private shapePoints: Array<{ angle: number; scale: number }>;
  private shouldSplit: boolean = false;
  private hasSplit: boolean = false;
  private onDestroyed?: (asteroid: Asteroid) => void;
  private hasScored: boolean = false;

  constructor(
    position: Vec2,
    size: AsteroidSize = "L",
    onDestroyed?: (asteroid: Asteroid) => void
  ) {
    super(position);
    this.size = size;
    this.radius = ASTEROID_RADII[size];
    this.onDestroyed = onDestroyed;
    this.angle = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 90; // degrees per second
    const speed = 50 + Math.random() * 100;
    const direction = Math.random() * Math.PI * 2;
    this.velocity = {
      x: Math.cos(direction) * speed,
      y: Math.sin(direction) * speed,
    };

    const points = 8;
    this.shapePoints = Array.from({ length: points }, (_, i) => ({
      angle: (i * Math.PI * 2) / points,
      scale: 0.75 + Math.random() * 0.5,
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
    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle) * offset;
    const dy = Math.sin(angle) * offset;

    const a = new Asteroid(
      { x: this.position.x + dx, y: this.position.y + dy },
      next,
      this.onDestroyed
    );
    const b = new Asteroid(
      { x: this.position.x - dx, y: this.position.y - dy },
      next,
      this.onDestroyed
    );

    a.setVelocity({ x: this.velocity.x + dx * 2, y: this.velocity.y + dy * 2 });
    b.setVelocity({ x: this.velocity.x - dx * 2, y: this.velocity.y - dy * 2 });

    return [a, b];
  }

  getScoreValue(): number {
    return SCORE_VALUES[this.size];
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
}