# Particles

This chapter adds a reusable particle system and wires it into gameplay for explosions, muzzle flashes, and thruster trails.

<DemoModal title="Chapter 12 Demo" src="/demos/ch12/" button-label="Play demo" />

## ParticleSystem (lib, ch12)

The new `ParticleSystem` is an `Entity` that manages a list of particles. Each particle stores position, velocity, life, size, opacity, color, and optional sprite data.

### Why make particles an entity?

Because the engine already updates and renders entities. By making the particle system an entity, it automatically ticks every frame without special case code.

Key features:

- **Flexible ranges**: Most properties accept a single number or a `{ min, max }` range.
- **Color gradients**: Colors can be static, lerped between two colors, or computed by a function.
- **Spawn shapes**: Emit from a point, circle, or rectangle.
- **Blend modes**: Use additive blending for glowy effects.

### Emitting particles

The main API is `emit(options)`:

```ts
this.particles.emit({
	position,
	count: 14,
	life: { min: 0.12, max: 0.4 },
	speed: { min: 80, max: 220 },
	angle: { min: angle - 18, max: angle + 18 },
	size: { min: 2, max: 4 },
	sizeEnd: 0,
	opacity: 1,
	opacityEnd: 0,
	color: { start: '#ffe6a7', end: '#ff6b6b' },
	blendMode: 'lighter',
	shape: 'circle',
});
```

Particles update and render automatically because the system is added as an entity.

Beginner tip: particles are just tiny objects that fade out over time. The “magic” is in the random ranges and short lifetimes.

## Gameplay effects

We add three effect helpers:

- **Muzzle flash** when the player or enemies shoot.
- **Explosion** on asteroid/enemy destruction and player death.
- **Thruster trail** while accelerating.

Each effect is a small wrapper around `particles.emit()` with tuned parameters.

Why wrappers? They keep your gameplay code clean. Instead of repeating 15 parameters everywhere, you call `emitExplosion()` or `emitMuzzleFlash()`.

## Keeping the world running on respawn

During respawn, the game keeps the simulation active by updating world entities and particles while the player is temporarily absent. This keeps asteroids and enemies moving in the background.

This helps the game feel continuous instead of “paused” during respawn.

## Library changes

- Added `lib/Particles` with `ParticleSystem` and `ParticleEmitter`.
