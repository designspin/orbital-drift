import './style.css'
import { Engine } from '@course/lib';

class CH04 extends Engine {
  private playerAngle: number = 0;
  private playerVelocity: number = 0;
  private playerThrust: number = 0;
  private playerX: number = 400;
  private playerY: number = 300;
  private playerFriction: number = 0.98;

  override update(deltaTime: number): void {
      // Rotate player
      if (this.input.isDown('ArrowLeft')) {
          this.playerAngle -= 180 * deltaTime;
      }
      if (this.input.isDown('ArrowRight')) {
          this.playerAngle += 180 * deltaTime;
      }

      // Thrust
      if (this.input.isDown('ArrowUp')) {
          this.playerThrust = 200;
      } else {
          this.playerThrust = 0;
      }

      // Update velocity
      this.playerVelocity += this.playerThrust * deltaTime;
      this.playerVelocity *= this.playerFriction;

      // Update position
      this.playerX += Math.cos((this.playerAngle * Math.PI) / 180) * this.playerVelocity * deltaTime;
      this.playerY += Math.sin((this.playerAngle * Math.PI) / 180) * this.playerVelocity * deltaTime;

      // Wrap around screen
      const canvasWidth = this.ctx.canvas.width;
      const canvasHeight = this.ctx.canvas.height;
      if (this.playerX < 0) this.playerX += canvasWidth;
      if (this.playerX > canvasWidth) this.playerX -= canvasWidth;
      if (this.playerY < 0) this.playerY += canvasHeight;
      if (this.playerY > canvasHeight) this.playerY -= canvasHeight;
  }

  override render(): void {
      super.render(() => {
          this.ctx.save();
          this.ctx.translate(this.playerX, this.playerY);
          this.ctx.rotate((this.playerAngle * Math.PI) / 180);
          this.ctx.beginPath();
          this.ctx.moveTo(20, 0);
          this.ctx.lineTo(-15, -10);
          this.ctx.lineTo(-10, 0);
          this.ctx.lineTo(-15, 10);
          this.ctx.closePath();
          this.ctx.fillStyle = '#00ff00';
          this.ctx.fill();
          this.ctx.restore();

          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = '24px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'bottom';
          this.ctx.fillText(`Game Loop Running... FPS: ${this.timer.getFPS()}`, this.ctx.canvas.width / 2, this.ctx.canvas.height - 10);
      });
  }
}

const engine = new CH04();

engine.init({
  selector: '#app',
  width: 800,
  height: 600,
  backgroundColor: 'black',
});

engine.start();