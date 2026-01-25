import type { Vec2 } from "@course/lib";
import type { Asteroid } from "./Asteroid";

export type GameEvents = {
  'shot:player': { position: Vec2; angle: number };
  'shot:enemy': { position: Vec2; angle: number };
  'missile:thrust': { position: Vec2; angle: number };
  'missile:destroyed': { position: Vec2 };
  'asteroid:destroyed': { asteroid: Asteroid; scored?: boolean };
  'enemy:destroyed': { position: Vec2 };
  'boss:hit': { position: Vec2; healthRatio: number };
  'boss:destroyed': { position: Vec2 };
  'boss:deathBurst': { position: Vec2 };
  'boss:deathSmoke': { position: Vec2; alpha: number };
  'player:destroyed': { position: Vec2 };
};
