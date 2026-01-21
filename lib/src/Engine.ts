import { Timer } from './Timer';
import { Input } from './Input';
import { EntityManager } from './EntityManager';
import { iEntity } from './Entity';
import { Vec2 } from './types/vec2';

type EngineInitOptions = {
  selector: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
};

export class Engine {
  protected timer: Timer = new Timer();
  protected input: Input = new Input();
  protected entityManager: EntityManager = new EntityManager();
  private isRunning: boolean = false;
  private hasLoopStarted: boolean = false;
  protected ctx!: CanvasRenderingContext2D;

  protected get screenSize(): Vec2 {
      return {
          x: this.ctx.canvas.width,
          y: this.ctx.canvas.height
      };
  }

  init(opts: EngineInitOptions): void {
      const app = document.querySelector<HTMLDivElement>(opts.selector);
      if (!app) {
          throw new Error(`Element with selector "${opts.selector}" not found.`);
      }
      const canvas = document.createElement('canvas');
      canvas.width = opts.width || 800;
      canvas.height = opts.height || 600;
      canvas.style.backgroundColor = opts.backgroundColor || 'black';
      canvas.id = 'game';

      app.appendChild(canvas);
      canvas.focus();

      const context = canvas.getContext('2d');
      if (!context) {
          throw new Error('Failed to get 2D context from canvas.');
      }
      this.ctx = context;

      this.onInit();
  }

  protected onInit(): void {}

  start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.timer.resume();

      if (!this.hasLoopStarted) {
          this.hasLoopStarted = true;
          requestAnimationFrame(this.gameLoop.bind(this));
      }
  }

  stop() {
      this.isRunning = false;
      this.timer.pause();
  }

  private gameLoop() {
      if (this.input.wasPressed('Escape')) {
          if (this.isRunning) {
              this.stop();
          } else {
              this.isRunning = true;
              this.timer.resume();
          }
      }
      
      
      if(this.isRunning) {
        const deltaTime = this.timer.tick();
        this.update(deltaTime);
        this.render();
      }

      this.input.update();

      requestAnimationFrame(this.gameLoop.bind(this));
  }

  protected update(deltaTime: number) {
      this.entityManager.update(deltaTime, this.screenSize);
  }

  protected render(renderCallback?: () => void) {
      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      this.ctx.save();

      this.entityManager.render(this.ctx);

      if (renderCallback) {
          renderCallback();
      }

      this.ctx.restore();
  }

  protected addEntity(entity: iEntity) {
      this.entityManager.add(entity);
  }
}