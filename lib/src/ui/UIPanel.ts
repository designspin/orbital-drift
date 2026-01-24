import { BaseUIElement } from "./UILayer";
import type { UIElementOptions } from "./UILayer";

export interface UIPanelOptions extends UIElementOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export class UIPanel extends BaseUIElement {
  width: number;
  height: number;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  private children: BaseUIElement[] = [];

  constructor(opts: UIPanelOptions) {
    super(opts);
    this.width = opts.width;
    this.height = opts.height;
    this.backgroundColor = opts.backgroundColor ?? "rgba(0,0,0,0.5)";
    this.borderColor = opts.borderColor ?? "rgba(255,255,255,0.2)";
    this.borderWidth = opts.borderWidth ?? 0;
    this.borderRadius = opts.borderRadius ?? 0;
  }

  add(child: BaseUIElement): void {
    child.parent = this;
    this.children.push(child);
  }

  update(deltaTime: number): void {
    for (const child of this.children) {
      child.update(deltaTime);
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const pos = this.getLocalPosition(width, height);

    ctx.save();
    ctx.translate(pos.x, pos.y);

    const radius = Math.max(0, Math.min(this.borderRadius, Math.min(this.width, this.height) / 2));
    if (radius > 0) {
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(this.width - radius, 0);
      ctx.quadraticCurveTo(this.width, 0, this.width, radius);
      ctx.lineTo(this.width, this.height - radius);
      ctx.quadraticCurveTo(this.width, this.height, this.width - radius, this.height);
      ctx.lineTo(radius, this.height);
      ctx.quadraticCurveTo(0, this.height, 0, this.height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fillStyle = this.backgroundColor;
      ctx.fill();

      if (this.borderWidth > 0) {
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.width, this.height);

      if (this.borderWidth > 0) {
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.strokeRect(0, 0, this.width, this.height);
      }
    }

    for (const child of this.children) {
      child.render(ctx, this.width, this.height);
    }

    ctx.restore();
  }
}
