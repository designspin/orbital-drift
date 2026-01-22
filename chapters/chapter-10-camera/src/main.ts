import './style.css'
import { AssetManager, Camera, Engine, ShieldBar, StateMachine, UILayer, UIPanel, ScoreDisplay, TextDisplay } from '@course/lib';
import type { GameState, Vec2 } from '@course/lib';
import { Player } from './Player';
import { PlayerController } from './PlayerController';
import { Asteroid } from './Asteroid';
import { Bullet } from './Bullet';
import { ShipIndicators } from './ShipIndicators';
import { Enemy } from './Enemy';
import { EnemyBullet } from './EnemyBullet';

class CH10 extends Engine {
  private assets = new AssetManager();
  private camera = new Camera();
  private worldSize: Vec2 = { x: 2400, y: 1800 };
  private progress = 0;
  private shipSprite?: HTMLImageElement;
  private enemySprite?: HTMLImageElement;

  private score = 0;
  private lives = 3;
  private shieldEnergy = 1;
  private shieldActive = false;
  private shieldDrainRate = 0.35;
  private shieldRegenRate = 0.2;
  private shieldRegenDelay = 3;
  private shieldRegenCooldown = 0;
  private hudLayer = new UILayer('HUD');
  private pauseLayer = new UILayer('Pause');
  private player!: Player;
  private asteroids: Asteroid[] = [];
  private enemies: Enemy[] = [];
  private enemySpawnTimer = 0;
  private enemySpawnInterval = 2.5;
  private minEnemySpawnDistance = 300;
  private enemyKills = 0;
  private maxEnemyCap = 20;
  private respawnDelay = 2.5;
  private respawnTimer = 0;
  private stateMachine = new StateMachine<GameState>();

  protected override get screenSize(): Vec2 {
    return this.worldSize;
  }

  private get viewportSize(): Vec2 {
    return { x: this.ctx.canvas.width, y: this.ctx.canvas.height };
  }

  protected override onInit(): void {
    this.setUiUpdateInterval(100);
    this.setupUi();
    this.setupStates();
    this.stateMachine.set('loading');
  }

  protected override update(deltaTime: number): void {
    this.stateMachine.update(deltaTime);
  }

  protected override render(): void {
    this.stateMachine.render();
  }

  public updatePlaying(deltaTime: number): void {
    this.shieldActive = this.input.isDown('ArrowDown') && this.shieldEnergy > 0;

    if (this.input.wasPressed(' ')) {
      const angle = this.player.getAngle();
      const rad = (angle * Math.PI) / 180;
      const spawnOffset = this.player.radius * 1.2;
      const spawn = {
        x: this.player.position.x + Math.cos(rad) * spawnOffset,
        y: this.player.position.y + Math.sin(rad) * spawnOffset,
      };

      this.addEntity(new Bullet(spawn, angle));
    }

    super.update(deltaTime);

    if (this.shieldActive) {
      this.shieldEnergy = Math.max(0, this.shieldEnergy - this.shieldDrainRate * deltaTime);
      if (this.shieldEnergy === 0) {
        this.shieldRegenCooldown = this.shieldRegenDelay;
      }
    } else {
      if (this.shieldRegenCooldown > 0) {
        this.shieldRegenCooldown = Math.max(0, this.shieldRegenCooldown - deltaTime);
      } else {
        this.shieldEnergy = Math.min(1, this.shieldEnergy + this.shieldRegenRate * deltaTime);
      }
    }
    this.player.setShieldActive(this.shieldActive);

    if (!this.player.alive && this.lives > 0) {
      this.lives -= 1;
      if (this.lives > 0) {
        this.respawnTimer = this.respawnDelay;
        this.stateMachine.set('respawn');
        return;
      }
    }

    const spawned: Asteroid[] = [];
    this.asteroids = this.asteroids.filter((asteroid) => {
      if (!asteroid.alive) {
        spawned.push(...asteroid.split());
        return false;
      }
      return true;
    });

    for (const child of spawned) {
      this.addAsteroid(child);
    }

    this.enemies = this.enemies.filter((enemy) => enemy.alive);
    this.resolveEnemyOverlaps();
    this.enemySpawnTimer -= deltaTime;
    const maxEnemies = this.getMaxEnemies();
    if (this.enemies.length < maxEnemies && this.enemySpawnTimer <= 0) {
      this.enemySpawnTimer = this.enemySpawnInterval;
      this.spawnEnemyAtRandom();
    }

    const speed = this.player.getSpeed();
    const minZoom = 0.75;
    const maxZoom = 1.2;
    const speedForMaxZoomOut = 180;
    const t = Math.max(0, Math.min(1, speed / speedForMaxZoomOut));
    const targetZoom = maxZoom - (maxZoom - minZoom) * t;
    this.camera.zoom += (targetZoom - this.camera.zoom) * Math.min(1, deltaTime * 6);

    this.camera.follow(this.player.position, this.viewportSize, this.worldSize);
  }

  public renderPlaying(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.camera.apply(this.ctx);

    // World background
    this.ctx.fillStyle = '#0b0f1a';
    this.ctx.fillRect(0, 0, this.worldSize.x, this.worldSize.y);

    // Grid
    this.ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    this.ctx.lineWidth = 1;
    const grid = 200;
    for (let x = 0; x <= this.worldSize.x; x += grid) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.worldSize.y);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.worldSize.y; y += grid) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.worldSize.x, y);
      this.ctx.stroke();
    }

    // Entities in world space
    this.entityManager.render(this.ctx);

    // World bounds
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.worldSize.x, this.worldSize.y);

    this.camera.unapply(this.ctx);
  }

  public renderTextScreen(title: string, subtitle?: string): void {
    const w = this.ctx.canvas.width;
    const h = this.ctx.canvas.height;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '36px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(title, w / 2, h / 2 - 20);

    if (subtitle) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
      this.ctx.font = '18px sans-serif';
      this.ctx.fillText(subtitle, w / 2, h / 2 + 20);
    }
  }

  private renderCenterOverlay(title: string, subtitle?: string): void {
    const w = this.ctx.canvas.width;
    const h = this.ctx.canvas.height;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '32px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(title, w / 2, h / 2 - 18);
    if (subtitle) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
      this.ctx.font = '18px sans-serif';
      this.ctx.fillText(subtitle, w / 2, h / 2 + 18);
    }
    this.ctx.restore();
  }

  private setupUi(): void {
    const panel = new UIPanel({
      anchor: 'top-left',
      offsetX: (this.ctx.canvas.width - 160) / 2,
      offsetY: 10,
      width: 160,
      height: 40,
      backgroundColor: 'rgba(0,0,0,0.6)',
    });

    const scoreDisplay = new ScoreDisplay({
      getScore: () => this.score,
      anchor: 'center',
      offsetX: 0,
      offsetY: 0,
      parent: panel,
    });

    panel.add(scoreDisplay);
    this.hudLayer.add(panel);

    const livesPanel = new UIPanel({
      anchor: 'bottom-right',
      offsetX: -150,
      offsetY: -50,
      width: 140,
      height: 40,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderWidth: 0,
    });

    const livesDisplay = new ShipIndicators({
      getLives: () => this.lives,
      maxLives: 3,
      anchor: 'center',
      parent: livesPanel,
      color: '#00ff6a',
      size: 10,
      spacing: 10,
    });

    livesPanel.add(livesDisplay);
    this.hudLayer.add(livesPanel);

    const shieldBar = new ShieldBar({
      getValue: () => this.shieldEnergy,
      width: 120,
      height: 10,
      anchor: 'bottom-left',
      offsetX: 30,
      offsetY: -35,
      backgroundColor: 'rgba(0,0,0,0.5)',
      fillColor: this.shieldActive ? '#5ac8fa' : '#5ac8fa',
      borderColor: 'rgba(255,255,255,0.25)',
      borderWidth: 1,
    });

    this.hudLayer.add(shieldBar);

    this.addUILayer(this.hudLayer);

    const pausePanel = new UIPanel({
      anchor: 'center',
      offsetX: -120,
      offsetY: -35,
      width: 240,
      height: 70,
      backgroundColor: 'rgba(28, 54, 92, 0.9)',
      borderColor: 'rgba(120, 196, 255, 0.9)',
      borderWidth: 3,
      borderRadius: 16,
    });

    const pauseText = new TextDisplay({
      getText: () => 'PAUSED',
      anchor: 'center',
      parent: pausePanel,
      offsetY: 0,
      color: 'rgba(120, 196, 255, 0.9)',
      font: '28px sans-serif',
    });

    pausePanel.add(pauseText);
    this.pauseLayer.add(pausePanel);
    this.pauseLayer.setVisible(false);
    this.addUILayer(this.pauseLayer);
  }

  private setupStates(): void {
    const loadingState: GameState = {
      name: 'loading',
      enter: () => {
        this.assets.queueImage('ship', '/spaceship.png');
        this.assets.queueImage('enemy', '/enemy.png');
        void this.assets
          .loadAll((p) => {
            this.progress = p.percent;
          })
          .then(() => {
            this.shipSprite = this.assets.getImage('ship');
            this.enemySprite = this.assets.getImage('enemy');
            this.stateMachine.set('menu');
          });
      },
      update: () => {},
      render: () => {
        this.renderLoading();
      },
    };

    const menuState: GameState = {
      name: 'menu',
      enter: () => {
        this.pauseLayer.setVisible(false);
      },
      update: () => {
        if (this.input.wasPressed('Enter')) {
          this.resetGame();
          this.stateMachine.set('playing');
        }
      },
      render: () => {
        this.renderTextScreen('Orbital Drift', 'Press Enter to Start');
      },
    };

    const playingState: GameState = {
      name: 'playing',
      enter: () => {
        this.pauseLayer.setVisible(false);
      },
      update: (dt) => {
        if (this.input.wasPressed('p')) {
          this.stateMachine.set('paused');
          return;
        }
        this.updatePlaying(dt);
        if (this.lives === 0 && !this.player.alive) {
          this.stateMachine.set('gameover');
        }
      },
      render: () => {
        this.renderPlaying();
      },
    };

    const pausedState: GameState = {
      name: 'paused',
      enter: () => {
        this.pauseLayer.setVisible(true);
      },
      update: () => {
        if (this.input.wasPressed('p')) {
          this.stateMachine.set('playing');
        }
      },
      render: () => {
        this.renderPlaying();
      },
      exit: () => {
        this.pauseLayer.setVisible(false);
      },
    };

    const respawnState: GameState = {
      name: 'respawn',
      enter: () => {
        this.pauseLayer.setVisible(false);
      },
      update: (dt) => {
        this.respawnTimer = Math.max(0, this.respawnTimer - dt);
        if (this.respawnTimer === 0) {
          const spawn = this.getSafeSpawnPosition();
          this.player = new Player(
            spawn,
            new PlayerController(this.input),
            this.shipSprite,
          );
          this.addEntity(this.player);
          this.stateMachine.set('playing');
        }
      },
      render: () => {
        this.renderPlaying();
        this.renderCenterOverlay('Get Ready', `Respawning in ${Math.ceil(this.respawnTimer)}...`);
      },
    };

    const gameOverState: GameState = {
      name: 'gameover',
      update: () => {
        if (this.input.wasPressed('Enter')) {
          this.stateMachine.set('menu');
        }
      },
      render: () => {
        this.renderTextScreen('Game Over', `Score: ${this.score}`);
      },
    };

    this.stateMachine
      .add(loadingState)
      .add(menuState)
      .add(playingState)
      .add(pausedState)
      .add(respawnState)
      .add(gameOverState);
  }

  private resetGame(): void {
    this.score = 0;
    this.lives = 3;
    this.shieldEnergy = 1;
    this.shieldActive = false;
    this.shieldRegenCooldown = 0;
    this.respawnTimer = 0;
    this.asteroids = [];
    this.enemies = [];
    this.enemySpawnTimer = 0;
    this.enemyKills = 0;
    this.entityManager.clear();

    const spawn = this.getSafeSpawnPosition();
    this.player = new Player(
      spawn,
      new PlayerController(this.input),
      this.shipSprite,
    );
    this.addEntity(this.player);

    this.addAsteroid(new Asteroid({ x: this.worldSize.x / 2 + 120, y: this.worldSize.y / 2 - 60 }, 'XL', this.onAsteroidDestroyed));
    this.addAsteroid(new Asteroid({ x: this.worldSize.x / 2 - 200, y: this.worldSize.y / 2 + 140 }, 'L', this.onAsteroidDestroyed));
    this.addAsteroid(new Asteroid({ x: this.worldSize.x / 2 + 260, y: this.worldSize.y / 2 + 220 }, 'M', this.onAsteroidDestroyed));

    for (let i = 0; i < 3; i++) {
      this.spawnEnemyAtRandom();
    }
  }

  private addAsteroid(asteroid: Asteroid): void {
    this.asteroids.push(asteroid);
    this.addEntity(asteroid);
  }

  private addEnemy(enemy: Enemy): void {
    this.enemies.push(enemy);
    this.addEntity(enemy);
  }

  private spawnEnemyAtRandom(): void {
    const margin = 120;
    let x = 0;
    let y = 0;
    for (let i = 0; i < 10; i++) {
      x = margin + Math.random() * (this.worldSize.x - margin * 2);
      y = margin + Math.random() * (this.worldSize.y - margin * 2);
      const dx = x - this.player.position.x;
      const dy = y - this.player.position.y;
      if (Math.hypot(dx, dy) >= this.minEnemySpawnDistance) {
        break;
      }
    }
    this.addEnemy(new Enemy(
      { x, y },
      () => this.player.position,
      (pos, angle) => this.spawnEnemyBullet(pos, angle),
      this.enemySprite,
      () => this.onEnemyDestroyed(),
    ));
  }

  private getSafeSpawnPosition(): Vec2 {
    const margin = 200;
    let best: Vec2 = { x: this.worldSize.x / 2, y: this.worldSize.y / 2 };
    for (let i = 0; i < 20; i++) {
      const x = margin + Math.random() * (this.worldSize.x - margin * 2);
      const y = margin + Math.random() * (this.worldSize.y - margin * 2);
      const safeFromEnemies = this.enemies.every((e) => Math.hypot(e.position.x - x, e.position.y - y) > 260);
      const safeFromAsteroids = this.asteroids.every((a) => Math.hypot(a.position.x - x, a.position.y - y) > 220);
      if (safeFromEnemies && safeFromAsteroids) {
        return { x, y };
      }
      best = { x, y };
    }
    return best;
  }

  private resolveEnemyOverlaps(): void {
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i];
        const b = this.enemies[j];
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = a.radius + b.radius + 4;
        if (dist < minDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          const push = (minDist - dist) / 2;
          a.position.x -= nx * push;
          a.position.y -= ny * push;
          b.position.x += nx * push;
          b.position.y += ny * push;

          a.position.x = Math.max(0, Math.min(a.position.x, this.worldSize.x));
          a.position.y = Math.max(0, Math.min(a.position.y, this.worldSize.y));
          b.position.x = Math.max(0, Math.min(b.position.x, this.worldSize.x));
          b.position.y = Math.max(0, Math.min(b.position.y, this.worldSize.y));
        }
      }
    }
  }

  private onEnemyDestroyed(): void {
    this.enemyKills += 1;
    this.score += this.getMaxEnemies() * 10;
  }

  private getMaxEnemies(): number {
    let max = 5;
    let remaining = this.enemyKills;
    let step = 5;
    while (remaining >= step) {
      max += 1;
      remaining -= step;
      step += 1;
    }
    return Math.min(max, this.maxEnemyCap);
  }

  private spawnEnemyBullet(position: Vec2, angle: number): void {
    this.addEntity(new EnemyBullet(position, angle));
  }

  private onAsteroidDestroyed = (asteroid: Asteroid): void => {
    this.score += asteroid.getScoreValue();
  };

  protected override canTogglePause(): boolean {
    const state = this.stateMachine.currentState?.name;
    return state === 'playing' || state === 'paused';
  }

  protected override onPause(): void {
    this.pauseLayer.setVisible(true);
  }

  protected override onResume(): void {
    this.pauseLayer.setVisible(false);
  }

  private renderLoading(): void {
    const w = this.ctx.canvas.width;
    const h = this.ctx.canvas.height;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, w, h);

    const barWidth = 300;
    const barHeight = 16;
    const x = (w - barWidth) / 2;
    const y = h / 2 - barHeight / 2;

    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    this.ctx.fillStyle = 'rgba(120, 196, 255, 0.9)';
    this.ctx.fillRect(x, y, barWidth * this.progress, barHeight);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('Loading assets...', w / 2, y - 10);
  }
}

const engine = new CH10();

engine.init({
  selector: '#app',
  width: 800,
  height: 600,
  backgroundColor: '#000000',
});

engine.start();
