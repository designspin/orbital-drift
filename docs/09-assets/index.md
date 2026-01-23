# Assets

This chapter adds an asset manager and a loading state. We queue images, load them asynchronously, show a progress bar, and only start the game once everything is ready.

<DemoModal title="Chapter 9 Demo" src="/demos/ch09/" button-label="Play demo" />

## AssetManager (lib, ch09)

The asset manager focuses on image loading:

- `queueImage(key, src)` registers an image.
- `loadAll(onProgress)` loads all queued images in parallel.
- `getImage(key)` retrieves a loaded image or throws if missing.

Progress is reported as `{ loaded, total, percent }` so the UI can show a loading bar.

### Why queue + load?

Assets load asynchronously. If you try to draw an image before it finishes loading, you’ll get blank frames. By queueing everything up front and waiting for `loadAll()`, you guarantee the game only starts when all assets are ready.

## Loading state

We add a new `loading` game state that:

1. Queues images.
2. Calls `loadAll` and updates `progress`.
3. Switches to the menu when finished.

This keeps the player from seeing missing sprites or silent audio.

```ts
this.assets.queueImage('ship', '/spaceship.png');
void this.assets.loadAll((p) => {
	this.progress = p.percent;
}).then(() => {
	this.shipSprite = this.assets.getImage('ship');
	this.stateMachine.set('menu');
});
```

## Rendering the loading bar

`renderLoading()` draws a simple progress bar and label. This is a common pattern you’ll reuse for larger asset sets later.

Beginner tip: the progress bar is just a rectangle whose width is `barWidth * progress`.

## Using loaded assets

When the player is spawned, we pass the loaded `shipSprite` into the player entity. The player renders the image instead of the procedural ship outline.

This is the first time the visual style of the game becomes “real art” instead of placeholder shapes.

## Library changes

- Added `lib/Assets` with image queueing and progress reporting.
