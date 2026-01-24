import { Timer } from "./Timer";
import { Input } from "./Input";
import { EntityManager } from "./EntityManager";
import type { iEntity } from "./Entity";
import type { Vec2 } from "./types/vec2";
import { UILayer } from "./ui/UILayer";

type EngineInitOptions = {
  selector: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  resize?: {
    mode?: "none" | "contain" | "cover";
    maxDpr?: number;
    minDpr?: number;
    matchDevice?: boolean;
    matchAspect?: {
      base?: "width" | "height";
      baseSize?: number;
    };
    matchAspectWhen?: {
      maxShortSide?: number;
      landscapeOnly?: boolean;
      baseSize?: number;
    };
  };
};

export class Engine {
  protected timer: Timer = new Timer();
  protected input: Input = new Input();
  protected entityManager: EntityManager = new EntityManager();
  private isRunning: boolean = false;
  private hasLoopStarted: boolean = false;
  protected ctx!: CanvasRenderingContext2D;
  private rootElement?: HTMLElement;
  private canvasContainer?: HTMLDivElement;
  private logicalSize: Vec2 = { x: 800, y: 600 };
  private baseLogicalSize: Vec2 = { x: 800, y: 600 };
  private cssSize: Vec2 = { x: 800, y: 600 };
  private resizeMode: "none" | "contain" | "cover" = "none";
  private maxDpr: number = 1;
  private minDpr: number = 1;
  private matchDevice: boolean = false;
  private matchAspectBase: "width" | "height" | null = null;
  private matchAspectSize: number = 0;
  private matchAspectMaxShortSide: number = 0;
  private matchAspectLandscapeOnly: boolean = false;
  private matchAspectWhenBaseSize: number = 0;
  private scale: number = 1;
  private dpr: number = 1;
  private onWindowResize = () => this.applyResize();
  protected uiLayers: UILayer[] = [];
  protected uiCanvas?: HTMLCanvasElement;
  protected uiCtx?: CanvasRenderingContext2D;
  private uiUpdateIntervalMs: number = 0;
  private uiTimeSinceUpdateMs: number = 0;

  protected get screenSize(): Vec2 {
    return {
      x: this.logicalSize.x,
      y: this.logicalSize.y,
    };
  }

  protected get viewportSize(): Vec2 {
    return {
      x: this.logicalSize.x,
      y: this.logicalSize.y,
    };
  }

  protected get canvasCssSize(): Vec2 {
    return {
      x: this.cssSize.x,
      y: this.cssSize.y,
    };
  }

  protected get renderScale(): number {
    return this.scale;
  }

  protected get devicePixelRatio(): number {
    return this.dpr;
  }

  protected screenToWorld(point: Vec2): Vec2 {
    const rect = this.ctx.canvas.getBoundingClientRect();
    return {
      x: (point.x - rect.left) / this.scale,
      y: (point.y - rect.top) / this.scale,
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
    this.rootElement = app;
    this.canvasContainer = document.createElement("div");
    this.canvasContainer.style.position = "relative";
    this.canvasContainer.style.display = "block";
    this.canvasContainer.style.width = "100%";
    this.canvasContainer.style.height = "100%";
    this.canvasContainer.style.overflow = "hidden";
    app.appendChild(this.canvasContainer);
    this.logicalSize = {
      x: opts.width || 800,
      y: opts.height || 600,
    };
    this.baseLogicalSize = { ...this.logicalSize };
    this.resizeMode = opts.resize?.mode ?? "none";
    this.maxDpr = opts.resize?.maxDpr ?? 2;
    this.minDpr = opts.resize?.minDpr ?? 1;
    this.matchDevice = opts.resize?.matchDevice ?? false;
    this.matchAspectBase = opts.resize?.matchAspect?.base ?? null;
    this.matchAspectSize =
      opts.resize?.matchAspect?.baseSize ??
      (this.matchAspectBase === "width"
        ? this.baseLogicalSize.x
        : this.baseLogicalSize.y);
    this.matchAspectMaxShortSide = opts.resize?.matchAspectWhen?.maxShortSide ?? 0;
    this.matchAspectLandscapeOnly =
      opts.resize?.matchAspectWhen?.landscapeOnly ?? false;
    this.matchAspectWhenBaseSize = opts.resize?.matchAspectWhen?.baseSize ?? 0;
    const canvas = document.createElement("canvas");
    canvas.width = this.logicalSize.x;
    canvas.height = this.logicalSize.y;
    canvas.style.backgroundColor = opts.backgroundColor || "black";
    canvas.id = "game";

    this.canvasContainer.appendChild(canvas);
    canvas.focus();

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get 2D context from canvas.");
    }
    this.ctx = context;

    this.applyResize();
    if (this.resizeMode !== "none") {
      window.addEventListener("resize", this.onWindowResize);
    }

    this.onInit();
  }

  protected onResize(
    _info: {
      logicalSize: Vec2;
      cssSize: Vec2;
      scale: number;
      dpr: number;
    }
  ): void {}

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

    const w = this.logicalSize.x;
    const h = this.logicalSize.y;

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

  protected getUiCanvas(): HTMLCanvasElement | undefined {
    if (!this.uiCtx) {
      this.createUiCanvas();
    }
    return this.uiCanvas;
  }

  protected setUiPointerEvents(enabled: boolean): void {
    if (!this.uiCtx) {
      this.createUiCanvas();
    }
    if (!this.uiCanvas) return;
    this.uiCanvas.style.pointerEvents = enabled ? "auto" : "none";
    this.uiCanvas.style.touchAction = enabled ? "none" : "auto";
  }

  protected removeUILayer(layer: UILayer): void {
    this.uiLayers = this.uiLayers.filter((l) => l !== layer);
  }

  protected setUiUpdateInterval(ms: number): void {
    this.uiUpdateIntervalMs = Math.max(0, ms);
  }

  private createUiCanvas(): void {
    const parent = this.canvasContainer || this.ctx.canvas.parentElement;
    if (!parent) return;

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.display = "block";
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
    this.syncUiCanvas();
  }

  private applyResize(): void {
    if (!this.ctx) return;
    const canvas = this.ctx.canvas;
    const parent = this.rootElement || canvas.parentElement;
    if (!parent) return;

    if (this.matchDevice) {
      this.logicalSize = {
        x: Math.max(1, Math.floor(window.innerWidth)),
        y: Math.max(1, Math.floor(window.innerHeight)),
      };
    } else {
      const shortSide = Math.min(window.innerWidth, window.innerHeight);
      const isLandscape = window.innerWidth >= window.innerHeight;
      const allowAspectMatch =
        !!this.matchAspectBase &&
        (this.matchAspectMaxShortSide === 0 || shortSide <= this.matchAspectMaxShortSide) &&
        (!this.matchAspectLandscapeOnly || isLandscape);

      if (allowAspectMatch) {
        const aspect = window.innerWidth / Math.max(1, window.innerHeight);
        const baseSize = this.matchAspectWhenBaseSize > 0
          ? this.matchAspectWhenBaseSize
          : this.matchAspectSize;
        if (this.matchAspectBase === "height") {
          const height = Math.max(1, Math.floor(baseSize));
          const width = Math.max(1, Math.floor(height * aspect));
          this.logicalSize = { x: width, y: height };
        } else {
          const width = Math.max(1, Math.floor(baseSize));
          const height = Math.max(1, Math.floor(width / aspect));
          this.logicalSize = { x: width, y: height };
        }
      } else {
        this.logicalSize = { ...this.baseLogicalSize };
      }
    }

    const logical = this.logicalSize;
    if (this.resizeMode === "none") {
      this.scale = 1;
      this.dpr = 1;
      this.cssSize = { x: logical.x, y: logical.y };
      canvas.width = logical.x;
      canvas.height = logical.y;
      if (this.canvasContainer) {
        this.canvasContainer.style.width = `${logical.x}px`;
        this.canvasContainer.style.height = `${logical.y}px`;
      }
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.syncUiCanvas();
      this.onResize({
        logicalSize: this.logicalSize,
        cssSize: this.cssSize,
        scale: this.scale,
        dpr: this.dpr,
      });
      return;
    }

    const rect = parent.getBoundingClientRect();
    const scaleX = rect.width / logical.x;
    const scaleY = rect.height / logical.y;
    const scale =
      this.resizeMode === "cover"
        ? Math.max(scaleX, scaleY)
        : Math.min(scaleX, scaleY);

    const cssW = Math.max(1, Math.round(logical.x * scale));
    const cssH = Math.max(1, Math.round(logical.y * scale));
    const rawDpr = window.devicePixelRatio || 1;
    const dpr = Math.min(Math.max(rawDpr, this.minDpr), this.maxDpr);

    this.scale = cssW / logical.x;
    this.dpr = dpr;
    this.cssSize = { x: cssW, y: cssH };

    if (this.canvasContainer) {
      this.canvasContainer.style.width = `${cssW}px`;
      this.canvasContainer.style.height = `${cssH}px`;
    }

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.aspectRatio = `${logical.x} / ${logical.y}`;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));

    this.ctx.setTransform(this.scale * dpr, 0, 0, this.scale * dpr, 0, 0);
    this.syncUiCanvas();
    this.onResize({
      logicalSize: this.logicalSize,
      cssSize: this.cssSize,
      scale: this.scale,
      dpr: this.dpr,
    });
  }

  private syncUiCanvas(): void {
    if (!this.uiCanvas || !this.uiCtx) return;

    const cssW = this.cssSize.x;
    const cssH = this.cssSize.y;
    const dpr = this.dpr;

    this.uiCanvas.style.width = `${cssW}px`;
    this.uiCanvas.style.height = `${cssH}px`;
    this.uiCanvas.style.aspectRatio = `${this.logicalSize.x} / ${this.logicalSize.y}`;
    this.uiCanvas.style.objectFit = "contain";
    this.uiCanvas.width = Math.max(1, Math.round(cssW * dpr));
    this.uiCanvas.height = Math.max(1, Math.round(cssH * dpr));
    this.uiCtx.setTransform(this.scale * dpr, 0, 0, this.scale * dpr, 0, 0);
  }

  protected addEntity(entity: iEntity) {
    this.entityManager.add(entity);
  }
}
