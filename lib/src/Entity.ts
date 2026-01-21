import { Vec2 } from "./types/vec2";

export interface iEntity {
  position: Vec2;
  alive: boolean;
  update(deltaTime: number, screenSize?: Vec2): void;
  render(ctx: CanvasRenderingContext2D): void;
}

export abstract class Entity implements iEntity {
  position: Vec2;
  alive: boolean;

  constructor(position: Vec2 = { x: 0, y: 0 }, alive: boolean = true) {
    this.position = position;
    this.alive = alive;
  }

  abstract update(deltaTime: number, screenSize?: Vec2): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
}