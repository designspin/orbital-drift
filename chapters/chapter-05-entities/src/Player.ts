import { Entity,type Vec2 } from '@course/lib';
import { PlayerController } from './PlayerController';

export class Player extends Entity {
  
  private angle: number = 0;
  private velocity: Vec2 = { x: 0, y: 0 };
  private thrust: number = 0;
  private friction: number = 0.98;
  private controller: PlayerController;
  private screenSize: Vec2;

  constructor(
    position: Vec2, 
    controller: PlayerController,
    screenSize: Vec2 = { x: 800, y: 600 }
  ) {
      super(position);
      this.controller = controller;
      this.screenSize = screenSize;
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
      this.velocity.x += Math.cos((this.angle * Math.PI) / 180) * this.thrust * deltaTime;
      this.velocity.y += Math.sin((this.angle * Math.PI) / 180) * this.thrust * deltaTime;
      this.velocity.x *= this.friction;
      this.velocity.y *= this.friction;

      // Update position
      this.position.x += this.velocity.x * deltaTime;
      this.position.y += this.velocity.y * deltaTime;

      // Wrap around screen
      const canvasWidth = screenSize.x; // Assume fixed canvas size for now
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
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-15, -10);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-15, 10);
      ctx.closePath();
      ctx.fillStyle = '#b300ff';
      ctx.fill();
      ctx.restore();
  } 
  
}