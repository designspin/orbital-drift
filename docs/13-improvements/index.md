# Improvements

This chapter is a big polish pass: event‑driven effects, wave system, radar UI, fonts, title/game‑over visuals, and collision masks.

<DemoModal title="Chapter 13 Demo" src="/demos/ch13/" button-label="Play demo" />

## Event bus (lib, ch13)

We add a lightweight `EventBus` to decouple systems. Gameplay emits events like `shot:player` or `enemy:destroyed`, and other systems react without tight coupling.

```ts
const events = new EventBus<GameEvents>();
events.emit('shot:player', { position, angle });
```

Beginner tip: this is “publish/subscribe.” It keeps your gameplay logic small because you don’t have to call audio or particle functions directly from every place that shoots.

## Collision layers and masks

Colliders can now declare `layer` and `mask` values. The entity manager skips collision checks when masks don’t overlap. This makes it easy to prevent friendly‑fire or ignore bullets hitting bullets.

Think of `layer` as “what I am” and `mask` as “what I care about.”

## Easing functions

New easing helpers (`easeInSine`, `easeInOutQuad`, etc.) are used for title pulsing and UI motion.

Easing makes motion feel natural — it starts slow, speeds up, then slows down.

## AssetManager fonts

`AssetManager` gains `queueFont()` to load custom fonts via `FontFace`. The chapter uses Space Grotesk and updates UI text to use it consistently.

Fonts are assets too. Loading them early prevents layout jumps when the menu appears.

## Radar UI

The HUD now includes a radar panel showing asteroids, enemies, and the player as tiny dots. It uses world size to map positions into the radar panel.

This is a nice example of converting world coordinates into UI coordinates.

## Wave system

Enemies and asteroids are spawned in waves with a short transition overlay. Wave counts scale difficulty and score values.

Waves keep the pacing clear and give the player a moment to breathe.

## Title and game‑over screens

- Animated starfield background.
- Pulsing “Press Enter” prompt using easing.
- Game‑over fade and auto return to menu after a short delay.

## Library changes

- Added `lib/Events` (EventBus).
- Added `lib/Easing`.
- Extended `lib/Assets` with `queueFont()`.
- Added `layer` and `mask` to colliders and filtering in `EntityManager`.
