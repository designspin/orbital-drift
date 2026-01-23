# Game Loop

This chapter introduces the core loop: **update** for simulation and **render** for drawing. We’ll animate a rotating square, scale it over time, and display FPS so you can see the loop in action.

<DemoModal title="Chapter 3 Demo" src="/demos/ch03/" button-label="Play demo" />

## The Engine base class

We extend the shared `Engine` from the library:

```ts
class CH03 extends Engine {
	// ...
}
```

The engine calls `update(deltaTime)` and `render()` on every frame once started.

## Engine implementation (from lib, ch03)

This is the Engine class as it exists at the ch03 tag. Later chapters expand it with input, entities, and UI layers.

```ts
import { Timer } from './Timer';

type EngineInitOptions = {
	selector: string;
	width?: number;
	height?: number;
	backgroundColor?: string;
};

export class Engine {
	protected timer: Timer = new Timer();
	private isRunning: boolean = false;
	protected ctx!: CanvasRenderingContext2D;

	init(opts: EngineInitOptions): void {
			const app = document.querySelector<HTMLDivElement>(opts.selector);
			if (!app) {
					throw new Error(`Element with selector "${opts.selector}" not found.`);
			}
			const canvas = document.createElement('canvas');
			canvas.width = opts.width || 800;
			canvas.height = opts.height || 600;
			canvas.style.backgroundColor = opts.backgroundColor || 'black';
			canvas.id = 'game';

			app.appendChild(canvas);
			canvas.focus();

			const context = canvas.getContext('2d');
			if (!context) {
					throw new Error('Failed to get 2D context from canvas.');
			}
			this.ctx = context;
	}

	start() {
			this.isRunning = true;
			this.timer.resume();
			requestAnimationFrame(this.gameLoop.bind(this));
	}

	stop() {
			this.isRunning = false;
			this.timer.pause();
	}

	private gameLoop() {
			if (!this.isRunning) return;

			const deltaTime = this.timer.tick();

			this.update(deltaTime);
			this.render();

			requestAnimationFrame(this.gameLoop.bind(this));
	}

	protected update(deltaTime: number) {
			// Update game state here
	}

	protected render(renderCallback?: () => void) {
			this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
			this.ctx.save();

			if (renderCallback) {
					renderCallback();
			}

			this.ctx.restore();
	}
}
```

### What each part does

Here’s the detailed breakdown of the core pieces in the ch03 Engine:

- **State fields**
	- `timer` measures elapsed time and FPS.
	- `isRunning` gates the loop and prevents updates when stopped.
	- `ctx` is the 2D drawing context used by subclasses.

- **init(opts)**
	- Looks up the mount element using `selector`.
	- Creates the `<canvas>` element and sets internal size (`width`, `height`).
	- Applies `backgroundColor` directly to the canvas style.
	- Retrieves the 2D context and stores it in `this.ctx`.

- **start()**
	- Sets `isRunning` true.
	- Resumes the timer to reset timing.
	- Kicks off the loop with `requestAnimationFrame`.

- **stop()**
	- Sets `isRunning` false and pauses the timer.
	- The loop still schedules frames, but it exits early when not running.

- **gameLoop()**
	- Exits immediately if the engine is not running.
	- Calls `timer.tick()` to compute `deltaTime`.
	- Calls `update(deltaTime)` for simulation.
	- Calls `render()` for drawing.
	- Schedules the next frame via `requestAnimationFrame`.

- **update(deltaTime)**
	- Intended for subclasses to override.
	- Receives seconds since last frame, enabling frame‑rate‑independent motion.

- **render(renderCallback?)**
	- Clears the entire canvas with `clearRect`.
	- Wraps drawing in `save()`/`restore()` so subclasses can safely change styles or transforms.
	- If a callback is provided, it runs between save and restore.

## Update vs render

### `update(deltaTime)`

`deltaTime` is the elapsed time since the last frame in **seconds**. You use it to keep motion smooth and frame‑rate independent.

```ts
override update(deltaTime: number): void {
	this.cubeAngle += 90 * deltaTime;
	if (this.cubeAngle >= 360) {
		this.cubeAngle -= 360;
	}

	const time = this.timer.getGameTime();
	this.cubeSize = 100 + 50 * Math.sin(time * 2);
}
```

What’s happening:

- The square rotates at 90 degrees per second.
- `getGameTime()` gives total elapsed time, perfect for oscillations.
- `Math.sin()` drives a smooth size pulse between 50 and 150.

### `render()`

Render is where you draw. The engine provides a draw wrapper to clear and manage the frame:

```ts
override render(): void {
	super.render(() => {
		// drawing calls
	});
}
```

Inside, we:

- Translate to the center.
- Rotate the canvas.
- Draw the square centered on the origin.

```ts
const centerX = this.ctx.canvas.width / 2;
const centerY = this.ctx.canvas.height / 2;
const size = this.cubeSize;

this.ctx.save();
this.ctx.translate(centerX, centerY);
this.ctx.rotate((this.cubeAngle * Math.PI) / 180);
this.ctx.fillStyle = '#203897';
this.ctx.fillRect(-size / 2, -size / 2, size, size);
this.ctx.restore();
```

We then draw a small status line with FPS:

```ts
this.ctx.fillText(
	`Game Loop Running... FPS: ${this.timer.getFPS()}`,
	this.ctx.canvas.width / 2,
	this.ctx.canvas.height - 10
);
```

## The timer

The engine exposes a `timer` that keeps track of both **elapsed time** and **frame pacing**.

- `getGameTime()` returns total time since the engine started, in seconds.
- `getFPS()` returns a smoothed frame‑rate estimate based on recent frames.

### How time is used

- **Delta time** (passed into `update`) measures *how long the last frame took*. Multiply speeds by it to keep motion consistent across different frame rates.
- **Game time** is a continuously increasing clock. Use it for periodic effects (pulses, oscillations, timers).

### Why this matters

If you animate purely by frame count, the game runs faster on high‑refresh monitors and slower on low‑end machines. Using time keeps simulation stable and predictable.

### Timer implementation (from lib)

Here is the full `Timer` class used by the engine:

```ts
export class Timer {
	private gameTime: number = 0;
	private maxStep: number = 0.05;
	private lastTime: number = 0;
	private fps: number = 0;
	private isPaused: boolean = false;

	tick(): number {
		if (this.isPaused) {
			return 0;
		}

		const currentTime = performance.now();
		let deltaTime = (currentTime - this.lastTime) / 1000;
		this.fps = 1000 / (currentTime - this.lastTime);
		this.lastTime = currentTime;

		if (deltaTime > this.maxStep) {
			deltaTime = this.maxStep;
		}

		this.gameTime += deltaTime;
		return deltaTime;
	}

	pause(): void {
		this.isPaused = true;
	}

	resume(): void {
		this.isPaused = false;
		this.lastTime = performance.now();
	}

	getGameTime(): number {
		return this.gameTime;
	}

	getFPS(): number {
		return Math.round(this.fps);
	}
}
```

### How it works

- `performance.now()` returns a high‑resolution timestamp in milliseconds.
- `deltaTime` converts that to seconds, which is what we pass into `update`.
- `maxStep` clamps large time jumps (for example, when the tab is backgrounded) to keep physics stable.
- `gameTime` accumulates the clamped delta so total time stays consistent.
- `fps` is computed from the last frame duration and rounded for display.

### Pause and resume

When paused, `tick()` returns 0 and simulation stops. `resume()` resets `lastTime` to avoid a huge delta when the game continues.

### Full timer usage example

Below is the exact pattern used in this chapter, with comments explaining how each value is used:

```ts
override update(deltaTime: number): void {
	// deltaTime: seconds since last frame
	// rotate at 90 degrees per second
	this.cubeAngle += 90 * deltaTime;
	if (this.cubeAngle >= 360) {
		this.cubeAngle -= 360;
	}

	// game time: total seconds since start
	// use it for smooth oscillation
	const time = this.timer.getGameTime();
	this.cubeSize = 100 + 50 * Math.sin(time * 2);
}

override render(): void {
	super.render(() => {
		// FPS is a smoothed estimate of recent frames
		this.ctx.fillText(
			`Game Loop Running... FPS: ${this.timer.getFPS()}`,
			this.ctx.canvas.width / 2,
			this.ctx.canvas.height - 10
		);
	});
}
```

## Starting the loop

```ts
const engine = new CH03();

engine.init({
	selector: '#app',
	width: 800,
	height: 600,
	backgroundColor: '#4433ee',
});

engine.start();
```

`init()` builds the canvas and attaches it to the DOM. `start()` begins the main loop.

## Key takeaways

- Game logic lives in `update(deltaTime)`.
- Rendering lives in `render()`.
- Use `deltaTime` for frame‑rate‑independent motion.
- Use `save()`/`restore()` to isolate transforms.

## Library changes

This is the first chapter that uses the shared engine:

- `lib/Engine` is introduced and provides the core loop, canvas setup, and a `timer`.
- `lib/Timer` provides `getGameTime()` and `getFPS()` used in this chapter.
