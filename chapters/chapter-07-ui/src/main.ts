import './style.css'
import { Engine, UILayer, UIPanel, ScoreDisplay, TextDisplay } from '@course/lib';
import { Player } from './Player';
import { PlayerController } from './PlayerController';
import { Asteroid } from './Asteroid';
import { Bullet } from './Bullet';
import { ShipIndicators } from './ShipIndicators';

class CH07 extends Engine {
	private score = 0;
	private lives = 3;
	private hudLayer = new UILayer('HUD');
	private pauseLayer = new UILayer('Pause');
	private player!: Player;
	private asteroids: Asteroid[] = [];

	protected override onInit(): void {
		this.setUiUpdateInterval(100);

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

		this.player = new Player(
			{ x: this.ctx.canvas.width / 2, y: this.ctx.canvas.height / 2 },
			new PlayerController(this.input),
		);
		this.addEntity(this.player);

		this.addAsteroid(new Asteroid({ x: 150, y: 120 }, "XL", this.onAsteroidDestroyed));
		this.addAsteroid(new Asteroid({ x: 650, y: 200 }, "L", this.onAsteroidDestroyed));
		this.addAsteroid(new Asteroid({ x: 400, y: 450 }, "M", this.onAsteroidDestroyed));
	}

	protected override update(deltaTime: number): void {
		if (this.input.wasPressed(" ")) {
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

	private addAsteroid(asteroid: Asteroid): void {
		this.asteroids.push(asteroid);
		this.addEntity(asteroid);
	}

	private onAsteroidDestroyed = (asteroid: Asteroid): void => {
		this.score += asteroid.getScoreValue();
	};

	protected override onPause(): void {
		this.pauseLayer.setVisible(true);
	}

	protected override onResume(): void {
		this.pauseLayer.setVisible(false);
	}
}

const engine = new CH07();

engine.init({
	selector: '#app',
	width: 800,
	height: 600,
	backgroundColor: '#000000',
});

engine.start();