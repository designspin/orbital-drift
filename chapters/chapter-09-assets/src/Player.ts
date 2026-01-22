import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";
import { PlayerController } from "./PlayerController";

export class Player extends Entity implements CircleCollider {
  radius: number = 15;
  colliderType: "circle" = "circle";
  private angle: number = 0;
  private velocity: Vec2 = { x: 0, y: 0 };
  private thrust: number = 0;
  private friction: number = 0.98;
  private sprite?: HTMLImageElement;
  private get controller(): PlayerController {
    return this._controller;
  }
  private _controller: PlayerController;

  constructor(position: Vec2, controller: PlayerController, sprite?: HTMLImageElement) {
    super(position);
    this._controller = controller;
    this.sprite = sprite;
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

  onCollision(_: Collidable): void {
    this.alive = false;
  }
}