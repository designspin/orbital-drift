import './style.css'
import { Engine } from '@course/lib';
import { Player } from './Player';
import { PlayerController } from './PlayerController';
import { Asteroid } from './Asteroid';
import { Bullet } from './Bullet';

class CH06 extends Engine {
  private player!: Player;
  private asteroids: Asteroid[] = [];

  protected override onInit(): void {
    this.player = new Player(
      { x: this.ctx.canvas.width / 2, y: this.ctx.canvas.height / 2 },
      new PlayerController(this.input),
    );
    this.addEntity(this.player);

    this.addAsteroid(new Asteroid({ x: 150, y: 120 }, "XL"));
    this.addAsteroid(new Asteroid({ x: 650, y: 200 }, "L"));
    this.addAsteroid(new Asteroid({ x: 400, y: 450 }, "M"));
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
  
}

const engine = new CH06();

engine.init({
  selector: '#app',
  width: 800,
  height: 600,
  backgroundColor: '#000000',
});

engine.start();