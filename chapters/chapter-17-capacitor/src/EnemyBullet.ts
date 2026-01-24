import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";
import { Player } from "./Player";
import { Asteroid } from "./Asteroid";
import { CollisionLayer } from "./collisionLayers";

export class EnemyBullet extends Entity implements CircleCollider {
  radius: number = 3;
  colliderType: "circle" = "circle";
  layer: number = CollisionLayer.EnemyBullet;
  mask: number = CollisionLayer.Player | CollisionLayer.Asteroid;
  renderLayer: number = 10; // Render behind ships
  private velocity: Vec2;
  private sprite?: HTMLImageElement;
  private spriteRect?: { x: number; y: number; w: number; h: number };
  private renderSize: number;
  private scalePhase: number = 0;
  private scaleSpeed: number = 4;
  private scaleAmount: number = 0.15;

  constructor(
    position: Vec2,
    angle: number,
    speed: number = 260,
    sprite?: HTMLImageElement,
    spriteRect?: { x: number; y: number; w: number; h: number },
    renderSize: number = 18
  ) {
    super(position);
    const rad = (angle * Math.PI) / 180;
    this.velocity = {
      x: Math.cos(rad) * speed,
      y: Math.sin(rad) * speed,
    };
    this.sprite = sprite;
    this.spriteRect = spriteRect;
    this.renderSize = renderSize;
  }

  update(deltaTime: number, screenSize: Vec2): void {
    this.scalePhase += deltaTime * this.scaleSpeed;
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    if (
      this.position.x < 0 ||
      this.position.x > screenSize.x ||
      this.position.y < 0 ||
      this.position.y > screenSize.y
    ) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    const angle = Math.atan2(this.velocity.y, this.velocity.x);
    ctx.rotate(angle);
    const scale = 1 + Math.sin(this.scalePhase) * this.scaleAmount;
    ctx.scale(scale, scale);
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
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ff3b30";
      ctx.fill();
    }
    ctx.restore();
  }

  onCollision(other: Collidable): void {
    if (other instanceof Player) {
      if (other.isShieldActive()) {
        this.alive = false;
        return;
      }
      other.alive = false;
      this.alive = false;
    }
    if (other instanceof Asteroid) {
      this.alive = false;
    }
  }
}