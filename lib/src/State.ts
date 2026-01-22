export interface GameState {
  name: string;
  enter?(prev?: GameState): void;
  exit?(next?: GameState): void;
  update(deltaTime: number): void;
  render(): void;
}

export class StateMachine<TState extends GameState = GameState> {
  private states = new Map<string, TState>();
  private current?: TState;

  add(state: TState): this {
    this.states.set(state.name, state);
    return this;
  }

  set(name: string): void {
    const next = this.states.get(name);
    if (!next) {
      throw new Error(`State not found: ${name}`);
    }

    const prev = this.current;
    if (prev && prev.name === next.name) return;

    prev?.exit?.(next);
    this.current = next;
    next.enter?.(prev);
  }

  update(deltaTime: number): void {
    this.current?.update(deltaTime);
  }

  render(): void {
    this.current?.render();
  }

  get currentState(): TState | undefined {
    return this.current;
  }
}