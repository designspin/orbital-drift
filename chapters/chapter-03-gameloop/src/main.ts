import './style.css'
import { Engine } from '@course/lib';

class CH03 extends Engine {

  private cubeAngle: number = 0;
  private cubeSize: number = 0;

  override update(deltaTime: number): void {
      this.cubeAngle += 90 * deltaTime;
      if (this.cubeAngle >= 360) {
          this.cubeAngle -= 360;
      }

      // Make cube size oscillate between 50 and 150
      const time = this.timer.getGameTime();
      this.cubeSize = 100 + 50 * Math.sin(time * 2);
  }

  override render(): void {
      super.render(() => {
          const centerX = this.ctx.canvas.width / 2;
          const centerY = this.ctx.canvas.height / 2;
          const size = this.cubeSize;

          this.ctx.save();
          this.ctx.translate(centerX, centerY);
          this.ctx.rotate((this.cubeAngle * Math.PI) / 180);
          this.ctx.fillStyle = '#203897';
          this.ctx.fillRect(-size / 2, -size / 2, size, size);
          this.ctx.restore();

          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = '24px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'bottom';
          this.ctx.fillText(`Game Loop Running... FPS: ${this.timer.getFPS()}`, this.ctx.canvas.width / 2, this.ctx.canvas.height - 10);
      });
  }
}

const engine = new CH03();

engine.init({
  selector: '#app',
  width: 800,
  height: 600,
  backgroundColor: '#4433ee',
});

engine.start();
