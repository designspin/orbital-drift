# State

This chapter introduces a simple state machine to organize game flow (menu → playing → paused → game over). Instead of one giant loop, each state owns its own update and render behavior.

<DemoModal title="Chapter 8 Demo" src="/demos/ch08/" button-label="Play demo" />

## State machine (lib, ch08)

The `StateMachine` stores named states and manages transitions:

- `add(state)` registers a state.
- `set(name)` switches state and calls `exit`/`enter` hooks.
- `update()` and `render()` forward to the active state.

Each state conforms to this interface:

```ts
export interface GameState {
	name: string;
	enter?(prev?: GameState): void;
	exit?(next?: GameState): void;
	update(deltaTime: number): void;
	render(): void;
}
```

## Wiring the engine to state

`CH08` overrides `update()` and `render()` to delegate to the state machine:

```ts
protected override update(deltaTime: number): void {
	this.stateMachine.update(deltaTime);
}

protected override render(): void {
	this.stateMachine.render();
}
```

That keeps state‑specific logic out of the engine loop.

### Why a state machine?

Beginner‑friendly reason: it prevents “if‑else soup.” Instead of sprinkling `if (paused)` checks everywhere, each state owns its own rules. You read one block and understand exactly what happens in that mode.

### Enter/exit hooks

`enter()` and `exit()` are perfect for one‑time transitions:

- Show or hide UI layers.
- Reset timers.
- Spawn or clear entities.

This keeps those actions from repeating every frame.

## States in this chapter

- **menu**: waits for Enter, shows title text.
- **playing**: runs the normal gameplay update/render.
- **paused**: overlays pause UI, resumes on `p`.
- **gameover**: shows score and waits for Enter.

Each state is a small object with `update` and `render` callbacks, plus optional `enter`/`exit` for UI toggles.

## Resetting the game

When the user starts a new run, `resetGame()`:

- resets score, lives, and asteroid list
- clears entities via `entityManager.clear()`
- spawns a new player and asteroids

This makes the state transitions clean and predictable.

## Pattern to remember

Use **state machines for flow**, and **entities/systems for behavior**. It keeps your code organized as features grow.

## Library changes

- Added `lib/State` with `GameState` and `StateMachine`.
- Engine remains unchanged except for minor support that enables this pattern.
