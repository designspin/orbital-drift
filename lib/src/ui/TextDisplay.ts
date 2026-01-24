import { BaseUIElement } from "./UILayer";
import type { UIElementOptions } from "./UILayer";

export interface TextDisplayOptions extends UIElementOptions {
  getText: () => string;
  color?: string;
  font?: string;
}

/**
 * Simple text element.
 */
export class TextDisplay extends BaseUIElement {
  private getText: () => string;
  private color: string;
  private font: string;

  constructor(opts: TextDisplayOptions) {
    super(opts);
    this.getText = opts.getText;
    this.color = opts.color ?? "#ffffff";
    this.font = opts.font ?? "18px sans-serif";
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const pos = this.getLocalPosition(width, height);
    ctx.save();
    ctx.font = this.font;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.anchor === "center" ? "center" : this.anchor.endsWith("right") ? "right" : "left";
    ctx.textBaseline = this.anchor === "center" ? "middle" : "top";
    ctx.fillText(this.getText(), pos.x, pos.y);
    ctx.restore();
  }
}