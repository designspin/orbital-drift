import './style.css'
import { AssetManager, AudioManager, Camera, Engine, EventBus, ParticleSystem, StateMachine, SystemManager, TouchControls, easeInOutSine } from '@course/lib';
import type { GameState, Vec2 } from '@course/lib';
import { Player } from './Player';
import { PlayerController } from './PlayerController';
import { Asteroid, type AsteroidSize } from './Asteroid';
import { Bullet } from './Bullet';
import { Enemy } from './Enemy';
import { Boss } from './Boss';
import { BossV2, type BossConfig } from './BossV2';
import { EnemyBullet } from './EnemyBullet';
import { HomingMissile } from './HomingMissile';
import { GAME_CONFIG } from './config';
import { random, setSeed } from './random';
import type { GameEvents } from './events';
import { WaveSystem } from './systems/WaveSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { EffectsSystem } from './systems/EffectsSystem';
import { HudSystem } from './systems/HudSystem';
import { SpriteFlashCache } from './SpriteFlashCache';

class CH17 extends Engine {
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
  private shipSpriteRect = { x: 60, y: 146, w: 264, h: 262 };
  private enemySprite?: HTMLImageElement;
  private enemy2Sprite?: HTMLImageElement;
  private bossSprites: Array<HTMLImageElement | undefined> = [];
  private finalBossSprite?: HTMLImageElement;
  private projectileSprite?: HTMLImageElement;
  private asteroidSprite?: HTMLImageElement;
  private enemySpriteRect = { x: 376, y: 187, w: 274, h: 218 };
  private enemySpriteRectStrafe = { x: 693, y: 199, w: 276, h: 201 };
  private enemySpriteRectDasher = { x: 372, y: 584, w: 281, h: 230 };
  private enemySpriteRectOrbiter = { x: 703, y: 603, w: 258, h: 204 };
  // private enemySpriteRectSine = { x: 70, y: 581, w: 244, h: 208 }; // Unused
  private enemy2SpriteRect1 = { x: 704, y: 102, w: 277, h: 289 };
  private enemy2SpriteRect2 = { x: 49, y: 104, w: 284, h: 270 };
  private enemy2SpriteRect3 = { x: 372, y: 119, w: 280, h: 266 };
  private enemy2SpriteRect4 = { x: 55, y: 552, w: 271, h: 254 };
  private enemy2SpriteRect5 = { x: 702, y: 560, w: 281, h: 245 };
  private enemy2SpriteRect6 = { x: 370, y: 569, w: 284, h: 225 };
  private missileRects = [
    { x: 142, y: 167, w: 76, h: 225 },
    { x: 311, y: 169, w: 74, h: 223 },
    { x: 473, y: 169, w: 78, h: 223 },
    { x: 638, y: 169, w: 78, h: 222 },
    { x: 805, y: 170, w: 79, h: 223 },
  ];
  private enemyProjectileRects = [
    { x: 122, y: 653, w: 117, h: 132 },
  ];
  private asteroidRects: Record<AsteroidSize, Array<{ x: number; y: number; w: number; h: number }>> = {
    XL: [
      { x: 43, y: 41, w: 352, h: 253 },
      { x: 441, y: 37, w: 359, h: 269 },
    ],
    L: [
      { x: 37, y: 361, w: 220, h: 177 },
      { x: 305, y: 372, w: 234, h: 171 },
      { x: 587, y: 375, w: 224, h: 168 },
    ],
    M: [
      { x: 48, y: 638, w: 168, h: 139 },
      { x: 269, y: 650, w: 155, h: 125 },
      { x: 476, y: 656, w: 149, h: 116 },
      { x: 678, y: 658, w: 136, h: 114 },
    ],
    S: [
      { x: 67, y: 891, w: 97, h: 73 },
      { x: 227, y: 888, w: 95, h: 76 },
      { x: 387, y: 888, w: 95, h: 76 },
      { x: 544, y: 892, w: 95, h: 74 },
      { x: 701, y: 895, w: 81, h: 67 },
    ],
  } as const;
  private touchControls?: TouchControls;

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
  private missiles: HomingMissile[] = [];
  private boss?: Boss;
  private enemySpawnInterval = GAME_CONFIG.enemy.spawnInterval;
  private minEnemySpawnDistance = GAME_CONFIG.enemy.minSpawnDistance;
  private maxEnemyCap = GAME_CONFIG.enemy.maxCap;
  private respawnDelay = GAME_CONFIG.respawn.delay;
  private respawnTimer = 0;
  private playerDeathExploded = false;
  private menuPulseTime = 0;
  private titleAnimTime = 0;
  private backgroundTime = 0;
  private stateMachine = new StateMachine<GameState>();
  private menuStars: Array<{ x: number; y: number; speed: number; size: number }> = [];
  private starLayers: Array<{ speed: number; stars: Array<{ x: number; y: number; size: number; alpha: number }> }> = [];
  private nebulae: Array<{ x: number; y: number; radius: number; color: string; alpha: number }> = [];
  private spiralStars: Array<{ radius: number; angle: number; size: number; alpha: number }> = [];
  private starTint: [number, number, number] = [210, 225, 255];
  private nebulaAlphaScale: number = 1;
  private themeOverlay: string = 'rgba(0,0,0,0)';
  private currentTheme?: { base: [number, number, number]; overlay: [number, number, number, number]; starTint: [number, number, number]; nebulaAlphaScale: number };
  private targetTheme?: { base: [number, number, number]; overlay: [number, number, number, number]; starTint: [number, number, number]; nebulaAlphaScale: number };
  private themeBlendTime = 0;
  private themeBlendDuration = 3;
  private gameOverTime = 0;
  private fontFamily = '"Space Grotesk", sans-serif';
  private minZoom = 1.0;
  private maxZoom = 1.6;
  private speedForMaxZoomOut = 180;
  private cameraFollowLerp = 4.5;
  private seed: number = GAME_CONFIG.seed;
  private bossTestEnabled = false;
  private testWave = 0;
  private enemySpawnPlan: Array<{ kind: 'single' | 'sine'; x: number; y: number; typeIndex?: number }> = [];
  private enemySpawnPlanIndex = 0;
  private asteroidSpawnPlan: Array<{ x: number; y: number }> = [];
  private asteroidSpawnPlanIndex = 0;
  private thrusterLoopActive = false;
  private waveOverlayTime = 0;
  private bossMusicActive = false;
  private onPointerDown = () => this.input.setActionState('confirm', true);
  private onPointerUp = () => this.input.setActionState('confirm', false);
  private onTouchStart = () => this.input.setActionState('confirm', true);
  private onTouchEnd = () => this.input.setActionState('confirm', false);

  protected override get screenSize(): Vec2 {
    return this.worldSize;
  }

  protected override onInit(): void {
    const seedParam = new URLSearchParams(window.location.search).get('seed');
    const seed = seedParam ? Number(seedParam) : GAME_CONFIG.seed;
    this.seed = Number.isFinite(seed) ? seed : GAME_CONFIG.seed;
    setSeed(this.seed);
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    this.bossTestEnabled =
      params.get('bossTest') === '1' ||
      hashParams.get('bossTest') === '1' ||
      GAME_CONFIG.debug.bossTest;

    // Check for test wave parameter
    const testWaveParam = params.get('wave') || hashParams.get('wave');
    if (testWaveParam) {
      this.testWave = parseInt(testWaveParam, 10);
    } else if (GAME_CONFIG.debug.testWave > 0) {
      this.testWave = GAME_CONFIG.debug.testWave;
    } else if (this.bossTestEnabled) {
      this.testWave = 5; // Default to first boss if bossTest is enabled
    }
    this.setupActions();
    this.setupTapToStart();
    this.setUiUpdateInterval(100);
    this.setupSystems();
    this.setupEvents();
    this.setupMenuStars();
    this.setupBackground();
    this.setupStates();
    this.camera.zoom = this.maxZoom;
    this.stateMachine.set('loading');
  }

  private setupActions(): void {
    this.input.bindAction('turnLeft', 'ArrowLeft', 'a', 'A');
    this.input.bindAction('turnRight', 'ArrowRight', 'd', 'D');
    this.input.bindAction('thrust', 'ArrowUp', 'w', 'W');
    this.input.bindAction('shield', 'ArrowDown', 's', 'S', 'z', 'Z');
    this.input.bindAction('fire', ' ', 'Space', 'x', 'X');
    this.input.bindAction('confirm', 'Enter');
    this.input.bindAction('pause', 'p', 'P', 'Escape');
  }

  private setupTapToStart(): void {
    this.ctx.canvas.style.touchAction = 'none';
    this.ctx.canvas.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    this.ctx.canvas.addEventListener('pointerup', this.onPointerUp, { passive: true });
    this.ctx.canvas.addEventListener('pointercancel', this.onPointerUp, { passive: true });
    this.ctx.canvas.addEventListener('pointerout', this.onPointerUp, { passive: true });
    this.ctx.canvas.addEventListener('pointerleave', this.onPointerUp, { passive: true });
    this.ctx.canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.ctx.canvas.addEventListener('touchend', this.onTouchEnd, { passive: true });
    this.ctx.canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    window.addEventListener('pointerup', this.onPointerUp, { passive: true });
    window.addEventListener('pointercancel', this.onPointerUp, { passive: true });
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this.onTouchEnd, { passive: true });
  }

  protected override update(deltaTime: number): void {
    this.stateMachine.update(deltaTime);
  }

  protected override render(): void {
    this.stateMachine.render();
  }

  public updatePlaying(deltaTime: number): void {
    this.backgroundTime += deltaTime;
    this.updateThemeBlend(deltaTime);
    const bossActive = this.waveSystem.isBossActive;
    if (bossActive !== this.bossMusicActive) {
      this.bossMusicActive = bossActive;
      this.audio.playMusic(bossActive ? 'doomed' : 'flags', 0.5);
    }
    this.shieldActive = this.input.isActionDown('shield') && this.shieldEnergy > 0;
    const thrusting = this.player.isThrusting();
    this.updateThrusterAudio(thrusting);
    if (this.waveSystem.isTransitioning) {
      this.waveOverlayTime += deltaTime;
    } else {
      this.waveOverlayTime = 0;
    }

    if (this.input.wasActionPressed('fire')) {
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
    this.missiles = this.missiles.filter((missile) => missile.alive);
    this.resolveEnemyOverlaps();
    if (this.boss && !this.boss.alive) {
      this.boss = undefined;
      this.waveSystem.onBossDefeated();
    }

    const speed = this.player.getSpeed();
    const t = Math.max(0, Math.min(1, speed / this.speedForMaxZoomOut));
    const targetZoom = this.maxZoom - (this.maxZoom - this.minZoom) * t;
    this.camera.zoom += (targetZoom - this.camera.zoom) * Math.min(1, deltaTime * 6);

    this.updateCameraFollow(deltaTime);
  }

  public renderPlaying(): void {
    this.ctx.clearRect(0, 0, this.viewportSize.x, this.viewportSize.y);
    this.camera.apply(this.ctx);

    // World background
    const theme = this.getBlendedTheme(this.waveSystem.currentWave);
    this.starTint = theme.starTint;
    this.nebulaAlphaScale = theme.nebulaAlphaScale;
    this.themeOverlay = `rgba(${theme.overlay[0]}, ${theme.overlay[1]}, ${theme.overlay[2]}, ${theme.overlay[3].toFixed(3)})`;
    this.ctx.fillStyle = `rgb(${theme.base[0]}, ${theme.base[1]}, ${theme.base[2]})`;
    this.ctx.fillRect(0, 0, this.worldSize.x, this.worldSize.y);
    this.ctx.fillStyle = this.themeOverlay;
    this.ctx.fillRect(0, 0, this.worldSize.x, this.worldSize.y);
    this.renderNebulae();
    this.renderStars();

    // Entities in world space
    this.entityManager.render(this.ctx);

    // World bounds
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.worldSize.x, this.worldSize.y);

    this.camera.unapply(this.ctx);

    if (this.waveSystem.isTransitioning) {
      this.renderCenterOverlay(
        `Wave ${this.waveSystem.currentWave}`,
        'Prepare for battle',
        this.waveOverlayTime,
        GAME_CONFIG.waves.transitionDuration
      );
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

    const animDuration = 1.2;
    const t = Math.min(1, this.titleAnimTime / animDuration);
      const spring = this.springSettle(t);
      const sweep = (1 - spring) * 260;
      const drop = (1 - spring) * 180;
      const scale = 0.6 + 0.5 * spring;
      const alpha = 0.2 + 0.8 * easeInOutSine(t);

    this.ctx.font = `56px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.lineWidth = 3;

    const baseY = h / 2 - 28;
    const gap = 18;
    const orbitalWidth = this.ctx.measureText('Orbital').width;
    const driftWidth = this.ctx.measureText('Drift').width;
    const totalWidth = orbitalWidth + gap + driftWidth;
    const leftCenterX = w / 2 - totalWidth / 2 + orbitalWidth / 2;
    const rightCenterX = w / 2 + totalWidth / 2 - driftWidth / 2;

      const drawGlow = (text: string, x: number, y: number, offsetX: number, offsetY: number) => {
        this.ctx.save();
        this.ctx.translate(x + offsetX, y + offsetY);
        this.ctx.scale(scale * 1.02, scale * 1.02);
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.shadowColor = `rgba(120, 196, 255, ${(0.6 * alpha).toFixed(3)})`;
        this.ctx.shadowBlur = 24;
        this.ctx.fillStyle = `rgba(120, 196, 255, ${(0.35 * alpha).toFixed(3)})`;
        this.ctx.fillText(text, 0, 0);
        this.ctx.restore();
      };

      const drawWord = (text: string, x: number, y: number, offsetX: number, offsetY: number) => {
          this.ctx.save();
          this.ctx.translate(x + offsetX, y + offsetY);
          this.ctx.scale(scale, scale);
          this.ctx.strokeStyle = `rgba(180,180,180,${(0.7 * alpha).toFixed(3)})`;
          this.ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
          this.ctx.strokeText(text, 0, 0);
          this.ctx.fillText(text, 0, 0);
          this.ctx.restore();
      };

      drawGlow('Orbital', leftCenterX, baseY, -sweep, -drop);
      drawGlow('Drift', rightCenterX, baseY, sweep, -drop * 0.7);
      drawWord('Orbital', leftCenterX, baseY, -sweep, -drop);
      drawWord('Drift', rightCenterX, baseY, sweep, -drop * 0.7);

    const pulse = (Math.sin(this.menuPulseTime * Math.PI * 1.2) + 1) / 2;
    const promptAlpha = 0.25 + 0.75 * easeInOutSine(pulse);
    this.ctx.fillStyle = `rgba(255,255,255,${promptAlpha.toFixed(3)})`;
    this.ctx.font = `18px ${this.fontFamily}`;
    this.ctx.fillText('Press Fire to Start', w / 2, h / 2 + 28);
  }


  private renderGameOver(): void {
    const { x: w, y: h } = this.viewportSize;

    this.renderPlaying();

    const { alpha, yOffset } = this.getPanelAnimation(this.gameOverTime, 5);
    if (alpha <= 0) {
      this.ctx.restore();
      return;
    }
    this.ctx.save();
    const panelW = 380;
    const panelH = 130;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2 + yOffset;
    this.ctx.fillStyle = `rgba(0,0,0,${(0.45 * alpha).toFixed(3)})`;
    this.drawRoundedRect(this.ctx, px, py, panelW, panelH, 16);
    this.ctx.fill();

    this.ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    this.ctx.font = `36px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Game Over', w / 2, h / 2 - 18 + yOffset);

    this.ctx.font = `18px ${this.fontFamily}`;
    this.ctx.fillText(`Score: ${this.scoreSystem.getScore()}`, w / 2, h / 2 + 15 + yOffset);
    this.ctx.restore();
  }

  private updateCameraFollow(deltaTime: number): void {
    const target = this.player.position;
    const halfW = (this.viewportSize.x / 2) / this.camera.zoom;
    const halfH = (this.viewportSize.y / 2) / this.camera.zoom;

    let desiredX = target.x - halfW;
    let desiredY = target.y - halfH;

    const maxX = Math.max(0, this.worldSize.x - this.viewportSize.x / this.camera.zoom);
    const maxY = Math.max(0, this.worldSize.y - this.viewportSize.y / this.camera.zoom);
    desiredX = Math.max(0, Math.min(desiredX, maxX));
    desiredY = Math.max(0, Math.min(desiredY, maxY));

    const t = Math.min(1, deltaTime * this.cameraFollowLerp);
    this.camera.position.x += (desiredX - this.camera.position.x) * t;
    this.camera.position.y += (desiredY - this.camera.position.y) * t;
    this.camera.position.x = Math.max(0, Math.min(this.camera.position.x, maxX));
    this.camera.position.y = Math.max(0, Math.min(this.camera.position.y, maxY));
  }

  private getCameraViewBounds(padding: number = 0): { x: number; y: number; w: number; h: number } {
    const viewW = this.viewportSize.x / this.camera.zoom;
    const viewH = this.viewportSize.y / this.camera.zoom;
    return {
      x: this.camera.position.x - padding,
      y: this.camera.position.y - padding,
      w: viewW + padding * 2,
      h: viewH + padding * 2,
    };
  }

  private setupMenuStars(): void {
    const count = 90;
    this.menuStars = Array.from({ length: count }, () => ({
      x: random(),
      y: random(),
      speed: 0.02 + random() * 0.08,
      size: 0.6 + random() * 1.4,
    }));
  }

  private setupBackground(): void {
    const layers = [
      { speed: 0.15, count: 220, size: [0.6, 1.4], alpha: [0.15, 0.4] },
      { speed: 0.35, count: 160, size: [0.8, 2.0], alpha: [0.25, 0.6] },
      { speed: 0.6, count: 120, size: [1.2, 2.6], alpha: [0.35, 0.8] },
    ];

    this.starLayers = layers.map((layer) => ({
      speed: layer.speed,
      stars: Array.from({ length: layer.count }, () => ({
        x: Math.random() * this.worldSize.x,
        y: Math.random() * this.worldSize.y,
        size: layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
        alpha: layer.alpha[0] + Math.random() * (layer.alpha[1] - layer.alpha[0]),
      })),
    }));

    const palette = ['#5b6cf5', '#7a4fff', '#2f88ff', '#42c7ff'];
    this.nebulae = Array.from({ length: 6 }, () => ({
      x: Math.random() * this.worldSize.x,
      y: Math.random() * this.worldSize.y,
      radius: 280 + Math.random() * 380,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 0.05 + Math.random() * 0.08,
    }));

    const armCount = 3;
    const count = 320;
    const maxRadius = Math.min(this.worldSize.x, this.worldSize.y) * 0.6;
    this.spiralStars = Array.from({ length: count }, () => {
      const arm = Math.floor(Math.random() * armCount);
      const radius = Math.pow(Math.random(), 0.6) * maxRadius;
      const baseAngle = radius * 0.02 + (arm * (Math.PI * 2) / armCount);
      const jitter = (Math.random() - 0.5) * 0.6;
      return {
        radius,
        angle: baseAngle + jitter,
        size: 0.8 + Math.random() * 2.2,
        alpha: 0.25 + Math.random() * 0.55,
      };
    });
  }

  private renderMenuStars(width: number, height: number, time: number): void {
    this.ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    for (const star of this.menuStars) {
      const y = (star.y + time * star.speed) % 1;
      const x = star.x * width;
      const sy = y * height;
      const dx = x - cx;
      const dy = sy - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) + time * 0.3 + dist * 0.0015;
      const radius = dist + Math.sin(time * 1.2 + dist * 0.02) * 4;
      const swirlX = cx + Math.cos(angle) * radius;
      const swirlY = cy + Math.sin(angle) * radius;
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 2 + star.x * 12));
      this.ctx.fillStyle = `rgba(120, 196, 255, ${twinkle.toFixed(3)})`;
      this.ctx.beginPath();
      this.ctx.arc(swirlX, swirlY, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private renderStars(): void {
    this.ctx.save();
    const center = { x: this.worldSize.x / 2, y: this.worldSize.y / 2 };
    const [sr, sg, sb] = this.starTint;
    for (const layer of this.starLayers) {
      const offsetX = -this.camera.position.x * layer.speed;
      const offsetY = -this.camera.position.y * layer.speed;
      for (const star of layer.stars) {
        const x = (star.x + offsetX) % this.worldSize.x;
        const y = (star.y + offsetY) % this.worldSize.y;
        const sx = x < 0 ? x + this.worldSize.x : x;
        const sy = y < 0 ? y + this.worldSize.y : y;
        this.ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${star.alpha.toFixed(3)})`;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.restore();

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    const rotation = this.backgroundTime * 0.08;
    for (const star of this.spiralStars) {
      const angle = star.angle + rotation;
      const x = center.x + Math.cos(angle) * star.radius;
      const y = center.y + Math.sin(angle) * star.radius;
      const pulse = 0.6 + 0.4 * Math.sin(this.backgroundTime * 1.2 + star.radius * 0.02);
      const alpha = star.alpha * pulse;
      this.ctx.fillStyle = `rgba(150, 200, 255, ${alpha.toFixed(3)})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private renderNebulae(): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    for (const nebula of this.nebulae) {
      const gradient = this.ctx.createRadialGradient(
        nebula.x,
        nebula.y,
        0,
        nebula.x,
        nebula.y,
        nebula.radius,
      );
      const alphaScale = this.nebulaAlphaScale;
      gradient.addColorStop(0, `rgba(255,255,255,${(nebula.alpha * 0.2 * alphaScale).toFixed(3)})`);
      gradient.addColorStop(0.4, `rgba(255,255,255,${(nebula.alpha * 0.12 * alphaScale).toFixed(3)})`);
      gradient.addColorStop(1, `rgba(0,0,0,0)`);
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = `rgba(${parseInt(nebula.color.slice(1,3),16)}, ${parseInt(nebula.color.slice(3,5),16)}, ${parseInt(nebula.color.slice(5,7),16)}, ${(nebula.alpha * 0.6 * alphaScale).toFixed(3)})`;
      this.ctx.beginPath();
      this.ctx.arc(nebula.x, nebula.y, nebula.radius * 0.75, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private getWaveTheme(wave: number): { base: [number, number, number]; overlay: [number, number, number, number]; starTint: [number, number, number]; nebulaAlphaScale: number } {
    const themes = [
      { base: [11, 15, 26] as [number, number, number], overlay: [40, 60, 120, 0.35] as [number, number, number, number], starTint: [210, 225, 255] as [number, number, number], nebulaAlphaScale: 1.0 },
      { base: [10, 19, 18] as [number, number, number], overlay: [40, 140, 120, 0.35] as [number, number, number, number], starTint: [170, 255, 230] as [number, number, number], nebulaAlphaScale: 0.8 },
      { base: [20, 11, 31] as [number, number, number], overlay: [120, 50, 200, 0.4] as [number, number, number, number], starTint: [220, 180, 255] as [number, number, number], nebulaAlphaScale: 1.3 },
      { base: [26, 11, 11] as [number, number, number], overlay: [200, 60, 40, 0.35] as [number, number, number, number], starTint: [255, 190, 170] as [number, number, number], nebulaAlphaScale: 0.9 },
      { base: [11, 16, 32] as [number, number, number], overlay: [60, 120, 255, 0.42] as [number, number, number, number], starTint: [180, 210, 255] as [number, number, number], nebulaAlphaScale: 1.1 },
    ];
    return themes[(wave - 1) % themes.length];
  }

  private setWaveTheme(wave: number): void {
    const next = this.getWaveTheme(wave);
    if (!this.currentTheme) {
      this.currentTheme = next;
      this.targetTheme = next;
      this.themeBlendTime = this.themeBlendDuration;
      return;
    }
    this.targetTheme = next;
    this.themeBlendTime = 0;
  }

  private updateThemeBlend(deltaTime: number): void {
    if (!this.currentTheme || !this.targetTheme) return;
    if (this.themeBlendTime < this.themeBlendDuration) {
      this.themeBlendTime = Math.min(this.themeBlendDuration, this.themeBlendTime + deltaTime);
    } else {
      this.currentTheme = this.targetTheme;
    }
  }

  private getBlendedTheme(wave: number): { base: [number, number, number]; overlay: [number, number, number, number]; starTint: [number, number, number]; nebulaAlphaScale: number } {
    if (!this.currentTheme || !this.targetTheme) {
      const theme = this.getWaveTheme(wave);
      this.currentTheme = theme;
      this.targetTheme = theme;
      return theme;
    }
    const t = Math.min(1, Math.max(0, this.themeBlendTime / this.themeBlendDuration));
    const lerp = (a: number, b: number) => a + (b - a) * t;
    return {
      base: [
        Math.round(lerp(this.currentTheme.base[0], this.targetTheme.base[0])),
        Math.round(lerp(this.currentTheme.base[1], this.targetTheme.base[1])),
        Math.round(lerp(this.currentTheme.base[2], this.targetTheme.base[2])),
      ],
      overlay: [
        Math.round(lerp(this.currentTheme.overlay[0], this.targetTheme.overlay[0])),
        Math.round(lerp(this.currentTheme.overlay[1], this.targetTheme.overlay[1])),
        Math.round(lerp(this.currentTheme.overlay[2], this.targetTheme.overlay[2])),
        lerp(this.currentTheme.overlay[3], this.targetTheme.overlay[3]),
      ],
      starTint: [
        Math.round(lerp(this.currentTheme.starTint[0], this.targetTheme.starTint[0])),
        Math.round(lerp(this.currentTheme.starTint[1], this.targetTheme.starTint[1])),
        Math.round(lerp(this.currentTheme.starTint[2], this.targetTheme.starTint[2])),
      ],
      nebulaAlphaScale: lerp(this.currentTheme.nebulaAlphaScale, this.targetTheme.nebulaAlphaScale),
    };
  }

  private renderCenterOverlay(title: string, subtitle?: string, elapsed: number = 0, duration: number = 1): void {
    const { x: w, y: h } = this.viewportSize;
    const { alpha, yOffset } = this.getPanelAnimation(elapsed, duration);
    if (alpha <= 0) return;
    this.ctx.save();
    const panelW = 360;
    const panelH = subtitle ? 120 : 90;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2 + yOffset;
    this.ctx.fillStyle = `rgba(0,0,0,${(0.38 * alpha).toFixed(3)})`;
    this.drawRoundedRect(this.ctx, px, py, panelW, panelH, 14);
    this.ctx.fill();
    this.ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    this.ctx.font = `32px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(title, w / 2, h / 2 - 12 + yOffset);
    if (subtitle) {
      this.ctx.fillStyle = `rgba(255,255,255,${(0.8 * alpha).toFixed(3)})`;
      this.ctx.font = `18px ${this.fontFamily}`;
      this.ctx.fillText(subtitle, w / 2, h / 2 + 18 + yOffset);
    }
    this.ctx.restore();
  }

  private getPanelAnimation(elapsed: number, duration: number): { alpha: number; yOffset: number } {
    const total = Math.max(0.01, duration);
    const inDur = Math.min(0.45, total * 0.4);
    const outDur = Math.min(0.45, total * 0.4);
    const tIn = Math.min(1, Math.max(0, elapsed / inDur));
    const tOut = Math.min(1, Math.max(0, (total - elapsed) / outDur));
    const raw = Math.min(tIn, tOut);
    const alpha = easeInOutSine(raw);
    const yOffset = (1 - alpha) * 18;
    return { alpha, yOffset };
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  // Unused easing functions - kept for future use
  // private easeOutBack(t: number): number {
  //   const c1 = 1.70158;
  //   const c3 = c1 + 1;
  //   const x = Math.max(0, Math.min(1, t));
  //   return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  // }

  // private easeOutSpring(t: number): number {
  //   const x = Math.max(0, Math.min(1, t));
  //   return 1 - (Math.cos(x * Math.PI * 2.6) * Math.exp(-4 * x));
  // }

  private springSettle(t: number): number {
    const x = Math.max(0, Math.min(1, t));
    return 1 - Math.exp(-8 * x) * Math.cos(12 * x);
  }

  private setupUi(): void {
    this.hudSystem = new HudSystem({
      getScore: () => this.scoreSystem.getScore(),
      getLives: () => this.lives,
      getShield: () => this.shieldEnergy,
      getShieldActive: () => this.shieldActive,
      getBossHealth: () => this.boss?.getHealthRatio() ?? 0,
      getBossVisible: () => !!this.boss && this.boss.alive,
      getBoss: () => (this.boss && this.boss.alive ? this.boss : undefined),
      getMissiles: () => this.missiles,
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
        this.assets.queueSound('start', '/start.wav', audioCtx);
        this.assets.queueSound('thruster', '/thruster.wav', audioCtx);
        this.assets.queueFont('Space Grotesk', '/Space_Grotesk/SpaceGrotesk-VariableFont_wght.ttf');
        this.assets.queueImage('ship', '/spritesheet.png');
        this.assets.queueImage('enemy', '/enemy.png');
        this.assets.queueImage('enemy2', '/spritesheet2.png');
        this.assets.queueImage('asteroids', '/asteroids_clean.png');
        this.assets.queueImage('boss1', '/boss1.png');
        this.assets.queueImage('boss2', '/boss2.png');
        this.assets.queueImage('boss3', '/boss3.png');
        this.assets.queueImage('boss4', '/boss4.png');
        this.assets.queueImage('finalboss', '/finalboss.png');
        this.assets.queueImage('projectiles', '/projectiles.png');
        void this.assets
          .loadAll((p) => {
            this.progress = p.percent;
          })
          .then(() => {
            this.shipSprite = this.assets.getImage('ship');
            this.enemySprite = this.shipSprite;
            this.enemy2Sprite = this.assets.getImage('enemy2');
            this.asteroidSprite = this.assets.getImage('asteroids');
            this.bossSprites = [
              this.makeBgTransparent(this.assets.getImage('boss1'), 12),
              this.makeBgTransparent(this.assets.getImage('boss2'), 12),
              this.makeBgTransparent(this.assets.getImage('boss3'), 12),
              this.makeBgTransparent(this.assets.getImage('boss4'), 12),
            ];
            this.finalBossSprite = this.makeBgTransparent(this.assets.getImage('finalboss'), 12);
            this.projectileSprite = this.assets.getImage('projectiles');
            this.audio.registerSound('doomed', this.assets.getSound('doomed'));
            this.audio.registerSound('flags', this.assets.getSound('flags'));
            this.audio.registerSound('lazerShoot', this.assets.getSound('lazerShoot'));
            this.audio.registerSound('laserShootEnemy', this.assets.getSound('laserShootEnemy'));
            this.audio.registerSound('explosion', this.assets.getSound('explosion'));
            this.audio.registerSound('start', this.assets.getSound('start'));
            this.audio.registerSound('thruster', this.assets.getSound('thruster'));

            // Pre-cache all flash sprites for mobile performance
            this.preCacheFlashSprites();

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
        this.titleAnimTime = 0;
        this.stopThrusterAudio();
        this.touchControls?.setVisible(false);
      },
      update: (dt) => {
        this.menuPulseTime += dt;
        this.titleAnimTime += dt;
        const confirmPressed = this.input.wasActionPressed('confirm');
        const firePressed = this.input.wasActionPressed('fire');
        if (confirmPressed || firePressed) {
          this.resetGame();
          const bossActive = this.waveSystem.isBossActive;
          void this.audio.resume().then(() => {
            this.bossMusicActive = bossActive;
            this.audio.playSound('start', 0.7);
            this.audio.playMusic(bossActive ? 'doomed' : 'flags', 0.5);
          });
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
        const bossActive = this.waveSystem.isBossActive;
        this.bossMusicActive = bossActive;
        this.audio.playMusic(bossActive ? 'doomed' : 'flags', 0.5);
        this.touchControls?.setVisible(true);
      },
      update: (dt) => {
        if (this.input.wasActionPressed('pause')) {
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
        this.touchControls?.setVisible(true);
        this.stopThrusterAudio();
      },
      update: () => {
        if (this.input.wasActionPressed('pause')) {
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
        this.touchControls?.setVisible(true);
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
            this.shipSpriteRect,
          );
          this.playerDeathExploded = false;
          this.player.setInvulnerable(3.0); // 3 seconds of invulnerability after respawn
          this.addEntity(this.player);
          this.stateMachine.set('playing');
        }
      },
      render: () => {
        this.renderPlaying();
        const elapsed = Math.max(0, this.respawnDelay - this.respawnTimer);
        this.renderCenterOverlay(
          'Get Ready',
          `Respawning in ${Math.ceil(this.respawnTimer)}...`,
          elapsed,
          this.respawnDelay
        );
      },
    };

    const gameOverState: GameState = {
      name: 'gameover',
      enter: () => {
        this.hudSystem.setHudVisible(false);
        this.hudSystem.setPauseVisible(false);
        this.gameOverTime = 0;
        this.stopThrusterAudio();
        this.touchControls?.setVisible(false);
      },
      update: (dt) => {
        this.gameOverTime += dt;
        super.update(dt);
        this.systems.update(dt);
        if (this.gameOverTime >= 5) {
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

    private updateThrusterAudio(thrusting: boolean): void {
      if (thrusting && !this.thrusterLoopActive) {
        this.audio.playLoop('thruster', 0.4);
        this.thrusterLoopActive = true;
      } else if (!thrusting && this.thrusterLoopActive) {
        this.audio.stopLoop('thruster');
        this.thrusterLoopActive = false;
      }
    }

    private stopThrusterAudio(): void {
      if (!this.thrusterLoopActive) return;
      this.audio.stopLoop('thruster');
      this.thrusterLoopActive = false;
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

    this.events.on('missile:destroyed', () => {
      this.scoreSystem.onMissileDestroyed();
    });

    this.events.on('boss:hit', () => {
      this.scoreSystem.onBossHit();
    });

    this.events.on('boss:destroyed', () => {
      this.scoreSystem.onBossDestroyed();
    });
  }

  private setupSystems(): void {
    this.setupUi();
    this.setupTouchControls();
    this.waveSystem = new WaveSystem({
      seed: this.seed,
      enemySpawnInterval: this.enemySpawnInterval,
      maxEnemyCap: this.maxEnemyCap,
      waveTransitionDuration: GAME_CONFIG.waves.transitionDuration,
      getEnemyCount: () => this.enemies.length,
      getAsteroidCount: () => this.asteroids.length,
      spawnEnemy: () => this.spawnEnemyAtRandom(),
      spawnAsteroid: (size) => this.spawnAsteroidAtRandom(size),
      spawnBoss: (wave) => this.spawnBoss(wave),
      onWaveStart: (wave, seed, asteroidCount, enemyCount) => {
        setSeed(seed);
        this.buildAsteroidSpawnPlan(asteroidCount ?? 0);
        this.buildEnemySpawnPlan(enemyCount ?? 0, wave);
        this.setWaveTheme(wave);
      },
    });

    this.scoreSystem = new ScoreSystem(() => this.waveSystem.currentWave);
    this.effectsSystem = new EffectsSystem(this.audio, this.particles);
    this.effectsSystem.bind(this.events);

    this.systems.clear();
    this.systems.add(this.waveSystem, 10);
    this.systems.add(this.scoreSystem, 20);
    this.systems.add(this.effectsSystem, 30);
  }

  private setupTouchControls(): void {
    const isTouch = navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    const uiCanvas = this.getUiCanvas();
    if (!uiCanvas) return;

    this.setUiPointerEvents(true);

    this.touchControls = new TouchControls({
      canvas: uiCanvas,
      input: this.input,
      mapPoint: (point) => this.screenToWorld(point),
      sticks: [
        {
          id: 'move',
          anchor: 'bottom-left',
          offsetX: 120,
          offsetY: -120,
          radius: 84,
          knobRadius: 36,
          actions: {
            left: 'turnLeft',
            right: 'turnRight',
            up: 'thrust',
          },
        },
      ],
      buttons: [
        {
          id: 'fire',
          action: 'fire',
          anchor: 'bottom-right',
          offsetX: -120,
          offsetY: -120,
          radius: 44,
          label: 'Fire',
        },
        {
          id: 'shield',
          action: 'shield',
          anchor: 'bottom-right',
          offsetX: -210,
          offsetY: -170,
          radius: 36,
          label: 'Shield',
        },
      ],
      labelFont: '12px "Space Grotesk", sans-serif',
      scaleProvider: () => Math.max(1, 1 / this.renderScale),
    });

    this.addUILayer(this.touchControls);
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
    setSeed(this.seed);
    this.enemySpawnPlan = [];
    this.enemySpawnPlanIndex = 0;
    this.asteroidSpawnPlan = [];
    this.asteroidSpawnPlanIndex = 0;
    this.lives = 3;
    this.shieldEnergy = 1;
    this.shieldActive = false;
    this.shieldRegenCooldown = 0;
    this.respawnTimer = 0;
    this.asteroids = [];
    this.enemies = [];
    this.missiles = [];
    this.boss = undefined;
    this.bossMusicActive = false;
    this.playerDeathExploded = false;
    this.entityManager.clear();
    this.camera.zoom = this.maxZoom;

    this.particles.clear();
    this.addEntity(this.particles);
    this.scoreSystem.reset();

    const spawn = this.getSafeSpawnPosition();
    this.player = new Player(
      spawn,
      new PlayerController(this.input),
      this.shipSprite,
      this.shipSpriteRect,
    );
    this.addEntity(this.player);

    this.waveSystem.reset();

    // Apply test wave if configured
    if (this.testWave > 1) {
      this.waveSystem.setWaveForTesting(this.testWave);
      console.log(`TEST MODE: Starting at wave ${this.testWave}${this.testWave % 5 === 0 ? ' (BOSS WAVE)' : ''}`);
    } else if (this.bossTestEnabled) {
      // Legacy support for bossTest flag
      this.waveSystem.setWaveForTesting(5);
      console.log('TEST MODE: Starting at wave 5 (BOSS WAVE)');
    }
  }

  private makeBgTransparent(source: HTMLImageElement, threshold: number): HTMLImageElement {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;

    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const getPixel = (x: number, y: number) => {
      const idx = (y * canvas.width + x) * 4;
      return [data[idx], data[idx + 1], data[idx + 2]] as const;
    };

    const corners = [
      getPixel(0, 0),
      getPixel(canvas.width - 1, 0),
      getPixel(0, canvas.height - 1),
      getPixel(canvas.width - 1, canvas.height - 1),
    ];

    const bg = corners.reduce(
      (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]] as [number, number, number],
      [0, 0, 0]
    );
    const bgColor = [bg[0] / corners.length, bg[1] / corners.length, bg[2] / corners.length];
    const t = Math.max(0, Math.min(255, threshold));

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (
        Math.abs(r - bgColor[0]) <= t &&
        Math.abs(g - bgColor[1]) <= t &&
        Math.abs(b - bgColor[2]) <= t
      ) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    return img;
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

  private spawnBoss(wave: number): void {
    const isFinalBoss = wave >= 25;
    const bossIndex = Math.min(4, Math.max(1, Math.floor(wave / 5))) - 1;
    const bossTier = isFinalBoss ? 5 : bossIndex;
    const sprite = isFinalBoss ? this.finalBossSprite : this.bossSprites[bossIndex];
    if (!sprite) return;

    // Clear asteroids for boss fight
    if (this.asteroids.length > 0) {
      this.asteroids.forEach((asteroid) => {
        asteroid.alive = false;
      });
      this.asteroids = [];
    }

    // Create boss configuration based on wave
    const bossConfig = this.createBossConfig(wave, bossTier, sprite);

    // Create the new BossV2 instance
    const viewBounds = this.getCameraViewBounds();
    const bossV2 = new BossV2(
      bossConfig,
      { x: viewBounds.x + viewBounds.w / 2, y: viewBounds.y - 120 },
      () => this.player.position,
      (pos, angle, type) => {
        if (type === "missile") {
          this.spawnBossMissile(pos, angle);
        } else {
          this.spawnEnemyBullet(pos, angle, 0);
        }
      },
      {
        isTargetInvulnerable: () => this.player?.isInvulnerable() ?? false,
        getViewBounds: () => this.getCameraViewBounds(),
        onSpawnMinion: (pos) => {
          // Spawn a scout enemy as minion
          const enemy = new Enemy(
            pos,
            () => this.player.position,
            (pos, angle) => this.spawnEnemyBullet(pos, angle, 0),
            this.enemySprite,
            this.enemySpriteRect,
            (pos) => this.events.emit('enemy:destroyed', { position: pos }),
            {
              behavior: 'scout',
              waveNumber: wave,
              getViewBounds: () => this.getCameraViewBounds(160),
              getAvoidTargets: () => this.asteroids.map((a) => a.position),
              getTargetVelocity: () => this.player.getVelocity(),
              getGroupTargets: (): Enemy[] => this.enemies,
            },
          );
          this.addEnemy(enemy);
        },
        onHit: (pos, healthRatio) => {
          this.events.emit('boss:hit', { position: pos, healthRatio });
        },
        onPhaseChange: (phase, phaseName) => {
          console.log(`Boss entered phase ${phase + 1}: ${phaseName}`);
        },
        onDestroyed: (pos) => {
          this.events.emit('boss:destroyed', { position: pos });
          this.waveSystem.onBossDefeated();
        },
        onDeathBurst: (pos) => {
          this.events.emit('boss:deathBurst', { position: pos });
        },
        onDeathSmoke: (pos, alpha) => {
          this.events.emit('boss:deathSmoke', { position: pos, alpha });
        },
      }
    );

    this.boss = bossV2 as any; // Temporary cast to maintain compatibility
    this.addEntity(bossV2);
  }

  private createBossConfig(wave: number, tier: number, sprite: HTMLImageElement): BossConfig {
    const baseHealth = 12 + Math.floor(wave / 2) * 2;

    // Create different boss configurations based on tier
    switch (tier) {
      case 0: // Wave 5 - The Guardian
        return {
          name: "The Guardian",
          tier: 0,
          maxHealth: baseHealth,
          radius: 70,
          sprite,
          phases: [
            {
              healthThreshold: 1.0,
              name: "Defensive",
              attacks: [
                { type: "laser", interval: 3.0, count: 1 }
              ],
              movementPattern: { type: "patrol", amplitude: 200, speed: 0.6 }
            },
            {
              healthThreshold: 0.75,
              name: "Alert",
              attacks: [
                { type: "laser", interval: 2.5, count: 2, spread: 0.2 },
                { type: "burst", interval: 8.0, bullets: 8 }
              ],
              movementPattern: { type: "patrol", amplitude: 250, speed: 0.8 }
            },
            {
              healthThreshold: 0.4,
              name: "Desperate",
              attacks: [
                { type: "laser", interval: 2.0, count: 3, spread: 0.3 },
                { type: "burst", interval: 5.0, bullets: 12 },
                { type: "wave", interval: 7.0, width: 150, speed: 200 }
              ],
              movementPattern: { type: "strafe", amplitude: 280, speed: 1.0, verticalAmplitude: 60 }
            }
          ]
        };

      case 1: // Wave 10 - The Hunter
        return {
          name: "The Hunter",
          tier: 1,
          maxHealth: baseHealth,
          radius: 65,
          sprite,
          phases: [
            {
              healthThreshold: 1.0,
              name: "Stalking",
              attacks: [
                { type: "laser", interval: 2.5, count: 2, spread: 0.15 },
                { type: "missile", interval: 4.0, count: 1 }
              ],
              movementPattern: { type: "strafe", amplitude: 300, speed: 0.9, verticalAmplitude: 80 }
            },
            {
              healthThreshold: 0.6,
              name: "Pursuing",
              attacks: [
                { type: "laser", interval: 2.0, count: 3, spread: 0.25 },
                { type: "missile", interval: 3.0, count: 2 },
                { type: "burst", interval: 5.0, bullets: 8 }
              ],
              movementPattern: { type: "aggressive", speed: 100, dodgeRadius: 200 }
            },
            {
              healthThreshold: 0.3,
              name: "Frenzy",
              attacks: [
                { type: "spiral", interval: 0.1, arms: 3, rotationSpeed: 0.1 },
                { type: "missile", interval: 2.0, count: 3 },
                { type: "burst", interval: 4.0, bullets: 16 }
              ],
              movementPattern: { type: "dash", dashSpeed: 180, dashDuration: 1.0, dashCooldown: 3.5, chaseSpeed: 90 }
            }
          ]
        };

      case 2: // Wave 15 - The Destroyer
        return {
          name: "The Destroyer",
          tier: 2,
          maxHealth: baseHealth + 10,
          radius: 75,
          sprite,
          phases: [
            {
              healthThreshold: 1.0,
              name: "Warming Up",
              attacks: [
                { type: "laser", interval: 2.2, count: 2, spread: 0.2 },
                { type: "missile", interval: 3.5, count: 2 },
                { type: "wave", interval: 6.0, width: 200, speed: 250 }
              ],
              movementPattern: { type: "orbit", radius: 240, speed: 1.2 }
            },
            {
              healthThreshold: 0.7,
              name: "Destruction Mode",
              attacks: [
                { type: "beam", chargeTime: 2.0, duration: 2.0, sweepAngle: 0.5, interval: 8.0 },
                { type: "laser", interval: 1.8, count: 4, spread: 0.3 },
                { type: "missile", interval: 2.5, count: 3 }
              ],
              movementPattern: { type: "defensive", retreatDistance: 300, strafeSpeed: 80 }
            },
            {
              healthThreshold: 0.35,
              name: "Overload",
              attacks: [
                { type: "beam", chargeTime: 1.5, duration: 3.0, sweepAngle: 1.0, interval: 6.0 },
                { type: "shockwave", interval: 5.0, rings: 3 },
                { type: "spiral", interval: 0.08, arms: 4, rotationSpeed: 0.15 },
                { type: "minions", interval: 10.0, count: 3 }
              ],
              movementPattern: { type: "spiral", radius: 200, speed: 1.0, expansion: 100 }
            }
          ]
        };

      case 3: // Wave 20 - The Vanguard
        return {
          name: "The Vanguard",
          tier: 3,
          maxHealth: baseHealth + 15,
          radius: 70,
          sprite,
          phases: [
            {
              healthThreshold: 1.0,
              name: "Tactical",
              attacks: [
                { type: "laser", interval: 2.0, count: 3, spread: 0.2 },
                { type: "missile", interval: 3.0, count: 2 },
                { type: "minions", interval: 8.0, count: 2 }
              ],
              movementPattern: { type: "teleport", interval: 4.0, telegraphTime: 1.0 }
            },
            {
              healthThreshold: 0.65,
              name: "Blitz",
              attacks: [
                { type: "laser", interval: 1.5, count: 5, spread: 0.4 },
                { type: "missile", interval: 2.0, count: 4 },
                { type: "burst", interval: 4.0, bullets: 20 },
                { type: "minions", interval: 8.0, count: 2 }
              ],
              movementPattern: { type: "aggressive", speed: 120, dodgeRadius: 180 }
            },
            {
              healthThreshold: 0.3,
              name: "Last Stand",
              attacks: [
                { type: "beam", chargeTime: 1.0, duration: 2.0, sweepAngle: 0.8, interval: 5.0 },
                { type: "shockwave", interval: 4.0, rings: 2 },
                { type: "spiral", interval: 0.06, arms: 6, rotationSpeed: 0.2 },
                { type: "wave", interval: 3.0, width: 300, speed: 300 }
              ],
              movementPattern: { type: "dash", dashSpeed: 200, dashDuration: 1.1, dashCooldown: 3.0, chaseSpeed: 100 }
            }
          ]
        };

      default: // Wave 25+ - The Overlord (Final Boss)
        return {
          name: "The Overlord",
          tier: 5,
          maxHealth: 80,
          radius: 85,
          sprite,
          phases: [
            {
              healthThreshold: 1.0,
              name: "Awakening",
              attacks: [
                { type: "laser", interval: 1.8, count: 4, spread: 0.25 },
                { type: "missile", interval: 2.5, count: 3 },
                { type: "wave", interval: 5.0, width: 250, speed: 280 }
              ],
              movementPattern: { type: "patrol", amplitude: 320, speed: 0.9 },
              color: "#ff0000"
            },
            {
              healthThreshold: 0.75,
              name: "Unleashed",
              attacks: [
                { type: "beam", chargeTime: 2.0, duration: 2.5, sweepAngle: 0.6, interval: 7.0 },
                { type: "laser", interval: 1.5, count: 5, spread: 0.35 },
                { type: "missile", interval: 2.0, count: 4 },
                { type: "burst", interval: 5.0, bullets: 24 }
              ],
              movementPattern: { type: "teleport", interval: 3.5, telegraphTime: 0.8 },
              color: "#ff00ff"
            },
            {
              healthThreshold: 0.5,
              name: "Apocalypse",
              attacks: [
                { type: "beam", chargeTime: 1.5, duration: 3.0, sweepAngle: 1.2, interval: 6.0 },
                { type: "spiral", interval: 0.05, arms: 8, rotationSpeed: 0.25 },
                { type: "shockwave", interval: 4.0, rings: 4 },
                { type: "minions", interval: 7.0, count: 4 },
                { type: "missile", interval: 1.5, count: 5 }
              ],
              movementPattern: { type: "aggressive", speed: 140, dodgeRadius: 160 },
              color: "#ffff00"
            },
            {
              healthThreshold: 0.25,
              name: "Desperation",
              attacks: [
                { type: "beam", chargeTime: 1.0, duration: 4.0, sweepAngle: 2.0, interval: 5.0 },
                { type: "spiral", interval: 0.03, arms: 12, rotationSpeed: 0.3 },
                { type: "burst", interval: 2.0, bullets: 32 },
                { type: "wave", interval: 2.0, width: 400, speed: 350 },
                { type: "shockwave", interval: 3.0, rings: 5 },
                { type: "minions", interval: 5.0, count: 6 }
              ],
              movementPattern: { type: "spiral", radius: 250, speed: 1.5, expansion: 150 },
              color: "#00ffff"
            }
          ]
        };
    }
  }

  private spawnEnemyAtRandom(): void {
    const wave = this.waveSystem?.currentWave ?? 1;
    const enemyTypes = this.getEnemyTypesForWave(wave);
    const plan = this.enemySpawnPlan[this.enemySpawnPlanIndex++];
    const spawn = plan
      ? { x: plan.x, y: plan.y }
      : this.getPlannedSpawnPosition(120, this.minEnemySpawnDistance);

    // No enemies available for this wave
    if (enemyTypes.length === 0) return;

    // Special spawn for swarm groups
    const type = enemyTypes[Math.floor(random() * enemyTypes.length)];
    if (type.behavior === 'swarm' && random() < 0.7) {
      this.spawnSwarmGroup(spawn, wave);
      return;
    }

    const x = spawn.x;
    const y = spawn.y;

    const enemy: Enemy = new Enemy(
      { x, y },
      () => this.player.position,
      (pos, angle) => this.spawnEnemyBullet(pos, angle, 0),
      type.sprite,
      type.spriteRect,
      (pos) => this.events.emit('enemy:destroyed', { position: pos }),
      {
        behavior: type.behavior,
        waveNumber: wave,
        getViewBounds: () => this.getCameraViewBounds(160),
        getAvoidTargets: () => this.asteroids.map((a) => a.position),
        getTargetVelocity: () => this.player.getVelocity(),
        getGroupTargets: (): Enemy[] => this.enemies.filter((e: Enemy) => e !== enemy),
      },
    );
    this.addEnemy(enemy);

    // Enemy spawn effect is handled in Enemy class with scale/fade animation
  }

  private spawnSwarmGroup(spawn: Vec2, wave: number): void {
    const groupSize = 3 + Math.floor(random() * 3); // 3-5 swarm units
    const formation = random() * Math.PI * 2;

    for (let i = 0; i < groupSize; i++) {
      const angle = formation + (i / groupSize) * Math.PI * 2;
      const radius = 30;
      const x = spawn.x + Math.cos(angle) * radius;
      const y = spawn.y + Math.sin(angle) * radius;

      const enemy: Enemy = new Enemy(
        { x, y },
        () => this.player.position,
        (pos, angle) => this.spawnEnemyBullet(pos, angle, 0),
        this.enemy2Sprite,
        this.enemy2SpriteRect3,
        (pos) => this.events.emit('enemy:destroyed', { position: pos }),
        {
          behavior: 'swarm',
          waveNumber: wave,
          getViewBounds: () => this.getCameraViewBounds(160),
          getAvoidTargets: () => this.asteroids.map((a) => a.position),
          getTargetVelocity: () => this.player.getVelocity(),
          getGroupTargets: (): Enemy[] => this.enemies,
        },
      );
      this.addEnemy(enemy);
    }
  }

  private getEnemyTypesForWave(wave: number) {
    // Progressive enemy introduction - each wave unlocks new enemy types
    const allTypes = [
      {
        behavior: 'scout' as const,
        spriteRect: this.enemySpriteRect,
        sprite: this.enemySprite,
        minWave: 1,
        weight: 3, // How likely to spawn
      },
      {
        behavior: 'hunter' as const,
        spriteRect: this.enemySpriteRectStrafe,
        sprite: this.enemySprite,
        minWave: 2,
        weight: 2,
      },
      {
        behavior: 'guardian' as const,
        spriteRect: this.enemySpriteRectDasher,
        sprite: this.enemySprite,
        minWave: 3,
        weight: 2,
      },
      {
        behavior: 'interceptor' as const,
        spriteRect: this.enemySpriteRectOrbiter,
        sprite: this.enemySprite,
        minWave: 4,
        weight: 2,
      },
      {
        behavior: 'bomber' as const,
        spriteRect: this.enemy2SpriteRect1,
        sprite: this.enemy2Sprite,
        minWave: 5,
        weight: 1,
      },
      {
        behavior: 'sniper' as const,
        spriteRect: this.enemy2SpriteRect2,
        sprite: this.enemy2Sprite,
        minWave: 6,
        weight: 1,
      },
      {
        behavior: 'swarm' as const,
        spriteRect: this.enemy2SpriteRect3,
        sprite: this.enemy2Sprite,
        minWave: 7,
        weight: 4, // Spawns in groups
      },
      {
        behavior: 'elite' as const,
        spriteRect: this.enemy2SpriteRect4,
        sprite: this.enemy2Sprite,
        minWave: 8,
        weight: 1,
      },
      {
        behavior: 'assassin' as const,
        spriteRect: this.enemy2SpriteRect5,
        sprite: this.enemy2Sprite,
        minWave: 10,
        weight: 1,
      },
      {
        behavior: 'commander' as const,
        spriteRect: this.enemy2SpriteRect6,
        sprite: this.enemy2Sprite,
        minWave: 12,
        weight: 1,
      },
    ];

    // Filter available types based on wave
    const availableTypes = allTypes.filter(type => wave >= type.minWave);

    // Build weighted array for random selection
    const weightedTypes: typeof allTypes = [];
    for (const type of availableTypes) {
      for (let i = 0; i < type.weight; i++) {
        weightedTypes.push(type);
      }
    }

    return weightedTypes;
  }


  private spawnAsteroidAtRandom(size: AsteroidSize): void {
    const plan = this.asteroidSpawnPlan[this.asteroidSpawnPlanIndex++];
    const spawn = plan
      ? { x: plan.x, y: plan.y }
      : this.getPlannedSpawnPosition(160, 240);
    const x = spawn.x;
    const y = spawn.y;
    this.addAsteroid(new Asteroid({ x, y }, size, this.onAsteroidDestroyed, this.asteroidSprite, this.asteroidRects));
  }

  private buildEnemySpawnPlan(enemyCount: number, _wave: number): void {
    this.enemySpawnPlan = [];
    this.enemySpawnPlanIndex = 0;

    for (let i = 0; i < enemyCount; i += 1) {
      const spawn = this.getPlannedSpawnPosition(120, this.minEnemySpawnDistance);
      this.enemySpawnPlan.push({ kind: 'single', x: spawn.x, y: spawn.y, typeIndex: 0 });
    }
  }

  private buildAsteroidSpawnPlan(asteroidCount: number): void {
    this.asteroidSpawnPlan = [];
    this.asteroidSpawnPlanIndex = 0;
    for (let i = 0; i < asteroidCount; i += 1) {
      const spawn = this.getPlannedSpawnPosition(160, 240);
      this.asteroidSpawnPlan.push(spawn);
    }
  }

  private getPlannedSpawnPosition(margin: number, minDistance: number): { x: number; y: number } {
    let x = margin + random() * (this.worldSize.x - margin * 2);
    let y = margin + random() * (this.worldSize.y - margin * 2);
    const playerPos = this.player?.position ?? { x: this.worldSize.x / 2, y: this.worldSize.y / 2 };
    for (let i = 0; i < 10; i++) {
      x = margin + random() * (this.worldSize.x - margin * 2);
      y = margin + random() * (this.worldSize.y - margin * 2);
      const dx = x - playerPos.x;
      const dy = y - playerPos.y;
      if (Math.hypot(dx, dy) >= minDistance) {
        break;
      }
    }
    return { x, y };
  }

  private getSafeSpawnPosition(): Vec2 {
    const margin = 200;
    let best: Vec2 = { x: this.worldSize.x / 2, y: this.worldSize.y / 2 };
    for (let i = 0; i < 20; i++) {
      const x = margin + random() * (this.worldSize.x - margin * 2);
      const y = margin + random() * (this.worldSize.y - margin * 2);
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


  private spawnEnemyBullet(position: Vec2, angle: number, projectileIndex: number = 0): void {
    const sprite = this.projectileSprite;
    const rect = sprite
      ? this.enemyProjectileRects[projectileIndex % this.enemyProjectileRects.length]
      : undefined;
    this.addEntity(new EnemyBullet(position, angle, 260, sprite, rect, 20));
    this.events.emit('shot:enemy', { position, angle });
  }

  private spawnBossMissile(position: Vec2, angle: number): void {
    const sprite = this.projectileSprite;
    const rect = sprite
      ? this.missileRects[Math.floor(random() * this.missileRects.length)]
      : undefined;
    const missile = new HomingMissile(
      position,
      () => this.player.position,
      sprite,
      rect,
      240,
      2.6,
      22,
      6,
      (pos) => this.events.emit('missile:destroyed', { position: pos }),
      (pos, angle) => this.events.emit('missile:thrust', { position: pos, angle })
    );
    this.missiles.push(missile);
    this.addEntity(missile);
    this.events.emit('shot:enemy', { position, angle });
  }


  private onAsteroidDestroyed = (asteroid: Asteroid): void => {
    this.events.emit('asteroid:destroyed', { asteroid });
  };


  protected override canTogglePause(): boolean {
    return false;
  }

  protected override onPause(): void {
    this.hudSystem.setPauseVisible(true);
  }

  protected override onResume(): void {
    this.hudSystem.setPauseVisible(false);
  }

  /**
   * Pre-cache all enemy and boss flash sprites for mobile performance
   * This eliminates canvas creation during gameplay
   */
  private preCacheFlashSprites(): void {
    const flashCache = SpriteFlashCache.getInstance();
    const levels = 5; // Number of intensity levels for smooth animation

    // Pre-cache enemy 1 sprites
    if (this.enemySprite) {
      flashCache.preRenderFlashLevels('enemy_scout', this.enemySprite, this.enemySpriteRect, levels);
      flashCache.preRenderFlashLevels('enemy_hunter', this.enemySprite, this.enemySpriteRectStrafe, levels);
      flashCache.preRenderFlashLevels('enemy_guardian', this.enemySprite, this.enemySpriteRectDasher, levels);
      flashCache.preRenderFlashLevels('enemy_interceptor', this.enemySprite, this.enemySpriteRectOrbiter, levels);
    }

    // Pre-cache enemy 2 sprites
    if (this.enemy2Sprite) {
      flashCache.preRenderFlashLevels('enemy_bomber', this.enemy2Sprite, this.enemy2SpriteRect1, levels);
      flashCache.preRenderFlashLevels('enemy_sniper', this.enemy2Sprite, this.enemy2SpriteRect2, levels);
      flashCache.preRenderFlashLevels('enemy_swarm', this.enemy2Sprite, this.enemy2SpriteRect3, levels);
      flashCache.preRenderFlashLevels('enemy_elite', this.enemy2Sprite, this.enemy2SpriteRect4, levels);
      flashCache.preRenderFlashLevels('enemy_assassin', this.enemy2Sprite, this.enemy2SpriteRect5, levels);
      flashCache.preRenderFlashLevels('enemy_commander', this.enemy2Sprite, this.enemy2SpriteRect6, levels);
    }

    // Pre-cache boss sprites
    this.bossSprites.forEach((sprite, index) => {
      if (sprite) {
        flashCache.preRenderFlashLevels(`boss_${index}`, sprite, undefined, levels);
      }
    });

    // Pre-cache final boss
    if (this.finalBossSprite) {
      flashCache.preRenderFlashLevels('boss_final', this.finalBossSprite, undefined, levels);
    }

    console.log(`Pre-cached ${flashCache.getCacheSize()} flash sprites for optimal mobile performance`);
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

const engine = new CH17();

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
      baseSize: 540,
    },
  },
});

engine.start();
