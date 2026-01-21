import { iEntity } from "./Entity";
import { Vec2 } from "./types/vec2";
import { Collidable, CircleCollider, BoxCollider } from "./Collision";

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
    this.handleCollisions();

    const spawned: iEntity[] = [];
    for (const entity of this.entities) {
      if (!entity.alive && "split" in entity && typeof (entity as any).split === "function") {
        spawned.push(...(entity as any).split());
      }
    }

    this.entities = this.entities.filter((e) => e.alive);
    this.entities.push(...spawned);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const entity of this.entities) {
      entity.render(ctx);
    }
  }

  clear(): void {
    this.entities = [];
  }

  private handleCollisions(): void {
    const collidables = this.entities.filter(
      (e): e is iEntity & Collidable =>
        'colliderType' in e
    );

    for (let i = 0; i < collidables.length; i++) {
      for (let j = i + 1; j < collidables.length; j++) {
        const a = collidables[i];
        const b = collidables[j];

        let collided = false;

        if(a.colliderType === "circle" && b.colliderType === "circle") {
          const dx = a.position.x - b.position.x;
          const dy = a.position.y - b.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < a.radius + b.radius) {
            collided = true;
          }
        }

        else if(a.colliderType === "box" && b.colliderType === "box") {
          if (
            a.position.x < b.position.x + b.width &&
            a.position.x + a.width > b.position.x &&
            a.position.y < b.position.y + b.height &&
            a.position.y + a.height > b.position.y
          ) {
            collided = true;
          }
        }

        else {
          let circle: CircleCollider, box: BoxCollider;
          if (a.colliderType === "circle") {
            circle = a;
            box = b as BoxCollider;
          } else {
            circle = b as CircleCollider;
            box = a;
          }

          const closestX = Math.max(
            box.position.x,
            Math.min(circle.position.x, box.position.x + box.width)
          );
          const closestY = Math.max(
            box.position.y,
            Math.min(circle.position.y, box.position.y + box.height)
          );

          const dx = circle.position.x - closestX;
          const dy = circle.position.y - closestY;
          if (dx * dx + dy * dy < circle.radius * circle.radius) {
            collided = true;
          }
        }

        if (collided) {
          a.onCollision(b);
          b.onCollision(a);
        }
      }
    }
  }
}