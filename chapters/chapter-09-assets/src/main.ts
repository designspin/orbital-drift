import './style.css'
import { AssetManager, Engine, StateMachine, UILayer, UIPanel, ScoreDisplay, TextDisplay } from '@course/lib';
import type { GameState } from '@course/lib';
import { Player } from './Player';
import { PlayerController } from './PlayerController';
import { Asteroid } from './Asteroid';
import { Bullet } from './Bullet';
import { ShipIndicators } from './ShipIndicators';

class CH09 extends Engine {
  private assets = new AssetManager();
  private progress = 0;
  private shipSprite?: HTMLImageElement;

  private score = 0;
  private lives = 3;
  private hudLayer = new UILayer('HUD');
  private pauseLayer = new UILayer('Pause');
  private player!: Player;
  private asteroids: Asteroid[] = [];
  private stateMachine = new StateMachine<GameState>();

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

    if (!this.player.alive && this.lives > 0) {
      this.lives -= 1;
      if (this.lives > 0) {
        this.player = new Player(
          { x: this.ctx.canvas.width / 2, y: this.ctx.canvas.height / 2 },
          new PlayerController(this.input),
          this.shipSprite,
        );
        this.addEntity(this.player);
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
  }

  public renderPlaying(): void {
    super.render();
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
        void this.assets
          .loadAll((p) => {
            this.progress = p.percent;
          })
          .then(() => {
            this.shipSprite = this.assets.getImage('ship');
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
        this.renderTextScreen('Asteroids', 'Press Enter to Start');
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
      .add(gameOverState);
  }

  private resetGame(): void {
    this.score = 0;
    this.lives = 3;
    this.asteroids = [];
    this.entityManager.clear();

    this.player = new Player(
      { x: this.ctx.canvas.width / 2, y: this.ctx.canvas.height / 2 },
      new PlayerController(this.input),
      this.shipSprite,
    );
    this.addEntity(this.player);

    this.addAsteroid(new Asteroid({ x: 150, y: 120 }, 'XL', this.onAsteroidDestroyed));
    this.addAsteroid(new Asteroid({ x: 650, y: 200 }, 'L', this.onAsteroidDestroyed));
    this.addAsteroid(new Asteroid({ x: 400, y: 450 }, 'M', this.onAsteroidDestroyed));
  }

  private addAsteroid(asteroid: Asteroid): void {
    this.asteroids.push(asteroid);
    this.addEntity(asteroid);
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

const engine = new CH09();

engine.init({
  selector: '#app',
  width: 800,
  height: 600,
  backgroundColor: '#000000',
});

engine.start();
