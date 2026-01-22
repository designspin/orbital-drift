export type UIAnchor =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export interface UIElementOptions {
  anchor?: UIAnchor;
  offsetX?: number;
  offsetY?: number;
  parent?: BaseUIElement | null;
}

export abstract class BaseUIElement {
  anchor: UIAnchor;
  offsetX: number;
  offsetY: number;
  parent: BaseUIElement | null;

  protected constructor(opts: UIElementOptions = {}) {
    this.anchor = opts.anchor ?? "top-left";
    this.offsetX = opts.offsetX ?? 0;
    this.offsetY = opts.offsetY ?? 0;
    this.parent = opts.parent ?? null;
  }

  update(_deltaTime: number): void {}

  abstract render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void;

  protected getAnchorPoint(width: number, height: number): { x: number; y: number } {
    switch (this.anchor) {
      case "top-left":
        return { x: 0, y: 0 };
      case "top-right":
        return { x: width, y: 0 };
      case "bottom-left":
        return { x: 0, y: height };
      case "bottom-right":
        return { x: width, y: height };
      case "center":
        return { x: width / 2, y: height / 2 };
    }
  }

  protected getLocalPosition(width: number, height: number): { x: number; y: number } {
    const anchor = this.getAnchorPoint(width, height);
    return { x: anchor.x + this.offsetX, y: anchor.y + this.offsetY };
  }
}


export class UILayer {
  name: string;
  visible: boolean = true;
  private elements: BaseUIElement[] = [];

  constructor(name: string) {
    this.name = name;
  }

  add(element: BaseUIElement): void {
    this.elements.push(element);
  }

  remove(element: BaseUIElement): void {
    this.elements = this.elements.filter((e) => e !== element);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  update(deltaTime: number): void {
    if (!this.visible) return;
    for (const el of this.elements) {
      el.update(deltaTime);
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.visible) return;
    for (const el of this.elements) {
      el.render(ctx, width, height);
    }
  }
}
