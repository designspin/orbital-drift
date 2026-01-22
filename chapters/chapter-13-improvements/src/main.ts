import './style.css'
import { AssetManager, AudioManager, Camera, Engine, EventBus, ParticleSystem, ShieldBar, StateMachine, UILayer, UIPanel, ScoreDisplay, TextDisplay, easeInOutSine } from '@course/lib';
import type { GameState, Vec2 } from '@course/lib';
import { Player } from './Player';
import { PlayerController } from './PlayerController';
import { Asteroid, type AsteroidSize } from './Asteroid';
import { Bullet } from './Bullet';
import { ShipIndicators } from './ShipIndicators';
import { RadarDisplay } from './RadarDisplay';
import { Enemy } from './Enemy';
import { EnemyBullet } from './EnemyBullet';

type GameEvents = {
  'shot:player': { position: Vec2; angle: number };
  'shot:enemy': { position: Vec2; angle: number };
  'asteroid:destroyed': { asteroid: Asteroid };
  'enemy:destroyed': { position: Vec2 };
  'player:destroyed': { position: Vec2 };
};

class CH13 extends Engine {
  private assets = new AssetManager();
  private audio = new AudioManager();
  private camera = new Camera();
  private particles = new ParticleSystem();
  private events = new EventBus<GameEvents>();
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
  private maxEnemyCap = 20;
  private respawnDelay = 2.5;
  private respawnTimer = 0;
  private playerDeathExploded = false;
  private menuPulseTime = 0;
  private wave = 1;
  private waveEnemiesToSpawn = 0;
  private waveEnemiesRemaining = 0;
  private waveAsteroidsRemaining = 0;
  private waveTransitionTimer = 0;
  private waveTransitionDuration = 2;
  private stateMachine = new StateMachine<GameState>();
  private menuStars: Array<{ x: number; y: number; speed: number; size: number }> = [];
  private gameOverTime = 0;
  private fontFamily = '"Space Grotesk", sans-serif';

  protected override get screenSize(): Vec2 {
    return this.worldSize;
  }

  private get viewportSize(): Vec2 {
    return { x: this.ctx.canvas.width, y: this.ctx.canvas.height };
  }

  protected override onInit(): void {
    this.setUiUpdateInterval(100);
    this.setupUi();
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

    if (thrusting) {
      this.emitThrusterTrail();
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
    this.updateWaveSpawns(deltaTime);
    this.checkWaveComplete();

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

    if (this.waveTransitionTimer > 0) {
      this.renderCenterOverlay(`Wave ${this.wave}`, 'Prepare for battle');
    }
  }

  public renderTextScreen(title: string, subtitle?: string): void {
    const w = this.ctx.canvas.width;
    const h = this.ctx.canvas.height;
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
    const w = this.ctx.canvas.width;
    const h = this.ctx.canvas.height;
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
    const w = this.ctx.canvas.width;
    const h = this.ctx.canvas.height;

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
    this.ctx.fillText(`Score: ${this.score}`, w / 2, h / 2 + 15);
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
    const w = this.ctx.canvas.width;
    const h = this.ctx.canvas.height;
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
      font: `16px ${this.fontFamily}`,
    });

    panel.add(scoreDisplay);
    this.hudLayer.add(panel);

    const radarPanel = new UIPanel({
      anchor: 'top-left',
      offsetX: (this.ctx.canvas.width - 160) / 2,
      offsetY: 56,
      width: 160,
      height: 90,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      borderRadius: 8,
    });

    const radarDisplay = new RadarDisplay({
      getAsteroids: () => this.asteroids,
      getEnemies: () => this.enemies,
      getPlayer: () => this.player?.position,
      getWorldSize: () => this.worldSize,
      width: 160,
      height: 90,
      anchor: 'top-left',
      parent: radarPanel,
      offsetX: 0,
      offsetY: 0,
      asteroidColor: '#ffffff',
      enemyColor: '#ff3b30',
      playerColor: '#3da5ff',
      dotRadius: 1.5,
    });

    radarPanel.add(radarDisplay);
    this.hudLayer.add(radarPanel);

    const livesPanel = new UIPanel({
      anchor: 'top-right',
      offsetX: -150,
      offsetY: 10,
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
      anchor: 'top-left',
      offsetX: 20,
      offsetY: 20,
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
      font: `28px ${this.fontFamily}`,
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
        this.hudLayer.setVisible(false);
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
        this.hudLayer.setVisible(false);
        this.pauseLayer.setVisible(false);
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
        this.hudLayer.setVisible(true);
        this.pauseLayer.setVisible(false);
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
        this.hudLayer.setVisible(true);
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
        this.hudLayer.setVisible(true);
        this.pauseLayer.setVisible(false);
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
        this.hudLayer.setVisible(false);
        this.pauseLayer.setVisible(false);
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
    this.events.on('shot:player', ({ position, angle }) => {
      this.audio.playSound('lazerShoot', 0.6);
      this.emitMuzzleFlash(position, angle);
    });

    this.events.on('shot:enemy', ({ position, angle }) => {
      this.audio.playSound('laserShootEnemy', 0.7);
      this.emitMuzzleFlash(position, angle, '#ff8b8b');
    });

    this.events.on('asteroid:destroyed', ({ asteroid }) => {
      this.score += asteroid.getScoreValue();
      this.waveAsteroidsRemaining = Math.max(0, this.waveAsteroidsRemaining - 1);
      this.audio.playSound('explosion', 0.7);
      this.emitExplosion(asteroid.position, 26, '#ffffff', '#ff9a7a');
    });

    this.events.on('enemy:destroyed', ({ position }) => {
      this.waveEnemiesRemaining = Math.max(0, this.waveEnemiesRemaining - 1);
      this.score += 10 * this.wave;
      this.audio.playSound('explosion', 0.7);
      this.emitExplosion(position, 22, '#ff6b6b', '#ffd3a3');
    });

    this.events.on('player:destroyed', ({ position }) => {
      this.audio.playSound('explosion', 0.7);
      this.emitExplosion(position, 30, '#7fd1ff', '#ffffff');
    });
  }

  private updateWorldDuringRespawn(deltaTime: number): void {
    super.update(deltaTime);

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
    this.updateWaveSpawns(deltaTime);
    this.checkWaveComplete();

    const focus = this.player?.position ?? { x: this.worldSize.x / 2, y: this.worldSize.y / 2 };
    this.camera.follow(focus, this.viewportSize, this.worldSize);
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
    this.playerDeathExploded = false;
    this.wave = 1;
    this.waveEnemiesToSpawn = 0;
    this.waveEnemiesRemaining = 0;
    this.waveAsteroidsRemaining = 0;
    this.waveTransitionTimer = 0;
    this.entityManager.clear();

    this.particles = new ParticleSystem();
    this.addEntity(this.particles);

    const spawn = this.getSafeSpawnPosition();
    this.player = new Player(
      spawn,
      new PlayerController(this.input),
      this.shipSprite,
    );
    this.addEntity(this.player);

    this.startWave(1);
  }

  private addAsteroid(asteroid: Asteroid, countForWave: boolean = true): void {
    if (countForWave) {
      this.waveAsteroidsRemaining += 1;
    }
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

  private startWave(wave: number): void {
    this.wave = wave;
    this.waveTransitionTimer = this.waveTransitionDuration;
    this.enemySpawnTimer = 0;

    const asteroidCount = 2 + Math.floor(wave / 2);
    this.waveAsteroidsRemaining = 0;
    for (let i = 0; i < asteroidCount; i++) {
      this.spawnAsteroidAtRandom();
    }

    this.waveEnemiesToSpawn = 2 + wave;
    this.waveEnemiesRemaining = this.waveEnemiesToSpawn;
  }

  private spawnAsteroidAtRandom(): void {
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
    this.addAsteroid(new Asteroid({ x, y }, this.getWaveAsteroidSize(), this.onAsteroidDestroyed));
  }

  private getWaveAsteroidSize(): AsteroidSize {
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

  private getWaveMaxEnemies(): number {
    return Math.min(3 + Math.floor(this.wave / 2), this.maxEnemyCap);
  }

  private spawnEnemyBullet(position: Vec2, angle: number): void {
    this.addEntity(new EnemyBullet(position, angle));
    this.events.emit('shot:enemy', { position, angle });
  }

  private updateWaveSpawns(deltaTime: number): void {
    if (this.waveTransitionTimer > 0) {
      this.waveTransitionTimer = Math.max(0, this.waveTransitionTimer - deltaTime);
      return;
    }

    this.enemySpawnTimer -= deltaTime;
    const maxEnemies = this.getWaveMaxEnemies();
    if (
      this.waveEnemiesToSpawn > 0 &&
      this.enemies.length < maxEnemies &&
      this.enemySpawnTimer <= 0
    ) {
      this.enemySpawnTimer = this.enemySpawnInterval;
      this.waveEnemiesToSpawn -= 1;
      this.spawnEnemyAtRandom();
    }
  }

  private checkWaveComplete(): void {
    if (this.waveTransitionTimer > 0) return;
    if (
      this.waveEnemiesRemaining <= 0 &&
      this.waveAsteroidsRemaining <= 0 &&
      this.enemies.length === 0 &&
      this.asteroids.length === 0
    ) {
      this.startWave(this.wave + 1);
    }
  }

  private onAsteroidDestroyed = (asteroid: Asteroid): void => {
    this.events.emit('asteroid:destroyed', { asteroid });
  };

  private emitMuzzleFlash(position: Vec2, angle: number, tint: string = '#ffe6a7'): void {
    this.particles.emit({
      position,
      count: 14,
      life: { min: 0.12, max: 0.4 },
      speed: { min: 80, max: 220 },
      angle: { min: angle - 18, max: angle + 18 },
      size: { min: 2, max: 4 },
      sizeEnd: 0,
      opacity: 1,
      opacityEnd: 0,
      color: { start: tint, end: '#ff6b6b' },
      blendMode: 'lighter',
      shape: 'circle',
    });
  }

  private emitExplosion(position: Vec2, count: number, startColor: string, endColor: string): void {
    this.particles.emit({
      position,
      count,
      life: { min: 0.4, max: 1.0 },
      speed: { min: 60, max: 240 },
      angle: { min: 0, max: 360 },
      size: { min: 2, max: 6 },
      sizeEnd: 0,
      opacity: { min: 0.8, max: 1 },
      opacityEnd: 0,
      color: { start: startColor, end: endColor },
      blendMode: 'lighter',
      shape: 'circle',
      spawnShape: 'circle',
      spawnRadius: 6,
    });
  }

  private emitThrusterTrail(): void {
    const angle = this.player.getAngle() + 180;
    const rad = (angle * Math.PI) / 180;
    const offset = this.player.radius * 1.1;
    const position = {
      x: this.player.position.x + Math.cos(rad) * offset,
      y: this.player.position.y + Math.sin(rad) * offset,
    };

    this.particles.emit({
      position,
      count: 3,
      life: { min: 0.15, max: 0.45 },
      speed: { min: 20, max: 80 },
      angle: { min: angle - 35, max: angle + 35 },
      size: { min: 1, max: 3 },
      sizeEnd: 0,
      opacity: { min: 0.4, max: 0.9 },
      opacityEnd: 0,
      color: { start: '#7fd1ff', end: '#326eff' },
      shape: 'circle',
      drag: 0.1,
    });
  }

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
    this.ctx.font = `18px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('Loading assets...', w / 2, y - 10);
  }
}

const engine = new CH13();

engine.init({
  selector: '#app',
  width: 800,
  height: 600,
  backgroundColor: '#000000',
});

engine.start();
