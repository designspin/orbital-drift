export class Input {
  private keys: Set<string> = new Set();
  private justPressed: Set<string> = new Set();
  private justReleased: Set<string> = new Set();

  private onKeyDown = (e: KeyboardEvent) => {
    if(!e.repeat) {
      this.keys.add(e.key);
      this.justPressed.add(e.key);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
    this.justReleased.add(e.key);
  };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  update(): void {
    this.justPressed.clear();
    this.justReleased.clear();
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  wasPressed(key: string): boolean {
    return this.justPressed.has(key);
  }

  wasReleased(key: string): boolean {
    return this.justReleased.has(key);
  }
}