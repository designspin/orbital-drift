import { BaseUIElement } from "./UILayer";
import type { UIElementOptions } from "./UILayer";

export interface ShieldBarOptions extends UIElementOptions {
  getValue: () => number;
  width: number;
  height: number;
  backgroundColor?: string;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export class ShieldBar extends BaseUIElement {
  private getValue: () => number;
  private width: number;
  private height: number;
  private backgroundColor: string;
  private fillColor: string;
  private borderColor: string;
  private borderWidth: number;

  constructor(opts: ShieldBarOptions) {
    super(opts);
    this.getValue = opts.getValue;
    this.width = opts.width;
    this.height = opts.height;
    this.backgroundColor = opts.backgroundColor ?? "rgba(0,0,0,0.5)";
    this.fillColor = opts.fillColor ?? "#5ac8fa";
    this.borderColor = opts.borderColor ?? "rgba(255,255,255,0.3)";
    this.borderWidth = opts.borderWidth ?? 1;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const pos = this.getLocalPosition(width, height);
    const value = Math.max(0, Math.min(1, this.getValue()));

    ctx.save();
    ctx.translate(pos.x, pos.y);

    if (this.anchor.endsWith("right")) {
      ctx.translate(-this.width, 0);
    } else if (this.anchor === "center") {
      ctx.translate(-this.width / 2, 0);
    }

    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = this.fillColor;
    ctx.fillRect(0, 0, this.width * value, this.height);

    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.strokeRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }
}