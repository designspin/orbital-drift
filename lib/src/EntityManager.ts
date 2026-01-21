import { iEntity } from "./Entity";
import { Vec2 } from "./types/vec2";

export class EntityManager {
  private entities: iEntity[] = [];

  add(entity: iEntity): void {
    this.entities.push(entity);
  }

  remove(entity: iEntity): void {
    this.entities = this.entities.filter((e) => e !== entity);
  }

  update(deltaTime: number, screenSize: Vec2): void {
    for (const entity of this.entities) {
      entity.update(deltaTime, screenSize);
    }
    this.entities = this.entities.filter((e) => e.alive);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const entity of this.entities) {
      entity.render(ctx);
    }
  }

  clear(): void {
    this.entities = [];
  }
}