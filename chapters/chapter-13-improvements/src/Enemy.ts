import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";
import { Bullet } from "./Bullet";
import { CollisionLayer } from "./collisionLayers";

export class Enemy extends Entity implements CircleCollider {
  radius: number = 18;
  colliderType: "circle" = "circle";
  layer: number = CollisionLayer.Enemy;
  mask: number = CollisionLayer.Player | CollisionLayer.PlayerBullet;
  private sprite?: HTMLImageElement;
  private speed: number = 80;
  private angle: number = 0;
  private shootCooldown: number = 0;
  private fireInterval: number = 3.2;
  private getTarget: () => Vec2;
  private onShoot: (position: Vec2, angle: number) => void;
  private onDestroyed?: (position: Vec2) => void;
  private hasScored: boolean = false;

  constructor(
    position: Vec2,
    getTarget: () => Vec2,
    onShoot: (position: Vec2, angle: number) => void,
    sprite?: HTMLImageElement,
    onDestroyed?: (position: Vec2) => void
  ) {
    super(position);
    this.getTarget = getTarget;
    this.onShoot = onShoot;
    this.sprite = sprite;
    this.onDestroyed = onDestroyed;
  }

  update(deltaTime: number, screenSize: Vec2): void {
    const target = this.getTarget();
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    this.position.x += nx * this.speed * deltaTime;
    this.position.y += ny * this.speed * deltaTime;

    // Keep within world bounds
    this.position.x = Math.max(0, Math.min(this.position.x, screenSize.x));
    this.position.y = Math.max(0, Math.min(this.position.y, screenSize.y));

    this.angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    this.shootCooldown -= deltaTime;
    if (this.shootCooldown <= 0) {
      this.shootCooldown = this.fireInterval;
      this.onShoot({ x: this.position.x, y: this.position.y }, this.angle);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate((this.angle * Math.PI) / 180);
    if (this.sprite) {
      ctx.rotate(Math.PI / 2);
      const scale = (this.radius * 2.4) / this.sprite.width;
      const w = this.sprite.width * scale;
      const h = this.sprite.height * scale;
      ctx.drawImage(this.sprite, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  onCollision(other: Collidable): void {
    if (other instanceof Enemy) {
      return;
    }
    if (other instanceof Bullet) {
      if (!this.hasScored) {
        this.hasScored = true;
        this.onDestroyed?.({ x: this.position.x, y: this.position.y });
      }
      this.alive = false;
    }
  }
}