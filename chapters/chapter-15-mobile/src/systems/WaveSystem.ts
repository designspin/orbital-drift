import type { AsteroidSize } from "../Asteroid";
import type { System } from "@course/lib";

type WaveSystemOptions = {
  enemySpawnInterval: number;
  maxEnemyCap: number;
  waveTransitionDuration: number;
  getEnemyCount: () => number;
  getAsteroidCount: () => number;
  spawnEnemy: () => void;
  spawnAsteroid: (size: AsteroidSize) => void;
};

export class WaveSystem implements System {
  private wave = 1;
  private enemiesToSpawn = 0;
  private enemiesRemaining = 0;
  private asteroidsRemaining = 0;
  private spawnTimer = 0;
  private transitionTimer = 0;

  private enemySpawnInterval: number;
  private maxEnemyCap: number;
  private waveTransitionDuration: number;
  private getEnemyCount: () => number;
  private getAsteroidCount: () => number;
  private spawnEnemy: () => void;
  private spawnAsteroid: (size: AsteroidSize) => void;

  constructor(opts: WaveSystemOptions) {
    this.enemySpawnInterval = opts.enemySpawnInterval;
    this.maxEnemyCap = opts.maxEnemyCap;
    this.waveTransitionDuration = opts.waveTransitionDuration;
    this.getEnemyCount = opts.getEnemyCount;
    this.getAsteroidCount = opts.getAsteroidCount;
    this.spawnEnemy = opts.spawnEnemy;
    this.spawnAsteroid = opts.spawnAsteroid;
  }

  reset(): void {
    this.wave = 1;
    this.enemiesToSpawn = 0;
    this.enemiesRemaining = 0;
    this.asteroidsRemaining = 0;
    this.spawnTimer = 0;
    this.transitionTimer = 0;
    this.startWave(1);
  }

  update(deltaTime: number): void {
    if (this.transitionTimer > 0) {
      this.transitionTimer = Math.max(0, this.transitionTimer - deltaTime);
      return;
    }

    this.spawnTimer -= deltaTime;
    const maxEnemies = this.getWaveMaxEnemies();
    if (this.enemiesToSpawn > 0 && this.getEnemyCount() < maxEnemies && this.spawnTimer <= 0) {
      this.spawnTimer = this.enemySpawnInterval;
      this.enemiesToSpawn -= 1;
      this.spawnEnemy();
    }

    this.checkComplete();
  }

  onEnemyDestroyed(): void {
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
  }

  onAsteroidDestroyed(): void {
    this.asteroidsRemaining = Math.max(0, this.asteroidsRemaining - 1);
  }

  registerWaveAsteroid(): void {
    this.asteroidsRemaining += 1;
  }

  get isTransitioning(): boolean {
    return this.transitionTimer > 0;
  }

  get currentWave(): number {
    return this.wave;
  }

  pickAsteroidSize(): AsteroidSize {
    if (this.wave < 2) {
      return Math.random() < 0.5 ? 'L' : 'M';
    }
    if (this.wave < 4) {
      return Math.random() < 0.2 ? 'XL' : Math.random() < 0.5 ? 'L' : 'M';
    }
    const roll = Math.random();
    if (roll < 0.15) return 'XL';
    if (roll < 0.45) return 'L';
    if (roll < 0.75) return 'M';
    return 'S';
  }

  private startWave(wave: number): void {
    this.wave = wave;
    this.transitionTimer = this.waveTransitionDuration;
    this.spawnTimer = 0;

    const asteroidCount = 2 + Math.floor(wave / 2);
    this.asteroidsRemaining = 0;
    for (let i = 0; i < asteroidCount; i++) {
      this.spawnAsteroid(this.pickAsteroidSize());
    }

    this.enemiesToSpawn = 2 + wave;
    this.enemiesRemaining = this.enemiesToSpawn;
  }

  private checkComplete(): void {
    if (this.transitionTimer > 0) return;
    if (
      this.enemiesRemaining <= 0 &&
      this.asteroidsRemaining <= 0 &&
      this.getEnemyCount() === 0 &&
      this.getAsteroidCount() === 0
    ) {
      this.startWave(this.wave + 1);
    }
  }

  private getWaveMaxEnemies(): number {
    return Math.min(3 + Math.floor(this.wave / 2), this.maxEnemyCap);
  }
}
