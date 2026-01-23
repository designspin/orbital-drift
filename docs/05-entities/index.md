# Entities

This chapter introduces the core entity system. Instead of updating everything in `main.ts`, we create reusable objects (entities) that own their own update and render logic, then let the engine manage them.

<DemoModal title="Chapter 5 Demo" src="/demos/ch05/" button-label="Play demo" />

### Why entities?

Beginners usually start with one big `update()` function. That works until the game grows. Entities let you split behavior into small, reusable pieces so each object “knows how to update itself.”

## What we add

- A base `Entity` class and `iEntity` interface.
- An `EntityManager` to update and render a list of entities.
- A simple `Vec2` type for position/velocity.
- Engine support for `addEntity()` and an `onInit()` hook.

## The Entity contract (lib, ch05)

Entities have position, alive state, and two methods:

```ts
export interface iEntity {
	position: Vec2;
	alive: boolean;
	update(deltaTime: number, screenSize?: Vec2): void;
	render(ctx: CanvasRenderingContext2D): void;
}
```

The abstract `Entity` base class just wires up the common fields so subclasses can focus on behavior.

## EntityManager

`EntityManager` owns a list and handles the per‑frame lifecycle:

- `add()` and `remove()` manage the list.
- `update()` calls each entity and removes any that are no longer alive.
- `render()` draws each entity.

This is the first step toward a real engine loop with actors.

Beginner tip: the `alive` flag is a simple way to remove objects without worrying about array mutations mid‑loop.

## Player entity

`Player` extends `Entity` and encapsulates movement, rotation, and rendering. The shape is drawn in local space and then rotated at the player’s position.

The input logic is separated into `PlayerController`, which turns keyboard state into a rotation value and thrust toggle:

```ts
getRotation(): number {
	if(this.input.isDown("ArrowLeft")) return -1;
	if(this.input.isDown("ArrowRight")) return 1;
	return 0;
}

isThrusting(): boolean {
	return this.input.isDown("ArrowUp");
}
```

This pattern keeps input wiring out of the entity itself.

Why that matters: you can swap input sources later (keyboard, gamepad, AI) without changing the `Player` class.

## Engine integration

The engine adds an `onInit()` hook and a convenience method:

- `onInit()` is called after the canvas is created.
- `addEntity()` forwards to the entity manager.
- `update()` and `render()` now delegate to the manager.

## Demo flow

In `main.ts`, we create a player and register it during `onInit()`:

```ts
protected override onInit(): void {
	const player = new Player(
		{ x: this.ctx.canvas.width / 2, y: this.ctx.canvas.height / 2 },
		new PlayerController(this.input),
	);
	this.addEntity(player);
}
```

From this point on, the player updates and renders automatically every frame.

## Pattern to remember

**Entities own behavior; the engine owns orchestration.** That separation keeps your game loop clean.

## Library changes

- Added `lib/Entity` and `lib/EntityManager`.
- Added `lib/types/vec2` and `lib/types/index`.
- Engine now exposes `addEntity()` and calls the entity manager each frame.
