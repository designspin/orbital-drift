import type { Asteroid } from "../Asteroid";
import type { System } from "@course/lib";

export class ScoreSystem implements System {
  private score = 0;
  private getWave: () => number;

  constructor(getWave: () => number) {
    this.getWave = getWave;
  }

  reset(): void {
    this.score = 0;
  }

  update(): void {}

  getScore(): number {
    return this.score;
  }

  onAsteroidDestroyed(asteroid: Asteroid): void {
    this.score += asteroid.getScoreValue();
  }

  onEnemyDestroyed(): void {
    this.score += 10 * this.getWave();
  }
}
