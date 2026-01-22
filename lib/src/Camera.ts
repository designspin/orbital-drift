import { Vec2 } from "./types/vec2";

export class Camera {
  position: Vec2 = { x: 0, y: 0 };
  zoom: number = 1;

  setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  move(dx: number, dy: number): void {
    this.position.x += dx;
    this.position.y += dy;
  }

  follow(target: Vec2, screenSize: Vec2, worldSize: Vec2): void {
    const halfW = (screenSize.x / 2) / this.zoom;
    const halfH = (screenSize.y / 2) / this.zoom;

    let x = target.x - halfW;
    let y = target.y - halfH;

    x = Math.max(0, Math.min(x, worldSize.x - screenSize.x / this.zoom));
    y = Math.max(0, Math.min(y, worldSize.y - screenSize.y / this.zoom));

    this.position.x = x;
    this.position.y = y;
  }

  apply(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.position.x, -this.position.y);
  }

  unapply(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }
}