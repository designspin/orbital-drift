import type { Vec2 } from "./types/vec2";

interface BaseCollider {
  position: Vec2;
  onCollision(other: Collidable): void;
  layer?: number;
  mask?: number;
}

export interface CircleCollider extends BaseCollider {
  radius: number;
  colliderType: "circle";
}

export interface BoxCollider extends BaseCollider {
  width: number;
  height: number;
  colliderType: "box";
}

export type Collidable = CircleCollider | BoxCollider;