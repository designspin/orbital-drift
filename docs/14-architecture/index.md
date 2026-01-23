# Architecture

This chapter reorganizes the project into systems. Gameplay is split into focused modules (waves, scoring, effects, HUD), and a `SystemManager` orchestrates them.

<DemoModal title="Chapter 14 Demo" src="/demos/ch14/" button-label="Play demo" />

## SystemManager (lib, ch14)

The new `SystemManager` is a minimal scheduler:

- `add(system, order)` registers a system with an update order.
- `update(deltaTime)` runs each system in order.
- `render()` optionally runs render hooks.

This keeps large game logic out of the main class.

### Why systems?

As the game grows, `main.ts` becomes too big to reason about. Systems let you group related logic and treat each group as a mini‑module. That makes it easier to test, tweak, and reuse.

## Systems in this chapter

- **WaveSystem** — controls wave progression and enemy/asteroid spawning.
- **ScoreSystem** — handles scoring rules and exposes `getScore()`.
- **EffectsSystem** — listens to events and triggers sounds + particles.
- **HudSystem** — builds UI layers and exposes show/hide for HUD and pause.

Each system is small, testable, and has a single responsibility.

Beginner tip: if a class does “too many different things,” it should probably be split into systems.

## Events and systems

We keep the `EventBus` and let systems subscribe:

- `EffectsSystem` plays audio and emits particles.
- `ScoreSystem` updates points.
- `WaveSystem` tracks remaining enemies/asteroids.

This reduces coupling between gameplay objects.

## Centralized config

Gameplay tuning values are moved into `config.ts` so you can tweak balance without touching logic.

This is a classic separation: **data** in config, **behavior** in systems.

## Library changes

- Added `lib/Systems` with `System` and `SystemManager`.
- `ParticleSystem` gains a `clear()` helper used during resets.
