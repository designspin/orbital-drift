import { Input, UILayer } from "@course/lib";
import type { Vec2 } from "@course/lib";

export type DynamicTouchControlsOptions = {
  canvas: HTMLCanvasElement;
  input: Input;
  mapPoint: (point: Vec2) => Vec2;
  scaleProvider?: () => number;
  deadzone?: number;
  alpha?: number;
  leftRegionRatio?: number;
  actionRegionRatio?: number;
  stickRadius?: number;
  knobRadius?: number;
  showStickVisuals?: boolean;
  handedness?: "right" | "left";
  fireSide?: "right" | "left";
};

type StickState = {
  pointerId: number | null;
  center: Vec2;
  axis: Vec2;
  radius: number;
  knobRadius: number;
};

export class DynamicTouchControls extends UILayer {
  private canvas: HTMLCanvasElement;
  private input: Input;
  private mapPoint: (point: Vec2) => Vec2;
  private scaleProvider: () => number;
  private deadzone: number;
  private alpha: number;
  private leftRegionRatio: number;
  private actionRegionRatio: number;
  private stickRadius: number;
  private knobRadius: number;
  private showStickVisuals: boolean;
  private handedness: "right" | "left";
  private fireSide: "right" | "left";
  private viewport: Vec2 = { x: 0, y: 0 };

  private stick: StickState = {
    pointerId: null,
    center: { x: 0, y: 0 },
    axis: { x: 0, y: 0 },
    radius: 84,
    knobRadius: 36,
  };

  private firePointerId: number | null = null;
  private shieldActive: boolean = false;
  private actionSwipeThreshold: number = 60;
  private actionPointerStart: Map<number, Vec2> = new Map();
  private actionPointerSwiped: Set<number> = new Set();
  private thrustPointerId: number | null = null;

  private onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
  private onPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
  private onPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
  private onPointerCancel = (e: PointerEvent) => this.handlePointerUp(e);
  private onTouchStart = (e: TouchEvent) => this.handleTouchStart(e);
  private onContextMenu = (e: Event) => this.handleContextMenu(e);
  private onWindowBlur = () => this.resetState();
  private onVisibilityChange = () => {
    if (document.hidden) this.resetState();
  };

  constructor(opts: DynamicTouchControlsOptions) {
    super("dynamic-touch-controls");
    this.canvas = opts.canvas;
    this.input = opts.input;
    this.mapPoint = opts.mapPoint;
    this.scaleProvider = opts.scaleProvider ?? (() => 1);
    this.deadzone = opts.deadzone ?? 0.25;
    this.alpha = opts.alpha ?? 0.6;
    this.leftRegionRatio = opts.leftRegionRatio ?? 0.5;
    this.actionRegionRatio = opts.actionRegionRatio ?? 0.33;
    this.stickRadius = opts.stickRadius ?? 84;
    this.knobRadius = opts.knobRadius ?? 36;
    this.showStickVisuals = opts.showStickVisuals ?? true;
    this.handedness = opts.handedness ?? "right";
    this.fireSide = opts.fireSide ?? "right";

    this.attach();
  }

  dispose(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("touchstart", this.onTouchStart);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("blur", this.onWindowBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  private attach(): void {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    this.canvas.addEventListener("touchstart", this.onTouchStart, { passive: false });
    this.canvas.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("blur", this.onWindowBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  override setVisible(visible: boolean): void {
    super.setVisible(visible);
    if (!visible) {
      this.resetState();
    }
  }

  override update(_deltaTime: number): void {
    if (!this.visible) return;
  }

  override render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.visible) return;
    this.viewport = { x: width, y: height };

    const scale = Math.max(0.5, this.scaleProvider());
    this.stick.radius = this.stickRadius * scale;
    this.stick.knobRadius = this.knobRadius * scale;
    this.actionSwipeThreshold = 60 * scale;

    if (!this.showStickVisuals || this.stick.pointerId === null) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    const center = this.stick.center;
    const radius = this.stick.radius;
    const knobRadius = this.stick.knobRadius;

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();

    const knobX = center.x + this.stick.axis.x * (radius - knobRadius);
    const knobY = center.y + this.stick.axis.y * (radius - knobRadius);
    ctx.fillStyle = "rgba(120,196,255,0.9)";
    ctx.beginPath();
    ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.visible) return;
    event.preventDefault();
    if (this.canvas.setPointerCapture) {
      this.canvas.setPointerCapture(event.pointerId);
    }
    const point = this.mapPoint({ x: event.clientX, y: event.clientY });

    const { stickStart, stickEnd, actionStart, actionEnd } = this.getRegions();

    if (point.x >= stickStart && point.x <= stickEnd && this.stick.pointerId === null) {
      this.stick.pointerId = event.pointerId;
      this.stick.center = { x: point.x, y: point.y };
      this.updateStickAxis(point);
      return;
    }

    if (point.x < actionStart || point.x > actionEnd) return;

    this.actionPointerStart.set(event.pointerId, { x: point.x, y: point.y });
    const actionMid = actionStart + (actionEnd - actionStart) * 0.5;
    const isFire = this.fireSide === "right" ? point.x >= actionMid : point.x < actionMid;

    if (isFire) {
      if (this.firePointerId === null) {
        this.firePointerId = event.pointerId;
        this.input.setActionState("fire", true);
      }
      return;
    }

    if (this.thrustPointerId === null) {
      this.thrustPointerId = event.pointerId;
      this.input.setActionState("thrust", true);
    }
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.visible) return;
    const point = this.mapPoint({ x: event.clientX, y: event.clientY });
    if (this.stick.pointerId === event.pointerId) {
      this.updateStickAxis(point);
      return;
    }

    if (this.actionPointerStart.has(event.pointerId) && !this.actionPointerSwiped.has(event.pointerId)) {
      const start = this.actionPointerStart.get(event.pointerId)!;
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      if (dx > this.actionSwipeThreshold && Math.abs(dx) > Math.abs(dy)) {
        this.actionPointerSwiped.add(event.pointerId);
        this.toggleShield();
        if (this.thrustPointerId === event.pointerId) {
          this.thrustPointerId = null;
          this.input.setActionState("thrust", false);
        }
        if (this.firePointerId === event.pointerId) {
          this.firePointerId = null;
          this.input.setActionState("fire", false);
        }
      }
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    if (!this.visible) return;
    if (this.canvas.releasePointerCapture) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    if (this.stick.pointerId === event.pointerId) {
      this.stick.pointerId = null;
      this.stick.axis = { x: 0, y: 0 };
      this.applyStickActions();
    }

    if (this.actionPointerStart.has(event.pointerId)) {
      const wasThrust = this.thrustPointerId === event.pointerId;
      const wasFire = this.firePointerId === event.pointerId;
      this.actionPointerStart.delete(event.pointerId);
      this.actionPointerSwiped.delete(event.pointerId);

      if (wasThrust) {
        this.thrustPointerId = null;
        this.input.setActionState("thrust", false);
      }
      if (wasFire) {
        this.firePointerId = null;
        this.input.setActionState("fire", false);
      }
    }
  }

  private updateStickAxis(point: Vec2): void {
    const dx = point.x - this.stick.center.x;
    const dy = point.y - this.stick.center.y;
    const dist = Math.hypot(dx, dy) || 1;
    const radius = this.stick.radius;
    const clamped = Math.min(dist, radius);
    this.stick.axis = {
      x: (dx / dist) * (clamped / radius),
      y: (dy / dist) * (clamped / radius),
    };
    this.applyStickActions();
  }

  private applyStickActions(): void {
    const x = this.stick.axis.x;
    this.input.setActionState("turnLeft", x <= -this.deadzone);
    this.input.setActionState("turnRight", x >= this.deadzone);
  }

  private toggleShield(): void {
    this.shieldActive = !this.shieldActive;
    this.input.setActionState("shield", this.shieldActive);
  }

  private resetState(): void {
    if (this.firePointerId !== null) {
      this.firePointerId = null;
      this.input.setActionState("fire", false);
    }
    this.actionPointerStart.clear();
    this.actionPointerSwiped.clear();
    this.thrustPointerId = null;
    this.shieldActive = false;
    this.input.setActionState("shield", false);
    this.input.setActionState("thrust", false);
    this.stick.pointerId = null;
    this.stick.axis = { x: 0, y: 0 };
    this.applyStickActions();
  }

  private handleTouchStart(event: TouchEvent): void {
    if (!this.visible) return;
    event.preventDefault();
  }

  private handleContextMenu(event: Event): void {
    event.preventDefault();
  }

  setHandedness(value: "right" | "left"): void {
    if (this.handedness === value) return;
    this.handedness = value;
    this.resetState();
  }

  setFireSide(value: "right" | "left"): void {
    if (this.fireSide === value) return;
    this.fireSide = value;
    this.resetState();
  }

  forceShieldOff(): void {
    if (!this.shieldActive) return;
    this.shieldActive = false;
    this.input.setActionState("shield", false);
  }

  private getRegions(): { stickStart: number; stickEnd: number; actionStart: number; actionEnd: number } {
    const stickWidth = this.viewport.x * this.leftRegionRatio;
    const maxActionWidth = Math.max(0, this.viewport.x - stickWidth);
    const actionWidth = Math.min(this.viewport.x * this.actionRegionRatio, maxActionWidth);

    if (this.handedness === "left") {
      const stickStart = this.viewport.x - stickWidth;
      const stickEnd = this.viewport.x;
      const actionStart = 0;
      const actionEnd = actionWidth;
      return { stickStart, stickEnd, actionStart, actionEnd };
    }

    const stickStart = 0;
    const stickEnd = stickWidth;
    const actionEnd = this.viewport.x;
    const actionStart = actionEnd - actionWidth;
    return { stickStart, stickEnd, actionStart, actionEnd };
  }
}
