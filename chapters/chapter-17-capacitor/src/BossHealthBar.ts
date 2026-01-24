import { BaseUIElement } from "@course/lib";
import type { UIElementOptions } from "@course/lib";

export type BossHealthBarOptions = UIElementOptions & {
  getValue: () => number;
  getVisible: () => boolean;
  width: number;
  height: number;
  backgroundColor?: string;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  label?: string;
  labelColor?: string;
  font?: string;
};

export class BossHealthBar extends BaseUIElement {
  private getValue: () => number;
  private getVisible: () => boolean;
  private width: number;
  private height: number;
  private backgroundColor: string;
  private fillColor: string;
  private borderColor: string;
  private borderWidth: number;
  private label: string;
  private labelColor: string;
  private font: string;

  constructor(opts: BossHealthBarOptions) {
    super(opts);
    this.getValue = opts.getValue;
    this.getVisible = opts.getVisible;
    this.width = opts.width;
    this.height = opts.height;
    this.backgroundColor = opts.backgroundColor ?? "rgba(0,0,0,0.6)";
    this.fillColor = opts.fillColor ?? "#ff3b30";
    this.borderColor = opts.borderColor ?? "rgba(255,255,255,0.5)";
    this.borderWidth = opts.borderWidth ?? 1;
    this.label = opts.label ?? "BOSS";
    this.labelColor = opts.labelColor ?? "#ffffff";
    this.font = opts.font ?? "12px sans-serif";
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.getVisible()) return;
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

    ctx.fillStyle = this.labelColor;
    ctx.font = this.font;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(this.label, 2, -4);

    ctx.restore();
  }
}
