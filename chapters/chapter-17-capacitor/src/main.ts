import './style.css'
import { AssetManager, AudioManager, Camera, Engine, EventBus, ParticleSystem, StateMachine, SystemManager, easeInOutSine } from '@course/lib';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { GameCenterManager } from './GameCenterManager';
import { SettingsManager } from './SettingsManager';
import { ThemeManager } from './ThemeManager';
import { BossFactory } from './BossFactory';
import { SpawnManager } from './SpawnManager';
import type { GameState, Vec2 } from '@course/lib';
import { Player } from './Player';
import { PlayerController } from './PlayerController';
import { Asteroid, type AsteroidSize } from './Asteroid';
import { Bullet } from './Bullet';
import { Enemy, type EnemyBehavior } from './Enemy';
import { BossV2 } from './BossV2';
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
import { SpriteRegistry } from './SpriteRegistry';
import { BackgroundRenderer } from './BackgroundRenderer';
import { ShipShowcase } from './ShipShowcase';
import { DynamicTouchControls } from './DynamicTouchControls';
import { IAPManager } from './IAPManager';
import { MenuUI, type MenuUIState } from './ui/MenuUI';

class CH17 extends Engine {
  private assets = new AssetManager();
  private audio = new AudioManager();
  private camera = new Camera();
  private particles = new ParticleSystem();
  private events = new EventBus<GameEvents>();
  private sprites = new SpriteRegistry();
  private worldSize: Vec2 = { x: GAME_CONFIG.world.width, y: GAME_CONFIG.world.height };
  private backgroundRenderer = new BackgroundRenderer();
  private systems = new SystemManager();
  private waveSystem!: WaveSystem;
  private scoreSystem!: ScoreSystem;
  private effectsSystem!: EffectsSystem;
  private progress = 0;
  private shipSprite?: HTMLImageElement;
  private enemySprite?: HTMLImageElement;
  private enemy2Sprite?: HTMLImageElement;
  private bossSprites: Array<HTMLImageElement | undefined> = [];
  private finalBossSprite?: HTMLImageElement;
  private projectileSprite?: HTMLImageElement;
  private asteroidSprite?: HTMLImageElement;
  private gearIcon?: HTMLImageElement;
  private closeIcon?: HTMLImageElement;
  private leaderboardIcon?: HTMLImageElement;
  private cartIcon?: HTMLImageElement;
  private touchControls?: DynamicTouchControls;

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
  private boss?: BossV2;
  private asteroidPositionsCache: Vec2[] = [];
  private asteroidsCacheValid = false;
  private enemySpawnInterval = GAME_CONFIG.enemy.spawnInterval;
  private minEnemySpawnDistance = GAME_CONFIG.enemy.minSpawnDistance;
  private maxEnemyCap = GAME_CONFIG.enemy.maxCap;
  private respawnDelay = GAME_CONFIG.respawn.delay;
  private respawnTimer = 0;
  private playerDeathExploded = false;
  private menuPulseTime = 0;
  private titleAnimTime = 0;
  private shipShowcase = new ShipShowcase();
  private idleTimeInMenu = 0;
  private menuIdleThreshold = 8; // seconds before showing ship showcase
  private stateMachine = new StateMachine<GameState>();
  private themeManager = new ThemeManager();
  private bossFactory = new BossFactory();
  private spawnManager!: SpawnManager;
  private gameOverTime = 0;
  private fontFamily = '"Space Grotesk", sans-serif';
  private minZoom = 1.0;
  private maxZoom = 1.6;
  private speedForMaxZoomOut = 180;
  private cameraFollowLerp = 4.5;
  private seed: number = GAME_CONFIG.seed;
  private bossTestEnabled = false;
  private testWave = 0;
  private thrusterLoopActive = false;
  private waveOverlayTime = 0;
  private bossMusicActive = false;
  private menuUI!: MenuUI;
  private touchLeftRegionRatio = 0.52;
  private touchActionRegionRatio = 0.33;
  private touchHintActive = false;
  private touchHintTimer = 0;
  private touchHintDuration = 5;
  private settingsManager = new SettingsManager();
  private gameCenterManager = new GameCenterManager(GAME_CONFIG.gameCenter?.leaderboardId ?? '');
  private iapManager = new IAPManager(GAME_CONFIG.iap.fullGameProductId);
  private iapMessageTimer = 0;
  private sfxPreviewCooldown = 0.25;
  private lastSfxPreviewAt = 0;
  private settingsSuppressStart = 0;
  private pendingAudioResume = false;
  private onPointerDown: (e: PointerEvent) => void = () => this.input.setActionState('confirm', true);
  private onPointerMove: (e: PointerEvent) => void = (_e) => {};
  private onPointerUp: (e: PointerEvent) => void = () => this.input.setActionState('confirm', false);
  private onTouchStart: (e: TouchEvent) => void = () => this.input.setActionState('confirm', true);
  private onTouchMove: (e: TouchEvent) => void = () => {};
  private onTouchEnd: (e: TouchEvent) => void = () => this.input.setActionState('confirm', false);

  protected override get screenSize(): Vec2 {
    return this.worldSize;
  }

  protected override onInit(): void {
    const seedParam = new URLSearchParams(window.location.search).get('seed');
    const seed = seedParam ? Number(seedParam) : GAME_CONFIG.seed;
    this.seed = Number.isFinite(seed) ? seed : GAME_CONFIG.seed;
    setSeed(this.seed);
    this.backgroundRenderer.init(this.worldSize.x, this.worldSize.y);
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
    this.setupAppLifecycle();
    this.settingsManager.setCallbacks({
      onMusicVolumeChange: (volume) => this.audio.setMusicVolume(volume),
      onSfxVolumeChange: (volume) => this.audio.setSfxVolume(volume),
      onTouchOptionsChange: (handedness, fireSide) => {
        this.touchControls?.setHandedness(handedness);
        this.touchControls?.setFireSide(fireSide);
      },
    });
    this.menuUI = new MenuUI({
      onVolumeChange: (kind, value) => this.handleVolumeChange(kind, value),
      onTouchOptionsChange: (handedness, fireSide) => {
        this.settingsManager.setTouchOptions(handedness, fireSide);
      },
      onOpenLeaderboard: () => {
        void this.handleLeaderboardPress();
      },
      onPurchase: () => {
        void this.iapManager.purchase();
      },
      onRestore: () => {
        void this.iapManager.restore();
      },
      onSuppressStart: () => {
        this.settingsSuppressStart = 0.25;
      },
    });
    void this.settingsManager.load();
    // Delay IAP initialization to ensure CdvPurchase is fully loaded
    setTimeout(() => {
      console.log('[Main] Initializing IAP Manager...');
      this.iapManager.init((state) => {
        console.log('[Main] IAP state updated:', state);
        // Reset message timer when new messages arrive
        if (state.lastError || state.lastSuccess) {
          this.iapMessageTimer = 5.0;
        }
      });
    }, 1000);
    this.setUiUpdateInterval(100);
    this.setupSystems();
    this.setupEvents();
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
    this.onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
    this.onPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
    this.onPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
    this.onTouchStart = (e: TouchEvent) => this.handleTouchStart(e);
    this.onTouchMove = (e: TouchEvent) => this.handleTouchMove(e);
    this.onTouchEnd = (e: TouchEvent) => this.handleTouchEnd(e);

    this.ctx.canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    this.ctx.canvas.addEventListener('pointermove', this.onPointerMove, { passive: false });
    this.ctx.canvas.addEventListener('pointerup', this.onPointerUp, { passive: true });
    this.ctx.canvas.addEventListener('pointercancel', this.onPointerUp, { passive: true });
    this.ctx.canvas.addEventListener('pointerout', this.onPointerUp, { passive: true });
    this.ctx.canvas.addEventListener('pointerleave', this.onPointerUp, { passive: true });
    this.ctx.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.ctx.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.ctx.canvas.addEventListener('touchend', this.onTouchEnd, { passive: true });
    this.ctx.canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp, { passive: true });
    window.addEventListener('pointercancel', this.onPointerUp, { passive: true });
    window.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this.onTouchEnd, { passive: true });
  }

  private setupAppLifecycle(): void {
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
        if (isActive) {
          this.handleAppResume();
        } else {
          this.handleAppPause();
        }
      });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleAppPause();
      } else {
        this.handleAppResume();
      }
    });

    window.addEventListener('blur', () => this.handleAppPause());
    window.addEventListener('focus', () => this.handleAppResume());
  }

  private handleAppPause(): void {
    this.stopThrusterAudio();
    this.audio.stopMusic();
    this.pendingAudioResume = true;
  }

  private handleAppResume(): void {
    this.pendingAudioResume = true;
    this.tryResumeAudioFromInteraction();
  }

  private tryResumeAudioFromInteraction(): void {
    if (!this.pendingAudioResume) return;
    void this.audio.resume().then(() => {
      this.audio.setSfxVolume(this.settingsManager.sfxVolume);
      this.resumeMusicForState();
      this.pendingAudioResume = false;
    });
  }

  private resumeMusicForState(): void {
    const state = this.stateMachine.currentState?.name;
    if (!state) return;

    if (state === 'menu') {
      this.audio.playMusic('doomed', this.settingsManager.musicVolume);
      return;
    }

    const bossActive = this.waveSystem?.isBossActive ?? false;
    const track = bossActive ? 'doomed' : 'flags';
    this.audio.playMusic(track, this.settingsManager.musicVolume);
  }

  protected override update(deltaTime: number): void {
    this.stateMachine.update(deltaTime);

    // Update IAP message timer
    if (this.iapMessageTimer > 0) {
      this.iapMessageTimer = Math.max(0, this.iapMessageTimer - deltaTime);
    }
  }

  protected override render(): void {
    this.stateMachine.render();
  }

  public updatePlaying(deltaTime: number): void {
    if (this.touchHintActive) {
      this.touchHintTimer = Math.max(0, this.touchHintTimer - deltaTime);
      if (this.touchHintTimer === 0) {
        this.touchHintActive = false;
      }
    }

    this.backgroundRenderer.updateBackgroundTime(deltaTime);
    this.themeManager.update(deltaTime);
    const bossActive = this.waveSystem.isBossActive;
    if (bossActive !== this.bossMusicActive) {
      this.bossMusicActive = bossActive;
      this.audio.playMusic(bossActive ? 'doomed' : 'flags', this.settingsManager.musicVolume);
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
        if (this.input.isActionDown('shield')) {
          this.input.setActionState('shield', false);
          this.touchControls?.forceShieldOff();
        }
      }
    } else {
      if (this.shieldRegenCooldown > 0) {
        this.shieldRegenCooldown = Math.max(0, this.shieldRegenCooldown - deltaTime);
      } else {
        this.shieldEnergy = Math.min(1, this.shieldEnergy + this.shieldRegenRate * deltaTime);
      }
    }
    this.player.setShieldActive(this.shieldActive);
    this.player.setShieldEnergy(this.shieldEnergy);

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
    const prevCount = this.asteroids.length;
    this.asteroids = this.asteroids.filter((asteroid) => {
      if (!asteroid.alive) {
        spawned.push(...asteroid.split());
        return false;
      }
      return true;
    });
    if (this.asteroids.length !== prevCount) {
      this.invalidateAsteroidCache();
    }

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
    const theme = this.themeManager.getBlendedTheme(this.waveSystem.currentWave);
    this.backgroundRenderer.setStarTint(theme.starTint);
    this.backgroundRenderer.setNebulaAlphaScale(theme.nebulaAlphaScale);
    const themeOverlay = `rgba(${theme.overlay[0]}, ${theme.overlay[1]}, ${theme.overlay[2]}, ${theme.overlay[3].toFixed(3)})`;
    this.ctx.fillStyle = `rgb(${theme.base[0]}, ${theme.base[1]}, ${theme.base[2]})`;
    this.ctx.fillRect(0, 0, this.worldSize.x, this.worldSize.y);
    this.ctx.fillStyle = themeOverlay;
    this.ctx.fillRect(0, 0, this.worldSize.x, this.worldSize.y);
    this.backgroundRenderer.renderNebulae(this.ctx, this.camera.position.x, this.camera.position.y, this.worldSize.x, this.worldSize.y);
    this.backgroundRenderer.renderStars(this.ctx, this.camera.position.x, this.camera.position.y, this.worldSize.x, this.worldSize.y);

    // Render entities - EntityManager now handles render layers natively
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

    if (this.touchHintActive) {
      this.renderTouchControlsOverlay();
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

  private renderTitleBackground(): void {
    const { x: w, y: h } = this.viewportSize;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, w, h);

    this.backgroundRenderer.renderMenuStars(this.ctx, w, h, this.menuPulseTime);
  }

  private renderTitleText(titleOffsetY: number = 0, promptOffsetY: number = 0): void {
    const { x: w, y: h } = this.viewportSize;
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

    const baseY = h / 2 - 28 - titleOffsetY; // Apply title offset
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
    this.ctx.fillText('Press Fire to Start', w / 2, h / 2 + 28 + promptOffsetY); // Apply prompt offset

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
        this.assets.queueImage('gear', '/gear.png');
        this.assets.queueImage('cross', '/cross.png');
        this.assets.queueImage('leaderboard', '/leaderboardsComplex.png');
        this.assets.queueImage('cart', '/shoppingCart.png');
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
              this.assets.getImage('boss1'),
              this.assets.getImage('boss2'),
              this.assets.getImage('boss3'),
              this.assets.getImage('boss4'),
            ];
            this.finalBossSprite = this.assets.getImage('finalboss');
            this.projectileSprite = this.assets.getImage('projectiles');
            this.gearIcon = this.assets.getImage('gear');
            this.closeIcon = this.assets.getImage('cross');
            this.leaderboardIcon = this.assets.getImage('leaderboard');
            this.cartIcon = this.assets.getImage('cart');
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
        this.audio.playMusic('doomed', this.settingsManager.musicVolume);
        this.menuPulseTime = 0;
        this.titleAnimTime = 0;
        this.idleTimeInMenu = 0;
        this.shipShowcase.reset();
        this.menuUI.closeAll();
        this.stopThrusterAudio();
        this.touchControls?.setVisible(false);
        if (this.touchControls) {
          this.setUiPointerEvents(false);
        }
        void this.gameCenterManager.authenticate();
      },
      update: (dt) => {
        this.menuPulseTime += dt;
        this.titleAnimTime += dt;

        if (this.settingsSuppressStart > 0) {
          this.settingsSuppressStart = Math.max(0, this.settingsSuppressStart - dt);
        }

        if (this.menuUI.isBlocking()) {
          return;
        }

        const confirmPressed = this.input.wasActionPressed('confirm');
        const firePressed = this.input.wasActionPressed('fire');
        const anyInput = confirmPressed || firePressed ||
                        this.input.wasActionPressed('left') ||
                        this.input.wasActionPressed('right') ||
                        this.input.wasActionPressed('up') ||
                        this.input.wasActionPressed('down');

        // Start game on confirm/fire
        if ((confirmPressed || firePressed) && this.settingsSuppressStart <= 0) {
          this.resetGame();
          const bossActive = this.waveSystem.isBossActive;
          void this.audio.resume().then(() => {
            this.bossMusicActive = bossActive;
            this.audio.playSound('start', 0.7);
            this.audio.playMusic(bossActive ? 'doomed' : 'flags', this.settingsManager.musicVolume);
          });
          this.stateMachine.set('playing');
          return;
        }

        if (this.shipShowcase.isRunning()) {
          // Update the showcase
          const stillActive = this.shipShowcase.update(dt);

          // Exit showcase on any input
          if (anyInput) {
            this.shipShowcase.stop();
            this.idleTimeInMenu = 0;
          }

          // Reset idle timer when showcase ends naturally
          if (!stillActive) {
            this.idleTimeInMenu = 0;
          }
        } else {
          // Track idle time
          if (anyInput) {
            this.idleTimeInMenu = 0;
          } else {
            this.idleTimeInMenu += dt;
          }

          // Start showcase after idle threshold
          if (this.idleTimeInMenu >= this.menuIdleThreshold) {
            this.shipShowcase.start();
            this.idleTimeInMenu = 0;
          }

        }
      },
      render: () => {
        // Render title background first
        this.renderTitleBackground();

        // Render ship showcase on top if active
        if (this.shipShowcase.isRunning()) {
          this.shipShowcase.render(this.ctx, this.viewportSize.x, this.viewportSize.y, {
            enemy: this.enemySprite ?? null,
            enemy2: this.enemy2Sprite ?? null,
            bosses: this.bossSprites,
            finalBoss: this.finalBossSprite ?? null,
          });
        }

        // Always render title text/prompt on top
        const titleOffset = this.shipShowcase.getTitleOffset();
        const promptOffset = this.shipShowcase.getPromptOffset();
        this.renderTitleText(titleOffset, promptOffset);

        this.menuUI.render(this.ctx, this.getMenuUIState());
      },
    };

    const playingState: GameState = {
      name: 'playing',
      enter: () => {
        this.hudSystem.setHudVisible(true);
        this.hudSystem.setPauseVisible(false);
        const bossActive = this.waveSystem.isBossActive;
        this.bossMusicActive = bossActive;
        this.audio.playMusic(bossActive ? 'doomed' : 'flags', this.settingsManager.musicVolume);
        this.touchControls?.setVisible(true);
        if (this.touchControls) {
          this.setUiPointerEvents(true);
        }
        void this.gameCenterManager.authenticate();
        if (this.isTouchDevice() && this.settingsManager.shouldShowTouchHint() && this.waveSystem.currentWave === 1) {
          this.touchHintActive = true;
          this.touchHintTimer = this.touchHintDuration;
          this.settingsManager.markTouchHintShown();
        }
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
        if (this.touchControls) {
          this.setUiPointerEvents(true);
        }
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
        if (this.touchControls) {
          this.setUiPointerEvents(true);
        }
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
            this.sprites.player.shipLarge,
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
        if (this.touchControls) {
          this.setUiPointerEvents(false);
        }
        void this.submitGameCenterScore();
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
    this.events.on('asteroid:destroyed', ({ asteroid, scored }) => {
      if (scored !== false) {
        this.scoreSystem.onAsteroidDestroyed(asteroid);
      }
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

  private handlePointerDown(event: PointerEvent): void {
    this.tryResumeAudioFromInteraction();
    if (event.currentTarget === window && event.target === this.ctx.canvas) return;
    if (this.stateMachine.currentState?.name === 'menu') {
      const point = this.screenToWorld({ x: event.clientX, y: event.clientY });
      if (this.menuUI.handlePointerDown(point, event.pointerId, this.getMenuUIState())) {
        event.preventDefault();
        return;
      }
    }
    this.input.setActionState('confirm', true);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (this.stateMachine.currentState?.name === 'menu') {
      const point = this.screenToWorld({ x: event.clientX, y: event.clientY });
      this.menuUI.handlePointerMove(point, event.pointerId, this.getMenuUIState());
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    if (this.stateMachine.currentState?.name === 'menu') {
      if (this.menuUI.handlePointerUp(event.pointerId)) {
        event.preventDefault();
        return;
      }
    }
    this.input.setActionState('confirm', false);
  }

  private handleTouchStart(event: TouchEvent): void {
    this.tryResumeAudioFromInteraction();
    if (event.currentTarget === window && event.target === this.ctx.canvas) return;
    if (this.stateMachine.currentState?.name === 'menu') {
      if (this.menuUI.handleTouchStart(event, (point) => this.screenToWorld(point), this.getMenuUIState())) {
        event.preventDefault();
        return;
      }
    }
    this.input.setActionState('confirm', true);
  }

  private handleTouchMove(event: TouchEvent): void {
    if (this.stateMachine.currentState?.name === 'menu') {
      this.menuUI.handleTouchMove(event, (point) => this.screenToWorld(point), this.getMenuUIState());
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (this.stateMachine.currentState?.name === 'menu') {
      if (this.menuUI.handleTouchEnd(event)) {
        event.preventDefault();
        return;
      }
    }
    this.input.setActionState('confirm', false);
  }

  private getMenuUIState(): MenuUIState {
    const gcState = this.gameCenterManager.getState();
    const iapState = this.iapManager.getState();
    const settings = this.settingsManager.getSettings();
    const isIOS = Capacitor.getPlatform() === 'ios';
    return {
      viewport: this.viewportSize,
      fontFamily: this.fontFamily,
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
      touchHandedness: settings.touchHandedness,
      touchFireSide: settings.touchFireSide,
      isIOS,
      iapAvailable: iapState.available,
      iapOwned: iapState.owned,
      iapCanPurchase: iapState.canPurchase ?? false,
      iapPriceLabel: iapState.price ?? '',
      iapTitle: iapState.title ?? '',
      iapIsProcessing: iapState.isProcessing,
      iapLastError: this.iapMessageTimer > 0 ? iapState.lastError : undefined,
      iapLastSuccess: this.iapMessageTimer > 0 ? iapState.lastSuccess : undefined,
      gameCenterAvailable: gcState.available,
      gameCenterAuthenticated: gcState.authenticated,
      isTouchDevice: this.isTouchDevice(),
      gearIcon: this.gearIcon,
      closeIcon: this.closeIcon,
      leaderboardIcon: this.leaderboardIcon,
      cartIcon: this.cartIcon,
    };
  }

  private handleVolumeChange(kind: 'music' | 'sfx', value: number): void {
    if (kind === 'music') {
      this.settingsManager.setMusicVolume(value);
    } else {
      this.settingsManager.setSfxVolume(value);
      const now = performance.now() / 1000;
      if (now - this.lastSfxPreviewAt >= this.sfxPreviewCooldown) {
        this.lastSfxPreviewAt = now;
        this.audio.playSound('start', 0.8);
      }
    }
  }

  private isTouchDevice(): boolean {
    return navigator.maxTouchPoints > 0;
  }

  private renderTouchControlsOverlay(): void {
    const { x: w, y: h } = this.viewportSize;
    const alpha = Math.min(1, this.touchHintTimer / 1.0);

    const stickWidth = w * this.touchLeftRegionRatio;
    const maxActionWidth = Math.max(0, w - stickWidth);
    const actionWidth = Math.min(w * this.touchActionRegionRatio, maxActionWidth);
    const handedness = this.settingsManager.touchHandedness;
    const stickStart = handedness === 'left' ? w - stickWidth : 0;
    const stickEnd = handedness === 'left' ? w : stickWidth;
    const actionStart = handedness === 'left' ? 0 : w - actionWidth;
    const actionEnd = handedness === 'left' ? actionWidth : w;
    const actionMid = actionStart + (actionEnd - actionStart) * 0.5;

    const yLine = h * 0.78;
    const ySwipe = h * 0.62;
    const pad = 24;

    this.ctx.save();
    this.ctx.globalAlpha = 0.85 * alpha;
    this.ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    this.ctx.fillStyle = 'rgba(255,255,255,0.75)';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';

    // Joystick region (double-headed arrow)
    this.drawArrowLine(stickStart + pad, yLine, stickEnd - pad, yLine, true);
    this.ctx.font = `14px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('Joystick', (stickStart + stickEnd) / 2, yLine - 10);

    // Swipe right for shield
    const swipeStart = actionStart + pad;
    const swipeEnd = Math.max(swipeStart + 60, actionEnd - pad);
    this.drawArrowLine(swipeStart, ySwipe, swipeEnd, ySwipe, false);
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('Swipe Right: Shield On/Off', (swipeStart + swipeEnd) / 2, ySwipe - 10);

    // Tap zones for thrust/fire
    const leftTapX = actionStart + (actionMid - actionStart) / 2;
    const rightTapX = actionMid + (actionEnd - actionMid) / 2;
    const fireLeft = this.settingsManager.touchFireSide === 'left';
    const fireX = fireLeft ? leftTapX : rightTapX;
    const thrustX = fireLeft ? rightTapX : leftTapX;

    this.drawTapMarker(fireX, yLine, 'Fire');
    this.drawTapMarker(thrustX, yLine, 'Thrust');

    this.ctx.restore();
  }

  private drawArrowLine(x1: number, y1: number, x2: number, y2: number, bothEnds: boolean): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    const headSize = 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    this.drawArrowHead(x2, y2, angle, headSize);
    if (bothEnds) {
      this.drawArrowHead(x1, y1, angle + Math.PI, headSize);
    }
  }

  private drawArrowHead(x: number, y: number, angle: number, size: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawTapMarker(x: number, y: number, label: string): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 16, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.font = `14px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    const labelY = y - 18;
    const metrics = this.ctx.measureText(label);
    const pad = 6;
    const rectW = metrics.width + pad * 2;
    const rectH = 18;
    this.ctx.fillStyle = 'rgba(0,0,0,0.65)';
    this.drawRoundedRect(this.ctx, x - rectW / 2, labelY - rectH + 2, rectW, rectH, 6);
    this.ctx.fill();
    this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
    this.ctx.fillText(label, x, labelY);
    this.ctx.restore();
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
      spawnEnemy: () => this.spawnEnemyAtRandom(),
      spawnAsteroid: (size) => this.spawnAsteroidAtRandom(size),
      spawnBoss: (wave) => this.spawnBoss(wave),
      onWaveStart: (wave, seed, asteroidCount, enemyCount) => {
        setSeed(seed);
        this.buildAsteroidSpawnPlan(asteroidCount ?? 0);
        this.buildEnemySpawnPlan(enemyCount ?? 0);
        this.themeManager.setWaveTheme(wave);
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

    this.touchControls = new DynamicTouchControls({
      canvas: uiCanvas,
      input: this.input,
      mapPoint: (point) => this.screenToWorld(point),
      deadzone: 0.22,
      alpha: 0.6,
      leftRegionRatio: this.touchLeftRegionRatio,
      actionRegionRatio: this.touchActionRegionRatio,
      stickRadius: 90,
      knobRadius: 38,
      showStickVisuals: false,
      handedness: this.settingsManager.touchHandedness,
      fireSide: this.settingsManager.touchFireSide,
      scaleProvider: () => Math.max(1, 1 / this.renderScale),
    });

    this.addUILayer(this.touchControls);
  }

  private async submitGameCenterScore(): Promise<void> {
    const score = this.scoreSystem.getScore();
    await this.gameCenterManager.submitScore(score);
  }

  private async handleLeaderboardPress(): Promise<void> {
    await this.gameCenterManager.showLeaderboard();
  }

  private updateWorldDuringRespawn(deltaTime: number): void {
    super.update(deltaTime);

    this.systems.update(deltaTime);

    const spawned: Asteroid[] = [];
    const prevCount = this.asteroids.length;
    this.asteroids = this.asteroids.filter((asteroid) => {
      if (!asteroid.alive) {
        spawned.push(...asteroid.split());
        return false;
      }
      return true;
    });
    if (this.asteroids.length !== prevCount) {
      this.invalidateAsteroidCache();
    }

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
    this.spawnManager = new SpawnManager({
      worldSize: this.worldSize,
      getPlayerPosition: () => this.player?.position ?? { x: this.worldSize.x / 2, y: this.worldSize.y / 2 },
      getEnemies: () => this.enemies,
      getAsteroids: () => this.asteroids,
    });
    this.lives = 3;
    this.shieldEnergy = 1;
    this.shieldActive = false;
    this.shieldRegenCooldown = 0;
    this.respawnTimer = 0;
    this.asteroids = [];
    this.invalidateAsteroidCache();
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
      this.sprites.player.shipLarge,
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


  private addAsteroid(asteroid: Asteroid): void {
    this.waveSystem.registerWaveAsteroid();
    this.asteroids.push(asteroid);
    this.addEntity(asteroid);
    this.invalidateAsteroidCache();
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
    this.invalidateAsteroidCache();
    }

    // Create boss configuration based on wave
    const bossConfig = this.bossFactory.createBossConfig(wave, bossTier, sprite);

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
          this.spawnEnemyBullet(pos, angle);
        }
      },
      {
        isTargetInvulnerable: () => this.player?.isInvulnerable() ?? false,
        getViewBounds: () => this.getCameraViewBounds(),
        onSpawnMinion: (pos) => {
          // Spawn a scout enemy as minion
          const enemy = this.createEnemy(pos, 'scout', wave, this.enemySprite, this.sprites.enemies.default);
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

    this.boss = bossV2;
    this.addEntity(bossV2);
  }


  private getAsteroidPositions(): Vec2[] {
    if (!this.asteroidsCacheValid) {
      this.asteroidPositionsCache = this.asteroids.map((a) => a.position);
      this.asteroidsCacheValid = true;
    }
    return this.asteroidPositionsCache;
  }

  private invalidateAsteroidCache(): void {
    this.asteroidsCacheValid = false;
  }

  private createEnemy(
    position: Vec2,
    behavior: EnemyBehavior,
    waveNumber: number,
    sprite?: HTMLImageElement,
    spriteRect?: { x: number; y: number; w: number; h: number }
  ): Enemy {
    const enemy = new Enemy(
      position,
      () => this.player.position,
      (pos, angle) => this.spawnEnemyBullet(pos, angle),
      sprite || this.enemySprite,
      spriteRect || this.sprites.enemies.default,
      (pos) => this.events.emit('enemy:destroyed', { position: pos }),
      {
        behavior,
        waveNumber,
        getViewBounds: () => this.getCameraViewBounds(160),
        getAvoidTargets: () => this.getAsteroidPositions(),
        getTargetVelocity: () => this.player.getVelocity(),
        getGroupTargets: (): Enemy[] => this.enemies.filter((e: Enemy) => e !== enemy),
      },
    );
    return enemy;
  }

  private spawnEnemyAtRandom(): void {
    const wave = this.waveSystem?.currentWave ?? 1;
    const enemyTypes = this.getEnemyTypesForWave(wave);
    const spawn = this.spawnManager.getNextEnemySpawnPosition(this.minEnemySpawnDistance);

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

    const enemy = this.createEnemy({ x, y }, type.behavior as EnemyBehavior, wave, type.sprite, type.spriteRect);
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

      const enemy = this.createEnemy({ x, y }, 'swarm', wave, this.enemy2Sprite, this.sprites.enemies2.type3);
      this.addEnemy(enemy);
    }
  }

  private getEnemyTypesForWave(wave: number) {
    // Progressive enemy introduction - each wave unlocks new enemy types
    const allTypes = [
      {
        behavior: 'scout' as const,
        spriteRect: this.sprites.enemies.default,
        sprite: this.enemySprite,
        minWave: 1,
        weight: 3, // How likely to spawn
      },
      {
        behavior: 'hunter' as const,
        spriteRect: this.sprites.enemies.default,
        sprite: this.enemySprite,
        minWave: 2,
        weight: 2,
      },
      {
        behavior: 'guardian' as const,
        spriteRect: this.sprites.enemies.strafe,
        sprite: this.enemySprite,
        minWave: 3,
        weight: 2,
      },
      {
        behavior: 'interceptor' as const,
        spriteRect: this.sprites.enemies.dasher,
        sprite: this.enemySprite,
        minWave: 4,
        weight: 2,
      },
      {
        behavior: 'bomber' as const,
        spriteRect: this.sprites.enemies.orbiter,
        sprite: this.enemySprite,
        minWave: 5,
        weight: 1,
      },
      {
        behavior: 'sniper' as const,
        spriteRect: this.sprites.enemies2.type1,
        sprite: this.enemy2Sprite,
        minWave: 6,
        weight: 1,
      },
      {
        behavior: 'swarm' as const,
        spriteRect: this.sprites.enemies2.type3,
        sprite: this.enemy2Sprite,
        minWave: 7,
        weight: 4, // Spawns in groups
      },
      {
        behavior: 'elite' as const,
        spriteRect: this.sprites.enemies2.type4,
        sprite: this.enemy2Sprite,
        minWave: 8,
        weight: 1,
      },
      {
        behavior: 'assassin' as const,
        spriteRect: this.sprites.enemies2.type2,
        sprite: this.enemy2Sprite,
        minWave: 10,
        weight: 1,
      },
      {
        behavior: 'commander' as const,
        spriteRect: this.sprites.enemies2.type4,
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
    const spawn = this.spawnManager.getNextAsteroidSpawnPosition();
    this.addAsteroid(new Asteroid(spawn, size, this.onAsteroidDestroyed, this.asteroidSprite, this.sprites.asteroids as any));
  }

  private buildEnemySpawnPlan(enemyCount: number): void {
    this.spawnManager.buildEnemySpawnPlan(enemyCount, this.minEnemySpawnDistance);
  }

  private buildAsteroidSpawnPlan(asteroidCount: number): void {
    this.spawnManager.buildAsteroidSpawnPlan(asteroidCount);
  }

  private getSafeSpawnPosition(): Vec2 {
    return this.spawnManager.getSafeSpawnPosition();
  }


  private resolveEnemyOverlaps(): void {
    // Skip if too few enemies to overlap
    if (this.enemies.length < 2) return;

    // Only check enemies near the camera view for performance
    const viewBounds = this.getCameraViewBounds(100);
    const nearbyEnemies = this.enemies.filter(e =>
      e.position.x >= viewBounds.x - 50 &&
      e.position.x <= viewBounds.x + viewBounds.w + 50 &&
      e.position.y >= viewBounds.y - 50 &&
      e.position.y <= viewBounds.y + viewBounds.h + 50
    );

    // If too many enemies offscreen, skip their collision checks
    if (nearbyEnemies.length < 2) return;

    for (let i = 0; i < nearbyEnemies.length; i++) {
      for (let j = i + 1; j < nearbyEnemies.length; j++) {
        const a = nearbyEnemies[i];
        const b = nearbyEnemies[j];

        // Quick distance check before expensive calculation
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;

        // Early exit if clearly too far apart
        const maxDist = a.radius + b.radius + 4;
        if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist) continue;

        const dist = Math.hypot(dx, dy) || 1;
        if (dist < maxDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          const push = (maxDist - dist) / 2;
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
    const sprite = this.projectileSprite;
    const rect = sprite
      ? this.sprites.projectiles.enemyAlt  // Using the second bottom sprite now!
      : undefined;
    this.addEntity(new EnemyBullet(position, angle, 260, sprite, rect, 20));
    this.events.emit('shot:enemy', { position, angle });
  }

  private spawnBossMissile(position: Vec2, angle: number): void {
    const sprite = this.projectileSprite;
    const rect = sprite
      ? this.sprites.missiles[Math.floor(random() * this.sprites.missiles.length)]
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


  private onAsteroidDestroyed = (asteroid: Asteroid, scored: boolean = true): void => {
    this.events.emit('asteroid:destroyed', { asteroid, scored });
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
      flashCache.preRenderFlashLevels('enemy_scout', this.enemySprite, this.sprites.enemies.default, levels);
      flashCache.preRenderFlashLevels('enemy_hunter', this.enemySprite, this.sprites.enemies.default, levels);
      flashCache.preRenderFlashLevels('enemy_guardian', this.enemySprite, this.sprites.enemies.strafe, levels);
      flashCache.preRenderFlashLevels('enemy_interceptor', this.enemySprite, this.sprites.enemies.dasher, levels);
      flashCache.preRenderFlashLevels('enemy_bomber', this.enemySprite, this.sprites.enemies.orbiter, levels);
    }

    // Pre-cache enemy 2 sprites
    if (this.enemy2Sprite) {
      flashCache.preRenderFlashLevels('enemy_sniper', this.enemy2Sprite, this.sprites.enemies2.type1, levels);
      flashCache.preRenderFlashLevels('enemy_assassin', this.enemy2Sprite, this.sprites.enemies2.type2, levels);
      flashCache.preRenderFlashLevels('enemy_swarm', this.enemy2Sprite, this.sprites.enemies2.type3, levels);
      flashCache.preRenderFlashLevels('enemy_elite', this.enemy2Sprite, this.sprites.enemies2.type4, levels);
      flashCache.preRenderFlashLevels('enemy_commander', this.enemy2Sprite, this.sprites.enemies2.type4, levels);
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
