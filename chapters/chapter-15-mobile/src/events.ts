import type { Vec2 } from "@course/lib";
import type { Asteroid } from "./Asteroid";

export type GameEvents = {
  'shot:player': { position: Vec2; angle: number };
  'shot:enemy': { position: Vec2; angle: number };
  'asteroid:destroyed': { asteroid: Asteroid };
  'enemy:destroyed': { position: Vec2 };
  'player:destroyed': { position: Vec2 };
};
