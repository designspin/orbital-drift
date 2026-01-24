import type { AsteroidSize } from "../Asteroid";
import type { System } from "@course/lib";
import { random } from "../random";

type WaveSystemOptions = {
  seed: number;
  enemySpawnInterval: number;
  maxEnemyCap: number;
  waveTransitionDuration: number;
  getEnemyCount: () => number;
  getAsteroidCount: () => number;
  spawnEnemy: () => void;
  spawnAsteroid: (size: AsteroidSize) => void;
  spawnBoss?: (wave: number) => void;
  onWaveStart?: (wave: number, seed: number, asteroidCount?: number, enemyCount?: number) => void;
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
  private seedBase: number;
  private getEnemyCount: () => number;
  private getAsteroidCount: () => number;
  private spawnEnemy: () => void;
  private spawnAsteroid: (size: AsteroidSize) => void;
  private spawnBoss?: (wave: number) => void;
  private onWaveStart?: (wave: number, seed: number, asteroidCount?: number, enemyCount?: number) => void;
  private bossActive: boolean = false;

  constructor(opts: WaveSystemOptions) {
    this.seedBase = opts.seed >>> 0;
    this.enemySpawnInterval = opts.enemySpawnInterval;
    this.maxEnemyCap = opts.maxEnemyCap;
    this.waveTransitionDuration = opts.waveTransitionDuration;
    this.getEnemyCount = opts.getEnemyCount;
    this.getAsteroidCount = opts.getAsteroidCount;
    this.spawnEnemy = opts.spawnEnemy;
    this.spawnAsteroid = opts.spawnAsteroid;
    this.spawnBoss = opts.spawnBoss;
    this.onWaveStart = opts.onWaveStart;
  }

  reset(): void {
    this.wave = 1;
    this.enemiesToSpawn = 0;
    this.enemiesRemaining = 0;
    this.asteroidsRemaining = 0;
    this.spawnTimer = 0;
    this.transitionTimer = 0;
    this.bossActive = false;
    this.startWave(1);
  }

  update(deltaTime: number): void {
    if (this.transitionTimer > 0) {
      this.transitionTimer = Math.max(0, this.transitionTimer - deltaTime);
      return;
    }

    if (this.bossActive) {
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
      return random() < 0.5 ? 'L' : 'M';
    }
    if (this.wave < 4) {
      return random() < 0.2 ? 'XL' : random() < 0.5 ? 'L' : 'M';
    }
    const roll = random();
    if (roll < 0.15) return 'XL';
    if (roll < 0.45) return 'L';
    if (roll < 0.75) return 'M';
    return 'S';
  }

  private startWave(wave: number): void {
    this.wave = wave;
    this.transitionTimer = this.waveTransitionDuration;
    this.spawnTimer = 0;
    const waveSeed = (this.seedBase + wave * 10007) >>> 0;
    this.onWaveStart?.(wave, waveSeed);

    if (this.spawnBoss && wave % 5 === 0) {
      this.bossActive = true;
      this.enemiesToSpawn = 0;
      this.enemiesRemaining = 0;
      this.asteroidsRemaining = 0;
      this.spawnBoss(wave);
      return;
    }

    // Gentler progression
    const asteroidCount = 1 + Math.floor(wave / 3);
    this.asteroidsRemaining = 0;
    // Start with fewer enemies and scale more slowly
    this.enemiesToSpawn = Math.min(1 + Math.floor(wave * 0.75), 12);
    this.enemiesRemaining = this.enemiesToSpawn;

    this.onWaveStart?.(wave, waveSeed, asteroidCount, this.enemiesToSpawn);

    for (let i = 0; i < asteroidCount; i++) {
      this.spawnAsteroid(this.pickAsteroidSize());
    }
  }

  private checkComplete(): void {
    if (this.transitionTimer > 0) return;
    if (this.bossActive) return;
    if (
      this.enemiesRemaining <= 0 &&
      this.getEnemyCount() === 0
    ) {
      this.startWave(this.wave + 1);
    }
  }

  private getWaveMaxEnemies(): number {
    // Gentler max enemies on screen at once
    return Math.min(2 + Math.floor(this.wave / 3), this.maxEnemyCap);
  }

  onBossDefeated(): void {
    if (!this.bossActive) return;
    this.bossActive = false;
    this.startWave(this.wave + 1);
  }

  get isBossActive(): boolean {
    return this.bossActive;
  }

  setWaveForTesting(wave: number): void {
    const target = Math.max(1, Math.floor(wave));
    this.startWave(target);
  }
}
