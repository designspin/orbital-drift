import { BaseUIElement, UIElementOptions } from "./UILayer";

export interface ScoreDisplayOptions extends UIElementOptions {
  getScore: () => number;
  color?: string;
  font?: string;
}

/**
 * Simple score text element.
 */
export class ScoreDisplay extends BaseUIElement {
  private getScore: () => number;
  private color: string;
  private font: string;

  constructor(opts: ScoreDisplayOptions) {
    super(opts);
    this.getScore = opts.getScore;
    this.color = opts.color ?? "#ffffff";
    this.font = opts.font ?? "16px sans-serif";
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const pos = this.getLocalPosition(width, height);
    ctx.save();
    ctx.font = this.font;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.anchor === "center" ? "center" : this.anchor.endsWith("right") ? "right" : "left";
    ctx.textBaseline = this.anchor === "center" ? "middle" : "top";
    ctx.fillText(`SCORE: ${this.getScore()}`, pos.x, pos.y);
    ctx.restore();
  }
}
