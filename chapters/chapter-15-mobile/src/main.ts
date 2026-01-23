import './style.css'
import { AssetManager, AudioManager, Camera, Engine, EventBus, ParticleSystem, StateMachine, SystemManager, easeInOutSine } from '@course/lib';
import type { GameState, Vec2 } from '@course/lib';
import { Player } from './Player';
import { PlayerController } from './PlayerController';
import { Asteroid, type AsteroidSize } from './Asteroid';
import { Bullet } from './Bullet';
import { Enemy } from './Enemy';
import { EnemyBullet } from './EnemyBullet';
import { GAME_CONFIG } from './config';
import type { GameEvents } from './events';
import { WaveSystem } from './systems/WaveSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { EffectsSystem } from './systems/EffectsSystem';
import { HudSystem } from './systems/HudSystem';

class CH15 extends Engine {
  private assets = new AssetManager();
  private audio = new AudioManager();
  private camera = new Camera();
  private particles = new ParticleSystem();
  private events = new EventBus<GameEvents>();
  private worldSize: Vec2 = { x: GAME_CONFIG.world.width, y: GAME_CONFIG.world.height };
  private systems = new SystemManager();
  private waveSystem!: WaveSystem;
  private scoreSystem!: ScoreSystem;
  private effectsSystem!: EffectsSystem;
  private progress = 0;
  private shipSprite?: HTMLImageElement;
  private enemySprite?: HTMLImageElement;

  private lives = 3;
  private shieldEnergy = 1;
  private shieldActive = false;
  private shieldDrainRate = GAME_CONFIG.shield.drainRate;
  private shieldRegenRate = GAME_CONFIG.shield.regenRate;
  private shieldRegenDelay = GAME_CONFIG.shield.regenDelay;
  private shieldRegenCooldown = 0;
  private hudSystem!: HudSystem;
  private player!: Player;
  private asteroids: Asteroid[] = [];
  private enemies: Enemy[] = [];
  private enemySpawnInterval = GAME_CONFIG.enemy.spawnInterval;
  private minEnemySpawnDistance = GAME_CONFIG.enemy.minSpawnDistance;
  private maxEnemyCap = GAME_CONFIG.enemy.maxCap;
  private respawnDelay = GAME_CONFIG.respawn.delay;
  private respawnTimer = 0;
  private playerDeathExploded = false;
  private menuPulseTime = 0;
  private stateMachine = new StateMachine<GameState>();
  private menuStars: Array<{ x: number; y: number; speed: number; size: number }> = [];
  private gameOverTime = 0;
  private fontFamily = '"Space Grotesk", sans-serif';

  protected override get screenSize(): Vec2 {
    return this.worldSize;
  }

  protected override onInit(): void {
    this.setUiUpdateInterval(100);
    this.setupSystems();
    this.setupEvents();
    this.setupMenuStars();
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
    const thrusting = this.player.isThrusting();

    if (this.input.wasPressed(' ')) {
      const angle = this.player.getAngle();
      const rad = (angle * Math.PI) / 180;
      const spawnOffset = this.player.radius * 1.2;
      const spawn = {
        x: this.player.position.x + Math.cos(rad) * spawnOffset,
        y: this.player.position.y + Math.sin(rad) * spawnOffset,
      };

      this.addEntity(new Bullet(spawn, angle));
      this.events.emit('shot:player', { position: spawn, angle });
    }

    super.update(deltaTime);

    this.systems.update(deltaTime);

    if (thrusting) {
      this.effectsSystem.emitThrusterTrail(this.player.position, this.player.getAngle() + 180, this.player.radius);
    }

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

    if (!this.player.alive) {
      if (!this.playerDeathExploded) {
        this.playerDeathExploded = true;
        this.events.emit('player:destroyed', { position: this.player.position });
      }
      if (this.lives > 0) {
        this.lives -= 1;
        if (this.lives > 0) {
          this.respawnTimer = this.respawnDelay;
          this.stateMachine.set('respawn');
          return;
        }
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
    this.ctx.clearRect(0, 0, this.viewportSize.x, this.viewportSize.y);

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

    if (this.waveSystem.isTransitioning) {
      this.renderCenterOverlay(`Wave ${this.waveSystem.currentWave}`, 'Prepare for battle');
    }
  }

  public renderTextScreen(title: string, subtitle?: string): void {
    const { x: w, y: h } = this.viewportSize;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `36px "Space Grotesk", sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(title, w / 2, h / 2 - 20);

    if (subtitle) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.ctx.font = `18px "Space Grotesk", sans-serif`;
      this.ctx.fillText(subtitle, w / 2, h / 2 + 20);
    }
  }

  private renderTitleScreen(): void {
    const { x: w, y: h } = this.viewportSize;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, w, h);

    this.renderMenuStars(w, h, this.menuPulseTime);

    this.ctx.font = `56px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = 'rgba(180,180,180,0.9)';
    this.ctx.strokeText('Orbital Drift', w / 2, h / 2 - 28);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('Orbital Drift', w / 2, h / 2 - 28);

    const pulse = (Math.sin(this.menuPulseTime * Math.PI * 1.2) + 1) / 2;
    const alpha = 0.25 + 0.75 * easeInOutSine(pulse);
    this.ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    this.ctx.font = `18px ${this.fontFamily}`;
    this.ctx.fillText('Press Enter to Start', w / 2, h / 2 + 28);
  }

  private renderGameOver(): void {
    const { x: w, y: h } = this.viewportSize;

    this.renderPlaying();

    const fade = Math.max(0, Math.min(1, this.gameOverTime / 1.2));
    this.ctx.save();
    this.ctx.fillStyle = `rgba(0,0,0,${(0.85 * fade).toFixed(3)})`;
    this.ctx.fillRect(0, 0, w, h);

    const textFade = Math.max(0, Math.min(1, (this.gameOverTime - 0.2) / 1));
    this.ctx.fillStyle = `rgba(255,255,255,${textFade.toFixed(3)})`;
    this.ctx.font = `36px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Game Over', w / 2, h / 2 - 20);

    this.ctx.font = `18px ${this.fontFamily}`;
    this.ctx.fillText(`Score: ${this.scoreSystem.getScore()}`, w / 2, h / 2 + 15);
    this.ctx.restore();
  }

  private setupMenuStars(): void {
    const count = 90;
    this.menuStars = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.02 + Math.random() * 0.08,
      size: 0.6 + Math.random() * 1.4,
    }));
  }

  private renderMenuStars(width: number, height: number, time: number): void {
    this.ctx.save();
    for (const star of this.menuStars) {
      const y = (star.y + time * star.speed) % 1;
      const x = star.x * width;
      const sy = y * height;
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 2 + star.x * 12));
      this.ctx.fillStyle = `rgba(120, 196, 255, ${twinkle.toFixed(3)})`;
      this.ctx.beginPath();
      this.ctx.arc(x, sy, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private renderCenterOverlay(title: string, subtitle?: string): void {
    const { x: w, y: h } = this.viewportSize;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `32px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(title, w / 2, h / 2 - 18);
    if (subtitle) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
      this.ctx.font = `18px ${this.fontFamily}`;
      this.ctx.fillText(subtitle, w / 2, h / 2 + 18);
    }
    this.ctx.restore();
  }

  private setupUi(): void {
    this.hudSystem = new HudSystem({
      getScore: () => this.scoreSystem.getScore(),
      getLives: () => this.lives,
      getShield: () => this.shieldEnergy,
      getShieldActive: () => this.shieldActive,
      getAsteroids: () => this.asteroids,
      getEnemies: () => this.enemies,
      getWorldSize: () => this.worldSize,
      getPlayer: () => this.player?.position,
      getCanvasSize: () => ({
        width: this.viewportSize.x,
        height: this.viewportSize.y,
      }),
      addLayer: (layer) => this.addUILayer(layer),
      fontFamily: this.fontFamily,
    });

    this.hudSystem.init();
  }

  private setupStates(): void {
    const loadingState: GameState = {
      name: 'loading',
      enter: () => {
        this.hudSystem.setHudVisible(false);
        const audioCtx = this.audio.getContext();
        this.assets.queueSound('doomed', '/Alexander Ehlers - Doomed.mp3', audioCtx);
        this.assets.queueSound('flags', '/Alexander Ehlers - Flags.mp3', audioCtx);
        this.assets.queueSound('lazerShoot', '/laserShoot.wav', audioCtx);
        this.assets.queueSound('laserShootEnemy', '/laserShootEnemy.wav', audioCtx);
        this.assets.queueSound('explosion', '/explosion.wav', audioCtx);
        this.assets.queueFont('Space Grotesk', '/Space_Grotesk/SpaceGrotesk-VariableFont_wght.ttf');
        this.assets.queueImage('ship', '/spaceship.png');
        this.assets.queueImage('enemy', '/enemy.png');
        void this.assets
          .loadAll((p) => {
            this.progress = p.percent;
          })
          .then(() => {
            this.shipSprite = this.assets.getImage('ship');
            this.enemySprite = this.assets.getImage('enemy');
            this.audio.registerSound('doomed', this.assets.getSound('doomed'));
            this.audio.registerSound('flags', this.assets.getSound('flags'));
            this.audio.registerSound('lazerShoot', this.assets.getSound('lazerShoot'));
            this.audio.registerSound('laserShootEnemy', this.assets.getSound('laserShootEnemy'));
            this.audio.registerSound('explosion', this.assets.getSound('explosion'));
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
        this.hudSystem.setHudVisible(false);
        this.hudSystem.setPauseVisible(false);
        this.audio.playMusic('doomed', 0.5);
        this.menuPulseTime = 0;
      },
      update: (dt) => {
        this.menuPulseTime += dt;
        if (this.input.wasPressed('Enter')) {
          void this.audio.resume().then(() => {
            this.audio.playMusic('flags', 0.5);
          });
          this.resetGame();
          this.stateMachine.set('playing');
        }
      },
      render: () => {
        this.renderTitleScreen();
      },
    };

    const playingState: GameState = {
      name: 'playing',
      enter: () => {
        this.hudSystem.setHudVisible(true);
        this.hudSystem.setPauseVisible(false);
        this.audio.playMusic('flags', 0.5);
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
        this.hudSystem.setHudVisible(true);
        this.hudSystem.setPauseVisible(true);
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
        this.hudSystem.setPauseVisible(false);
      },
    };

    const respawnState: GameState = {
      name: 'respawn',
      enter: () => {
        this.hudSystem.setHudVisible(true);
        this.hudSystem.setPauseVisible(false);
      },
      update: (dt) => {
        this.updateWorldDuringRespawn(dt);
        this.respawnTimer = Math.max(0, this.respawnTimer - dt);
        this.particles.update(dt);
        if (this.respawnTimer === 0) {
          const spawn = this.getSafeSpawnPosition();
          this.player = new Player(
            spawn,
            new PlayerController(this.input),
            this.shipSprite,
          );
          this.playerDeathExploded = false;
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
      enter: () => {
        this.hudSystem.setHudVisible(false);
        this.hudSystem.setPauseVisible(false);
        this.gameOverTime = 0;
      },
      update: (dt) => {
        this.gameOverTime += dt;
        if (this.input.wasPressed('Enter') || this.gameOverTime >= 3) {
          this.stateMachine.set('menu');
        }
      },
      render: () => {
        this.renderGameOver();
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

  private setupEvents(): void {
    this.events.on('asteroid:destroyed', ({ asteroid }) => {
      this.scoreSystem.onAsteroidDestroyed(asteroid);
      this.waveSystem.onAsteroidDestroyed();
    });

    this.events.on('enemy:destroyed', () => {
      this.scoreSystem.onEnemyDestroyed();
      this.waveSystem.onEnemyDestroyed();
    });
  }

  private setupSystems(): void {
    this.setupUi();
    this.waveSystem = new WaveSystem({
      enemySpawnInterval: this.enemySpawnInterval,
      maxEnemyCap: this.maxEnemyCap,
      waveTransitionDuration: GAME_CONFIG.waves.transitionDuration,
      getEnemyCount: () => this.enemies.length,
      getAsteroidCount: () => this.asteroids.length,
      spawnEnemy: () => this.spawnEnemyAtRandom(),
      spawnAsteroid: (size) => this.spawnAsteroidAtRandom(size),
    });

    this.scoreSystem = new ScoreSystem(() => this.waveSystem.currentWave);
    this.effectsSystem = new EffectsSystem(this.audio, this.particles);
    this.effectsSystem.bind(this.events);

    this.systems.clear();
    this.systems.add(this.waveSystem, 10);
    this.systems.add(this.scoreSystem, 20);
    this.systems.add(this.effectsSystem, 30);
  }

  private updateWorldDuringRespawn(deltaTime: number): void {
    super.update(deltaTime);

    this.systems.update(deltaTime);

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

    const focus = this.player?.position ?? { x: this.worldSize.x / 2, y: this.worldSize.y / 2 };
    this.camera.follow(focus, this.viewportSize, this.worldSize);
  }

  private resetGame(): void {
    this.lives = 3;
    this.shieldEnergy = 1;
    this.shieldActive = false;
    this.shieldRegenCooldown = 0;
    this.respawnTimer = 0;
    this.asteroids = [];
    this.enemies = [];
    this.playerDeathExploded = false;
    this.entityManager.clear();

    this.particles.clear();
    this.addEntity(this.particles);
    this.scoreSystem.reset();

    const spawn = this.getSafeSpawnPosition();
    this.player = new Player(
      spawn,
      new PlayerController(this.input),
      this.shipSprite,
    );
    this.addEntity(this.player);

    this.waveSystem.reset();
  }

  private addAsteroid(asteroid: Asteroid): void {
    this.waveSystem.registerWaveAsteroid();
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
      (pos) => this.events.emit('enemy:destroyed', { position: pos }),
    ));
  }

  private spawnAsteroidAtRandom(size: AsteroidSize): void {
    const margin = 160;
    let x = 0;
    let y = 0;
    for (let i = 0; i < 10; i++) {
      x = margin + Math.random() * (this.worldSize.x - margin * 2);
      y = margin + Math.random() * (this.worldSize.y - margin * 2);
      const dx = x - this.player.position.x;
      const dy = y - this.player.position.y;
      if (Math.hypot(dx, dy) >= 240) {
        break;
      }
    }
    this.addAsteroid(new Asteroid({ x, y }, size, this.onAsteroidDestroyed));
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


  private spawnEnemyBullet(position: Vec2, angle: number): void {
    this.addEntity(new EnemyBullet(position, angle));
    this.events.emit('shot:enemy', { position, angle });
  }


  private onAsteroidDestroyed = (asteroid: Asteroid): void => {
    this.events.emit('asteroid:destroyed', { asteroid });
  };


  protected override canTogglePause(): boolean {
    const state = this.stateMachine.currentState?.name;
    return state === 'playing' || state === 'paused';
  }

  protected override onPause(): void {
    this.hudSystem.setPauseVisible(true);
  }

  protected override onResume(): void {
    this.hudSystem.setPauseVisible(false);
  }

  private renderLoading(): void {
    const { x: w, y: h } = this.viewportSize;
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
    this.ctx.font = `18px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('Loading assets...', w / 2, y - 10);
  }
}

const engine = new CH15();

engine.init({
  selector: '#app',
  width: 1280,
  height: 720,
  backgroundColor: '#000000',
  resize: {
    mode: 'contain',
    maxDpr: 2,
    matchAspect: {
      base: 'height',
      baseSize: 720,
    },
    matchAspectWhen: {
      maxShortSide: 700,
      landscapeOnly: true,
    },
  },
});

engine.start();
