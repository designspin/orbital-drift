export interface System {
  update(deltaTime: number): void;
  render?(): void;
}

type SystemEntry = {
  system: System;
  order: number;
};

export class SystemManager {
  private systems: SystemEntry[] = [];

  add(system: System, order: number = 0): this {
    this.systems.push({ system, order });
    this.systems.sort((a, b) => a.order - b.order);
    return this;
  }

  remove(system: System): void {
    this.systems = this.systems.filter((entry) => entry.system !== system);
  }

  clear(): void {
    this.systems = [];
  }

  update(deltaTime: number): void {
    for (const entry of this.systems) {
      entry.system.update(deltaTime);
    }
  }

  render(): void {
    for (const entry of this.systems) {
      entry.system.render?.();
    }
  }
}
