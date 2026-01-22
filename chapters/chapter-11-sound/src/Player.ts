import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";
import { PlayerController } from "./PlayerController";
import { Asteroid } from "./Asteroid";
import { Enemy } from "./Enemy";

export class Player extends Entity implements CircleCollider {
  radius: number = 15;
  colliderType: "circle" = "circle";
  private angle: number = 0;
  private velocity: Vec2 = { x: 0, y: 0 };
  private thrust: number = 0;
  private friction: number = 0.98;
  private sprite?: HTMLImageElement;
  private shieldActive: boolean = false;
  private get controller(): PlayerController {
    return this._controller;
  }
  private _controller: PlayerController;

  constructor(position: Vec2, controller: PlayerController, sprite?: HTMLImageElement) {
    super(position);
    this._controller = controller;
    this.sprite = sprite;
  }

  setShieldActive(active: boolean): void {
    this.shieldActive = active;
  }

  isShieldActive(): boolean {
    return this.shieldActive;
  }

  update(deltaTime: number, screenSize: Vec2): void {
    // Rotate player
    this.angle += this.controller.getRotation() * 180 * deltaTime;

    // Thrust
    if (this.controller.isThrusting()) {
      this.thrust = 200;
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

    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Wrap around screen
    const canvasWidth = screenSize.x;
    const canvasHeight = screenSize.y;
    if (this.position.x < 0) this.position.x += canvasWidth;
    if (this.position.x > canvasWidth) this.position.x -= canvasWidth;
    if (this.position.y < 0) this.position.y += canvasHeight;
    if (this.position.y > canvasHeight) this.position.y -= canvasHeight;
  }

  render(ctx: CanvasRenderingContext2D): void {
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
      const scale = (this.radius * 2.4) / this.sprite.width;
      const w = this.sprite.width * scale;
      const h = this.sprite.height * scale;
      ctx.drawImage(this.sprite, -w / 2, -h / 2, w, h);
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

  onCollision(_: Collidable): void {
    if (this.shieldActive && _ instanceof Enemy) {
      _.alive = false;
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