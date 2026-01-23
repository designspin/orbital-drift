export class Input {
  private keys: Set<string> = new Set();
  private justPressed: Set<string> = new Set();
  private justReleased: Set<string> = new Set();
  private actionDown: Set<string> = new Set();
  private actionJustPressed: Set<string> = new Set();
  private actionJustReleased: Set<string> = new Set();
  private actionBindings: Map<string, Set<string>> = new Map();
  private keyToActions: Map<string, Set<string>> = new Map();

  private onKeyDown = (e: KeyboardEvent) => {
    if(!e.repeat) {
      this.keys.add(e.key);
      this.justPressed.add(e.key);
      this.setActionsForKey(e.key, true);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
    this.justReleased.add(e.key);
    this.setActionsForKey(e.key, false);
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
    this.actionJustPressed.clear();
    this.actionJustReleased.clear();
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

  bindAction(action: string, ...keys: string[]): void {
    if (!this.actionBindings.has(action)) {
      this.actionBindings.set(action, new Set());
    }
    const binding = this.actionBindings.get(action)!;
    for (const key of keys) {
      binding.add(key);
      if (!this.keyToActions.has(key)) {
        this.keyToActions.set(key, new Set());
      }
      this.keyToActions.get(key)!.add(action);
    }
  }

  clearActionBindings(action: string): void {
    const keys = this.actionBindings.get(action);
    if (!keys) return;
    for (const key of keys) {
      const actions = this.keyToActions.get(key);
      if (actions) {
        actions.delete(action);
        if (actions.size === 0) {
          this.keyToActions.delete(key);
        }
      }
    }
    this.actionBindings.delete(action);
    this.actionDown.delete(action);
    this.actionJustPressed.delete(action);
    this.actionJustReleased.delete(action);
  }

  setActionState(action: string, isDown: boolean): void {
    if (isDown) {
      if (!this.actionDown.has(action)) {
        this.actionDown.add(action);
        this.actionJustPressed.add(action);
      }
    } else if (this.actionDown.has(action)) {
      this.actionDown.delete(action);
      this.actionJustReleased.add(action);
    }
  }

  isActionDown(action: string): boolean {
    return this.actionDown.has(action);
  }

  wasActionPressed(action: string): boolean {
    return this.actionJustPressed.has(action);
  }

  wasActionReleased(action: string): boolean {
    return this.actionJustReleased.has(action);
  }

  private setActionsForKey(key: string, isDown: boolean): void {
    const actions = this.keyToActions.get(key);
    if (!actions) return;
    for (const action of actions) {
      if (isDown) {
        this.setActionState(action, true);
        continue;
      }
      const keys = this.actionBindings.get(action);
      const stillDown = keys ? Array.from(keys).some((k) => this.keys.has(k)) : false;
      if (!stillDown) {
        this.setActionState(action, false);
      }
    }
  }
}