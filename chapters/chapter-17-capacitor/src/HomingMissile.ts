import { Entity, type Collidable, type BoxCollider, type Vec2 } from "@course/lib";
import { Player } from "./Player";
import { Bullet } from "./Bullet";
import { CollisionLayer } from "./collisionLayers";

export class HomingMissile extends Entity implements BoxCollider {
  width: number;
  height: number;
  colliderType: "box" = "box";
  layer: number = CollisionLayer.EnemyBullet;
  mask: number = CollisionLayer.Player | CollisionLayer.PlayerBullet;
  renderLayer: number = 10; // Render behind ships

  private velocity: Vec2;
  private speed: number;
  private turnRate: number;
  private sprite?: HTMLImageElement;
  private spriteRect?: { x: number; y: number; w: number; h: number };
  private renderSize: number;
  private getTarget: () => Vec2;
  private rotationOffsetDeg: number = -90;
  private lifeTime: number = 6;
  private onDestroyed?: (position: Vec2) => void;
  private onThrust?: (position: Vec2, angle: number) => void;

  constructor(
    position: Vec2,
    getTarget: () => Vec2,
    sprite?: HTMLImageElement,
    spriteRect?: { x: number; y: number; w: number; h: number },
    speed: number = 240,
    turnRate: number = 2.5,
    renderSize: number = 28,
    lifeTime: number = 6,
    onDestroyed?: (position: Vec2) => void,
    onThrust?: (position: Vec2, angle: number) => void
  ) {
    super(position);
    this.getTarget = getTarget;
    this.speed = speed;
    this.turnRate = turnRate;
    this.sprite = sprite;
    this.spriteRect = spriteRect;
    this.renderSize = renderSize;
    this.width = renderSize;
    this.height = renderSize;
    this.lifeTime = lifeTime;
    this.onDestroyed = onDestroyed;
    this.onThrust = onThrust;
    this.position = {
      x: position.x - this.width / 2,
      y: position.y - this.height / 2,
    };
    this.velocity = { x: speed, y: 0 };
  }

  update(deltaTime: number, screenSize: Vec2): void {
    this.lifeTime = Math.max(0, this.lifeTime - deltaTime);
    if (this.lifeTime === 0) {
      this.alive = false;
      return;
    }
    const target = this.getTarget();
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    const desired = { x: dx / dist, y: dy / dist };

    const currentLen = Math.hypot(this.velocity.x, this.velocity.y) || 1;
    const current = { x: this.velocity.x / currentLen, y: this.velocity.y / currentLen };

    const steer = {
      x: desired.x - current.x,
      y: desired.y - current.y,
    };

    const steerLen = Math.hypot(steer.x, steer.y) || 1;
    const steerNorm = { x: steer.x / steerLen, y: steer.y / steerLen };

    const turn = Math.min(1, this.turnRate * deltaTime);
    const newDir = {
      x: current.x + steerNorm.x * turn,
      y: current.y + steerNorm.y * turn,
    };
    const newLen = Math.hypot(newDir.x, newDir.y) || 1;
    const dir = { x: newDir.x / newLen, y: newDir.y / newLen };

    this.velocity.x = dir.x * this.speed;
    this.velocity.y = dir.y * this.speed;

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    if (
      this.position.x + this.width < -100 ||
      this.position.x > screenSize.x + 100 ||
      this.position.y + this.height < -100 ||
      this.position.y > screenSize.y + 100
    ) {
      this.alive = false;
    }

    if (this.onThrust) {
      const center = { x: this.position.x + this.width / 2, y: this.position.y + this.height / 2 };
      const angle = (Math.atan2(this.velocity.y, this.velocity.x) * 180) / Math.PI + 180;
      this.onThrust(center, angle);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const centerX = this.position.x + this.width / 2;
    const centerY = this.position.y + this.height / 2;
    ctx.translate(centerX, centerY);
    const angle = Math.atan2(this.velocity.y, this.velocity.x);
    ctx.rotate(angle + (this.rotationOffsetDeg * Math.PI) / 180);

    if (this.sprite && this.spriteRect) {
      const sourceW = this.spriteRect.w;
      const sourceH = this.spriteRect.h;
      const scale = this.renderSize / sourceW;
      const w = sourceW * scale;
      const h = sourceH * scale;
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
      ctx.fillStyle = "#ff9f0a";
      ctx.beginPath();
      const r = this.width / 2;
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  onCollision(other: Collidable): void {
    if (other instanceof Player) {
      if (other.isShieldActive()) {
        this.alive = false;
        this.onDestroyed?.({ x: this.position.x + this.width / 2, y: this.position.y + this.height / 2 });
        return;
      }
      other.alive = false;
      this.alive = false;
      this.onDestroyed?.({ x: this.position.x + this.width / 2, y: this.position.y + this.height / 2 });
    }
    if (other instanceof Bullet) {
      this.alive = false;
      this.onDestroyed?.({ x: this.position.x + this.width / 2, y: this.position.y + this.height / 2 });
    }
  }
}
