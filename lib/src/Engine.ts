import { Timer } from "./Timer";
import { Input } from "./Input";
import { EntityManager } from "./EntityManager";
import { iEntity } from "./Entity";
import { Vec2 } from "./types/vec2";
import { UILayer } from "./ui/UILayer";

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
  protected uiLayers: UILayer[] = [];
  protected uiCanvas?: HTMLCanvasElement;
  protected uiCtx?: CanvasRenderingContext2D;
  private uiUpdateIntervalMs: number = 0;
  private uiTimeSinceUpdateMs: number = 0;

  protected get screenSize(): Vec2 {
    return {
      x: this.ctx.canvas.width,
      y: this.ctx.canvas.height,
    };
  }

  protected get running(): boolean {
    return this.isRunning;
  }

  init(opts: EngineInitOptions): void {
    const app = document.querySelector<HTMLDivElement>(opts.selector);
    if (!app) {
      throw new Error(`Element with selector "${opts.selector}" not found.`);
    }
    const canvas = document.createElement("canvas");
    canvas.width = opts.width || 800;
    canvas.height = opts.height || 600;
    canvas.style.backgroundColor = opts.backgroundColor || "black";
    canvas.id = "game";

    app.appendChild(canvas);
    canvas.focus();

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get 2D context from canvas.");
    }
    this.ctx = context;

    this.onInit();
  }

  protected onInit(): void {}

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer.resume();
    this.onResume();

    if (!this.hasLoopStarted) {
      this.hasLoopStarted = true;
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  stop() {
    this.isRunning = false;
    this.timer.pause();
    this.onPause();
  }

  protected onPause(): void {}

  protected onResume(): void {}

  protected canTogglePause(): boolean {
    return true;
  }

  private gameLoop() {
    if (this.input.wasPressed("Escape") && this.canTogglePause()) {
      if (this.isRunning) {
        this.stop();
      } else {
        this.isRunning = true;
        this.timer.resume();
        this.onResume();
      }
    }

    let deltaTime = 0;
    if (this.isRunning) {
      deltaTime = this.timer.tick();
      this.update(deltaTime);
      this.render();
    }

    const uiDeltaTime = this.isRunning ? deltaTime : 1 / 60;
    this.updateAndRenderUI(uiDeltaTime);

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

  protected updateAndRenderUI(deltaTime: number): void {
    if (!this.uiCtx || this.uiLayers.length === 0) return;

    this.uiTimeSinceUpdateMs += deltaTime * 1000;
    if (
      this.uiUpdateIntervalMs > 0 &&
      this.uiTimeSinceUpdateMs < this.uiUpdateIntervalMs
    ) {
      return;
    }
    this.uiTimeSinceUpdateMs = 0;

    const w = this.uiCanvas!.width;
    const h = this.uiCanvas!.height;

    for (const layer of this.uiLayers) {
      layer.update(deltaTime);
    }

    this.uiCtx.clearRect(0, 0, w, h);
    for (const layer of this.uiLayers) {
      layer.render(this.uiCtx, w, h);
    }
  }

  protected addUILayer(layer: UILayer): void {
    if (!this.uiCtx) {
      this.createUiCanvas();
    }
    this.uiLayers.push(layer);
  }

  protected removeUILayer(layer: UILayer): void {
    this.uiLayers = this.uiLayers.filter((l) => l !== layer);
  }

  protected setUiUpdateInterval(ms: number): void {
    this.uiUpdateIntervalMs = Math.max(0, ms);
  }

  private createUiCanvas(): void {
    const parent = this.ctx.canvas.parentElement;
    if (!parent) return;

    const computed = window.getComputedStyle(parent);
    if (computed.position === "static") {
      parent.style.position = "relative";
    }

    const canvas = document.createElement("canvas");
    canvas.width = this.ctx.canvas.width;
    canvas.height = this.ctx.canvas.height;
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    const gameCanvas = this.ctx.canvas;
    const gameStyles = window.getComputedStyle(gameCanvas);
    canvas.style.width = gameStyles.width || gameCanvas.style.width || "100%";
    canvas.style.height =
      gameStyles.height || gameCanvas.style.height || "100%";
    canvas.style.aspectRatio =
      gameStyles.aspectRatio ||
      gameCanvas.style.aspectRatio ||
      `${gameCanvas.width} / ${gameCanvas.height}`;
    canvas.style.objectFit =
      gameStyles.objectFit || gameCanvas.style.objectFit || "contain";
    canvas.style.display = gameStyles.display || "block";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "2";
    canvas.id = "ui";

    parent.appendChild(canvas);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get 2D context from UI canvas.");
    }

    this.uiCanvas = canvas;
    this.uiCtx = context;
  }

  protected addEntity(entity: iEntity) {
    this.entityManager.add(entity);
  }
}
