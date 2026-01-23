# UI

This chapter adds a dedicated UI layer that renders on a separate canvas above the game. We build simple UI elements (panels, text, score) and show how to toggle a pause overlay.

<DemoModal title="Chapter 7 Demo" src="/demos/ch07/" button-label="Play demo" />

## UI architecture (lib, ch07)

The UI system is built around three ideas:

1. **A second canvas** overlaid on top of the game canvas.
2. **UI layers** (`UILayer`) that group UI elements.
3. **UI elements** derived from `BaseUIElement` with anchor + offset positioning.

Why this matters: once your game camera moves, you need UI that stays fixed to the screen. A separate UI canvas solves that cleanly.

### BaseUIElement and anchors

`BaseUIElement` provides positioning via anchors:

- `top-left`, `top-right`, `bottom-left`, `bottom-right`, `center`

Each element resolves its anchor to a point in the UI canvas, then applies offsets.

Beginner tip: anchors are just “reference points.” They stop you from doing manual pixel math every time you move a panel.

### UILayer

`UILayer` is a container that can be shown/hidden as a group. It updates and renders all child elements if visible.

### UIPanel

`UIPanel` draws a rectangle (or rounded rect) and then renders child elements within its bounds. It’s used as a layout container for score and lives.

### ScoreDisplay and TextDisplay

These render text using a callback, which keeps UI reactive without manual updates:

- `getScore()` for score
- `getText()` for pause message

That callback pattern means the UI always reflects the latest game data.

## Engine integration

The engine now creates a UI canvas automatically when you add the first layer. It keeps the UI canvas aligned with the game canvas sizing and aspect ratio.

This is why UI elements don’t stretch or drift when the window resizes.

Key additions:

- `addUILayer()` to register layers.
- `setUiUpdateInterval(ms)` to throttle UI updates.
- `updateAndRenderUI()` runs after the main render pass.

## HUD and pause UI

The chapter builds two layers:

- **HUD layer** with score and lives.
- **Pause layer** with a centered “PAUSED” panel.

The pause overlay is toggled by overriding `onPause()` and `onResume()` in the engine subclass:

```ts
protected override onPause(): void {
	this.pauseLayer.setVisible(true);
}

protected override onResume(): void {
	this.pauseLayer.setVisible(false);
}
```

## Lives indicator

`ShipIndicators` is a custom UI element that draws mini ship icons based on remaining lives. It uses the same anchor/offset system as the built‑in UI elements.

Why a custom element? It shows how to extend the UI system without changing the engine.

## Library changes

- Added UI module: `UILayer`, `BaseUIElement`, `UIPanel`, `ScoreDisplay`, `TextDisplay`.
- Engine now supports UI canvases and throttled UI updates.
