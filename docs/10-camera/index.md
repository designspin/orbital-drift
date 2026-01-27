# Camera

This chapter introduces a camera so the world can be larger than the screen. The player moves in a 2400 × 1800 world while the camera follows and clamps to the world bounds.

<DemoModal title="Chapter 10 Demo" src="/demos/ch10/" button-label="Play demo" />

## Camera (lib, ch10)

The `Camera` stores a world‑space position and a zoom level:

- `follow(target, screenSize, worldSize)` centers on the target and clamps to the world.
- `apply(ctx)` scales and translates the canvas so you can draw in world coordinates.
- `unapply(ctx)` restores the canvas state.

This keeps all entity rendering in world space, while the camera handles the view transform.

### Why a camera?

Without a camera, your world size is limited to the screen. A camera lets you build larger levels and still render everything using the same world coordinates.

## World vs viewport

The game defines:

- `worldSize` — the total playable area.
- `viewportSize` — the canvas size.

We override `screenSize` in the engine subclass to return the world size so entity logic (like wrapping/clamping) uses world dimensions instead of the viewport.

## Applying the camera

In `renderPlaying()`:

```ts
this.camera.apply(this.ctx);
// draw world background, grid, and entities
this.entityManager.render(this.ctx);
this.camera.unapply(this.ctx);
```

Everything drawn between `apply` and `unapply` is in world coordinates.

Beginner tip: `apply` is just `scale` + `translate` on the canvas context. It doesn’t move objects — it moves the camera’s view.

## Dynamic zoom

The camera zooms out slightly as the player speeds up. This gives more space at high velocity and a tighter view at low speed.

Why it matters: fast motion feels easier to control when you can see more of the world ahead.

```ts
const targetZoom = maxZoom - (maxZoom - minZoom) * t;
this.camera.zoom += (targetZoom - this.camera.zoom) * Math.min(1, deltaTime * 6);
```

## UI still in screen space

UI is rendered on a separate canvas, so it remains fixed to the screen while the camera moves the world underneath.

This is why HUD elements never wobble when the player moves.

## Library changes

- Added `lib/Camera`.
- Added `lib/ui/ShieldBar` and exported it through `lib/ui`.
