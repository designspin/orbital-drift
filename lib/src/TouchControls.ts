import { Input } from "./Input";
import { UILayer, UIAnchor } from "./ui/UILayer";
import { Vec2 } from "./types/vec2";

export type TouchStickConfig = {
  id: string;
  anchor?: UIAnchor;
  offsetX?: number;
  offsetY?: number;
  radius?: number;
  knobRadius?: number;
  deadzone?: number;
  actions?: {
    left?: string;
    right?: string;
    up?: string;
    down?: string;
  };
};

export type TouchButtonConfig = {
  id: string;
  action: string;
  anchor?: UIAnchor;
  offsetX?: number;
  offsetY?: number;
  radius?: number;
  label?: string;
};

export type TouchControlsOptions = {
  canvas: HTMLCanvasElement;
  input: Input;
  mapPoint: (point: Vec2) => Vec2;
  sticks?: TouchStickConfig[];
  buttons?: TouchButtonConfig[];
  deadzone?: number;
  alpha?: number;
  labelFont?: string;
  scaleProvider?: () => number;
};

type StickState = {
  config: Required<TouchStickConfig>;
  pointerId: number | null;
  axis: Vec2;
  center: Vec2;
  radius: number;
  knobRadius: number;
};

type ButtonState = {
  config: Required<TouchButtonConfig>;
  pointerId: number | null;
  pressed: boolean;
  center: Vec2;
  radius: number;
};

export class TouchControls extends UILayer {
  private canvas: HTMLCanvasElement;
  private input: Input;
  private mapPoint: (point: Vec2) => Vec2;
  private sticks: StickState[] = [];
  private buttons: ButtonState[] = [];
  private deadzone: number;
  private alpha: number;
  private labelFont: string;
  private scaleProvider: () => number;
  private viewport: Vec2 = { x: 0, y: 0 };

  private onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
  private onPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
  private onPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
  private onPointerCancel = (e: PointerEvent) => this.handlePointerUp(e);

  constructor(opts: TouchControlsOptions) {
    super("touch-controls");
    this.canvas = opts.canvas;
    this.input = opts.input;
    this.mapPoint = opts.mapPoint;
    this.deadzone = opts.deadzone ?? 0.25;
    this.alpha = opts.alpha ?? 0.6;
    this.labelFont = opts.labelFont ?? "12px sans-serif";
    this.scaleProvider = opts.scaleProvider ?? (() => 1);

    this.sticks = (opts.sticks ?? []).map((stick) => ({
      config: {
        id: stick.id,
        anchor: stick.anchor ?? "bottom-left",
        offsetX: stick.offsetX ?? 80,
        offsetY: stick.offsetY ?? -80,
        radius: stick.radius ?? 70,
        knobRadius: stick.knobRadius ?? 32,
        deadzone: stick.deadzone ?? this.deadzone,
        actions: stick.actions ?? {},
      },
      pointerId: null,
      axis: { x: 0, y: 0 },
      center: { x: 0, y: 0 },
      radius: stick.radius ?? 70,
      knobRadius: stick.knobRadius ?? 32,
    }));

    this.buttons = (opts.buttons ?? []).map((button) => ({
      config: {
        id: button.id,
        action: button.action,
        anchor: button.anchor ?? "bottom-right",
        offsetX: button.offsetX ?? -80,
        offsetY: button.offsetY ?? -80,
        radius: button.radius ?? 34,
        label: button.label ?? "",
      },
      pointerId: null,
      pressed: false,
      center: { x: 0, y: 0 },
      radius: button.radius ?? 34,
    }));

    this.attach();
  }

  dispose(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
  }

  private attach(): void {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
  }

  override update(_deltaTime: number): void {
    if (!this.visible) return;
  }

  override render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.visible) return;
    this.viewport = { x: width, y: height };

    this.updateLayout();

    ctx.save();
    ctx.globalAlpha = this.alpha;

    for (const stick of this.sticks) {
      this.drawStick(ctx, stick);
    }

    for (const button of this.buttons) {
      this.drawButton(ctx, button);
    }

    ctx.restore();
  }

  private updateLayout(): void {
    const scale = Math.max(0.5, this.scaleProvider());
    for (const stick of this.sticks) {
      stick.center = this.getAnchorPoint(stick.config.anchor, this.viewport);
      stick.center.x += stick.config.offsetX * scale;
      stick.center.y += stick.config.offsetY * scale;
      stick.radius = stick.config.radius * scale;
      stick.knobRadius = stick.config.knobRadius * scale;
    }

    for (const button of this.buttons) {
      button.center = this.getAnchorPoint(button.config.anchor, this.viewport);
      button.center.x += button.config.offsetX * scale;
      button.center.y += button.config.offsetY * scale;
      button.radius = button.config.radius * scale;
    }
  }

  private drawStick(ctx: CanvasRenderingContext2D, stick: StickState): void {
    const radius = stick.radius;
    const knobRadius = stick.knobRadius;
    const center = stick.center;

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();

    const knobX = center.x + stick.axis.x * (radius - knobRadius);
    const knobY = center.y + stick.axis.y * (radius - knobRadius);

    ctx.fillStyle = stick.pointerId ? "rgba(120,196,255,0.9)" : "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawButton(ctx: CanvasRenderingContext2D, button: ButtonState): void {
    const radius = button.radius;
    const { label } = button.config;
    const center = button.center;

    ctx.fillStyle = button.pressed
      ? "rgba(120,196,255,0.9)"
      : "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (label) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font = this.labelFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, center.x, center.y);
    }
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.visible) return;
    const point = this.mapPoint({ x: event.clientX, y: event.clientY });

    for (const button of this.buttons) {
      if (button.pointerId !== null) continue;
      if (this.isWithin(point, button.center, button.radius * 1.2)) {
        button.pointerId = event.pointerId;
        button.pressed = true;
        this.input.setActionState(button.config.action, true);
        return;
      }
    }

    for (const stick of this.sticks) {
      if (stick.pointerId !== null) continue;
      if (this.isWithin(point, stick.center, stick.radius * 1.2)) {
        stick.pointerId = event.pointerId;
        this.updateStickAxis(stick, point);
        return;
      }
    }
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.visible) return;
    const point = this.mapPoint({ x: event.clientX, y: event.clientY });

    for (const stick of this.sticks) {
      if (stick.pointerId === event.pointerId) {
        this.updateStickAxis(stick, point);
        return;
      }
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    if (!this.visible) return;

    for (const button of this.buttons) {
      if (button.pointerId === event.pointerId) {
        button.pointerId = null;
        button.pressed = false;
        this.input.setActionState(button.config.action, false);
        return;
      }
    }

    for (const stick of this.sticks) {
      if (stick.pointerId === event.pointerId) {
        stick.pointerId = null;
        stick.axis = { x: 0, y: 0 };
        this.applyStickActions(stick);
        return;
      }
    }
  }

  private updateStickAxis(stick: StickState, point: Vec2): void {
    const dx = point.x - stick.center.x;
    const dy = point.y - stick.center.y;
    const dist = Math.hypot(dx, dy) || 1;
    const radius = stick.radius;
    const clamped = Math.min(dist, radius);
    stick.axis = {
      x: (dx / dist) * (clamped / radius),
      y: (dy / dist) * (clamped / radius),
    };
    this.applyStickActions(stick);
  }

  private applyStickActions(stick: StickState): void {
    const { actions, deadzone } = stick.config;
    const x = stick.axis.x;
    const y = stick.axis.y;

    if (actions.left) {
      this.input.setActionState(actions.left, x <= -deadzone);
    }
    if (actions.right) {
      this.input.setActionState(actions.right, x >= deadzone);
    }
    if (actions.up) {
      this.input.setActionState(actions.up, y <= -deadzone);
    }
    if (actions.down) {
      this.input.setActionState(actions.down, y >= deadzone);
    }
  }

  private getAnchorPoint(anchor: UIAnchor, size: Vec2): Vec2 {
    switch (anchor) {
      case "top-left":
        return { x: 0, y: 0 };
      case "top-right":
        return { x: size.x, y: 0 };
      case "bottom-left":
        return { x: 0, y: size.y };
      case "bottom-right":
        return { x: size.x, y: size.y };
      case "center":
      default:
        return { x: size.x / 2, y: size.y / 2 };
    }
  }

  private isWithin(point: Vec2, center: Vec2, radius: number): boolean {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return dx * dx + dy * dy <= radius * radius;
  }
}
