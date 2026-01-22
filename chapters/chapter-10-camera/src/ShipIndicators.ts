import { BaseUIElement } from "@course/lib";
import type { UIElementOptions } from "@course/lib";

export interface ShipIndicatorsOptions extends UIElementOptions {
  getLives: () => number;
  maxLives?: number;
  color?: string;
  size?: number;
  spacing?: number;
}

/**
 * Renders small ship icons for remaining lives.
 */
export class ShipIndicators extends BaseUIElement {
  private getLives: () => number;
  private maxLives: number;
  private color: string;
  private size: number;
  private spacing: number;

  constructor(opts: ShipIndicatorsOptions) {
    super(opts);
    this.getLives = opts.getLives;
    this.maxLives = opts.maxLives ?? 3;
    this.color = opts.color ?? "#00ff6a";
    this.size = opts.size ?? 12;
    this.spacing = opts.spacing ?? 8;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const pos = this.getLocalPosition(width, height);
    const lives = Math.max(0, Math.min(this.getLives(), this.maxLives));

    ctx.save();
    ctx.translate(pos.x, pos.y);

    const totalWidth =
      lives > 0 ? lives * this.size + (lives - 1) * this.spacing : 0;
    const startX =
      this.anchor === "center"
        ? -totalWidth / 2
        : this.anchor.endsWith("right")
          ? -totalWidth
          : 0;
    const yOffset = this.anchor === "center" ? this.size * 0.15 : 0;

    for (let i = 0; i < lives; i++) {
      const x = startX + i * (this.size + this.spacing) + this.size / 2;
      this.drawShip(ctx, x, yOffset);
    }

    ctx.restore();
  }

  private drawShip(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const s = this.size;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(-s * 0.6, s * 0.7);
    ctx.lineTo(0, s * 0.3);
    ctx.lineTo(s * 0.6, s * 0.7);
    ctx.closePath();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }
}