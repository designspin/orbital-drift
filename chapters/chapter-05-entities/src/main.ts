import './style.css'
import { Engine } from '@course/lib';
import { Player } from './Player';
import { PlayerController } from './PlayerController';

class CH05 extends Engine {

  protected override onInit(): void {
    const player = new Player(
      { x: this.ctx.canvas.width / 2, y: this.ctx.canvas.height / 2 },
      new PlayerController(this.input),
    );
    this.addEntity(player);
  }
  
}

const engine = new CH05();

engine.init({
  selector: '#app',
  width: 800,
  height: 600,
  backgroundColor: '#000000',
});

engine.start();