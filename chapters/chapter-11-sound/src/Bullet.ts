import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";

export class Bullet extends Entity implements CircleCollider {
  radius: number = 2;
  colliderType: "circle" = "circle";
  private velocity: Vec2;

  constructor(position: Vec2, angle: number, speed: number = 400) {
    super(position);
    const rad = (angle * Math.PI) / 180;
    this.velocity = {
      x: Math.cos(rad) * speed,
      y: Math.sin(rad) * speed,
    };
  }

  update(deltaTime: number, screenSize: Vec2): void {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Remove bullet if it goes off-screen
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
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffff00";
    ctx.fill();
    ctx.restore();
  }

  onCollision(_: Collidable): void {
    this.alive = false;
  }
}