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
    // Enemies are harder than asteroids - reward accordingly
    this.score += 100 + 25 * this.getWave();
  }

  onMissileDestroyed(): void {
    // Missiles are fast and dangerous
    this.score += 50 + 15 * this.getWave();
  }

  onBossHit(): void {
    this.score += 10 * this.getWave();
  }

  onBossDestroyed(): void {
    this.score += 500 + 100 * this.getWave();
  }
}
