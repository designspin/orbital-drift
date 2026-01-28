import type { Vec2 } from '@course/lib';
import { random } from './random';

export type EnemySpawnPlan = {
  kind: 'single' | 'sine';
  x: number;
  y: number;
  typeIndex?: number;
};

export type AsteroidSpawnPlan = {
  x: number;
  y: number;
};

export type SpawnContext = {
  worldSize: Vec2;
  getPlayerPosition: () => Vec2;
  getEnemies: () => Array<{ position: Vec2 }>;
  getAsteroids: () => Array<{ position: Vec2 }>;
  getBoss?: () => { position: Vec2; radius: number } | undefined;
};

export class SpawnManager {
  private enemySpawnPlan: EnemySpawnPlan[] = [];
  private enemySpawnPlanIndex = 0;
  private asteroidSpawnPlan: AsteroidSpawnPlan[] = [];
  private asteroidSpawnPlanIndex = 0;
  private context: SpawnContext;

  constructor(context: SpawnContext) {
    this.context = context;
  }

  buildEnemySpawnPlan(enemyCount: number, minSpawnDistance: number): void {
    this.enemySpawnPlan = [];
    this.enemySpawnPlanIndex = 0;

    for (let i = 0; i < enemyCount; i += 1) {
      const spawn = this.getPlannedSpawnPosition(120, minSpawnDistance);
      this.enemySpawnPlan.push({ kind: 'single', x: spawn.x, y: spawn.y, typeIndex: 0 });
    }
  }

  buildAsteroidSpawnPlan(asteroidCount: number): void {
    this.asteroidSpawnPlan = [];
    this.asteroidSpawnPlanIndex = 0;
    for (let i = 0; i < asteroidCount; i += 1) {
      const spawn = this.getPlannedSpawnPosition(160, 240);
      this.asteroidSpawnPlan.push(spawn);
    }
  }

  getNextEnemySpawnPosition(minSpawnDistance: number): Vec2 {
    const plan = this.enemySpawnPlan[this.enemySpawnPlanIndex++];
    return plan ? { x: plan.x, y: plan.y } : this.getPlannedSpawnPosition(120, minSpawnDistance);
  }

  getNextAsteroidSpawnPosition(): Vec2 {
    const plan = this.asteroidSpawnPlan[this.asteroidSpawnPlanIndex++];
    return plan ? { x: plan.x, y: plan.y } : this.getPlannedSpawnPosition(160, 240);
  }

  getPlannedSpawnPosition(margin: number, minDistance: number): Vec2 {
    const { worldSize } = this.context;
    const playerPos = this.context.getPlayerPosition();

    let x = margin + random() * (worldSize.x - margin * 2);
    let y = margin + random() * (worldSize.y - margin * 2);

    for (let i = 0; i < 10; i++) {
      x = margin + random() * (worldSize.x - margin * 2);
      y = margin + random() * (worldSize.y - margin * 2);
      const dx = x - playerPos.x;
      const dy = y - playerPos.y;
      if (Math.hypot(dx, dy) >= minDistance) {
        break;
      }
    }
    return { x, y };
  }

  getSafeSpawnPosition(): Vec2 {
    const { worldSize } = this.context;
    const enemies = this.context.getEnemies();
    const asteroids = this.context.getAsteroids();
    const boss = this.context.getBoss?.();

    const margin = 200;
    // Boss requires much larger safe distance
    const bossMinDistance = boss ? boss.radius + 350 : 0;
    let best: Vec2 = { x: worldSize.x / 2, y: worldSize.y / 2 };
    let bestScore = -Infinity;

    for (let i = 0; i < 30; i++) {
      const x = margin + random() * (worldSize.x - margin * 2);
      const y = margin + random() * (worldSize.y - margin * 2);
      const safeFromEnemies = enemies.every((e) => Math.hypot(e.position.x - x, e.position.y - y) > 260);
      const safeFromAsteroids = asteroids.every((a) => Math.hypot(a.position.x - x, a.position.y - y) > 220);

      // Check boss distance
      let bossDistance = Infinity;
      if (boss) {
        bossDistance = Math.hypot(boss.position.x - x, boss.position.y - y);
      }
      const safeFromBoss = !boss || bossDistance > bossMinDistance;

      if (safeFromEnemies && safeFromAsteroids && safeFromBoss) {
        return { x, y };
      }

      // Track best position based on distance from boss (prioritize far from boss)
      const score = bossDistance;
      if (score > bestScore && safeFromEnemies && safeFromAsteroids) {
        bestScore = score;
        best = { x, y };
      }
    }
    return best;
  }
}
