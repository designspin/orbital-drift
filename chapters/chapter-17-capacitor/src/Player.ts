import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";
import { PlayerController } from "./PlayerController";
import { Asteroid } from "./Asteroid";
import { Enemy } from "./Enemy";
import { CollisionLayer } from "./collisionLayers";

export class Player extends Entity implements CircleCollider {
  radius: number = 15;
  colliderType: "circle" = "circle";
  layer: number = CollisionLayer.Player;
  mask: number = CollisionLayer.Enemy | CollisionLayer.EnemyBullet | CollisionLayer.Asteroid;
  private angle: number = 0;
  private velocity: Vec2 = { x: 0, y: 0 };
  private thrust: number = 0;
  private friction: number = 0.98;
  private maxSpeed: number = 900;
  private sprite?: HTMLImageElement;
  private spriteRect?: { x: number; y: number; w: number; h: number };
  private shieldActive: boolean = false;
  private invulnerableTimer: number = 0;
  private invulnerableDuration: number = 3.0; // 3 seconds of invulnerability after spawn
  private flashTimer: number = 0; // For flashing effect during invulnerability
  private get controller(): PlayerController {
    return this._controller;
  }
  private _controller: PlayerController;

  constructor(
    position: Vec2,
    controller: PlayerController,
    sprite?: HTMLImageElement,
    spriteRect?: { x: number; y: number; w: number; h: number }
  ) {
    super(position);
    this._controller = controller;
    this.sprite = sprite;
    this.spriteRect = spriteRect;
  }

  setShieldActive(active: boolean): void {
    this.shieldActive = active;
  }

  setInvulnerable(duration: number): void {
    this.invulnerableTimer = duration;
  }

  isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  isShieldActive(): boolean {
    return this.shieldActive;
  }

  isThrusting(): boolean {
    return this.controller.isThrusting();
  }

  update(deltaTime: number, screenSize: Vec2): void {
    // Update invulnerability timer
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - deltaTime);
      this.flashTimer += deltaTime * 10; // Fast flashing
    }

    // Rotate player
    this.angle += this.controller.getRotation() * 180 * deltaTime;

    // Thrust
    if (this.controller.isThrusting()) {
      this.thrust = 450;
    } else {
      this.thrust = 0;
    }

    // Update velocity
    this.velocity.x +=
      Math.cos((this.angle * Math.PI) / 180) * this.thrust * deltaTime;
    this.velocity.y +=
      Math.sin((this.angle * Math.PI) / 180) * this.thrust * deltaTime;
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;
    const speed = Math.hypot(this.velocity.x, this.velocity.y) || 1;
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
    }

    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Wrap around screen
    const canvasWidth = screenSize.x;
    const canvasHeight = screenSize.y;
    if (this.position.x < 0) {
      this.position.x = 0;
      this.velocity.x = 0;
    }
    if (this.position.x > canvasWidth) {
      this.position.x = canvasWidth;
      this.velocity.x = 0;
    }
    if (this.position.y < 0) {
      this.position.y = 0;
      this.velocity.y = 0;
    }
    if (this.position.y > canvasHeight) {
      this.position.y = canvasHeight;
      this.velocity.y = 0;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Flash effect during invulnerability (skip rendering every other frame)
    if (this.invulnerableTimer > 0) {
      const flash = Math.sin(this.flashTimer) > 0;
      if (!flash) {
        return; // Skip rendering to create flashing effect
      }
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    if (this.shieldActive) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.7, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(90, 200, 250, 0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.rotate((this.angle * Math.PI) / 180);
    if (this.sprite) {
      ctx.rotate(Math.PI / 2);
      const sourceW = this.spriteRect?.w ?? this.sprite.width;
      const sourceH = this.spriteRect?.h ?? this.sprite.height;
      const scale = (this.radius * 2.4) / sourceW;
      const w = sourceW * scale;
      const h = sourceH * scale;
      if (this.spriteRect) {
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
        ctx.drawImage(this.sprite, -w / 2, -h / 2, w, h);
      }
    } else {
      const r = this.radius;
      const s = r * 1.3;
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.6, -s * 0.6);
      ctx.lineTo(-s * 0.3, 0);
      ctx.lineTo(-s * 0.6, s * 0.6);
      ctx.closePath();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    ctx.restore();
  }

  getAngle(): number {
    return this.angle;
  }

  getSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.y);
  }

  getVelocity(): Vec2 {
    return { x: this.velocity.x, y: this.velocity.y };
  }

  onCollision(_: Collidable): void {
    if (this.shieldActive && _ instanceof Enemy) {
      _.destroy();
      return;
    }

    if (this.shieldActive && _ instanceof Asteroid) {
      const dx = _.position.x - this.position.x;
      const dy = _.position.y - this.position.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      const speed = Math.hypot(_.getVelocity().x, _.getVelocity().y) || 120;
      _.setVelocity({ x: nx * speed, y: ny * speed });
      _.position.x += nx * (_.radius + this.radius);
      _.position.y += ny * (_.radius + this.radius);
      return;
    }

    if (this.shieldActive) {
      return;
    }

    this.alive = false;
  }
}