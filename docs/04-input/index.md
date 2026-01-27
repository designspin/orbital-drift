# Input

This chapter introduces keyboard input and shows how to drive movement and rotation from arrow keys. We add a shared `Input` helper in lib, then use it in the engine and the demo.

<DemoModal title="Chapter 4 Demo" src="/demos/ch04/" button-label="Play demo" />

## The input helper (lib, ch04)

The input system keeps track of three states:

- **Held keys** (`isDown`) — currently pressed.
- **Just pressed** (`wasPressed`) — pressed this frame only.
- **Just released** (`wasReleased`) — released this frame only.

Here is the input class as it exists at the ch04 tag:

```ts
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
```

### How it works

- `keydown` adds the key to the held set and records a one‑frame `justPressed` state.
- `keyup` removes the key and records a one‑frame `justReleased` state.
- `update()` clears the one‑frame sets and must be called once per frame.

Key values use `KeyboardEvent.key`, so arrows are `ArrowLeft`, `ArrowRight`, and `ArrowUp`.

## Engine integration (ch04)

At this tag, the engine owns an `Input` instance and updates it every frame:

- `this.input` is available in subclasses.
- `this.input.update()` runs at the end of each frame to clear one‑frame states.
- Pressing `Escape` toggles pause by stopping or resuming the loop.

This makes it easy for any chapter to check keys during `update()`.

## Using input in the demo

In `update()`, we read arrow keys to steer and thrust:

```ts
if (this.input.isDown('ArrowLeft')) {
	this.playerAngle -= 180 * deltaTime;
}
if (this.input.isDown('ArrowRight')) {
	this.playerAngle += 180 * deltaTime;
}

if (this.input.isDown('ArrowUp')) {
	this.playerThrust = 200;
} else {
	this.playerThrust = 0;
}
```

The rest of the update applies thrust to velocity, friction, and wraps the position so the ship re‑enters from the opposite edge.

## Library changes

- Added `lib/Input` for keyboard state tracking.
- Engine now owns an `Input` instance and calls `input.update()` every frame.
- `Escape` toggles pause inside the engine loop.
