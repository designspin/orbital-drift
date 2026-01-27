# Collision

This chapter adds collision detection, bullets, and destructible asteroids. We introduce lightweight collider types in the library, then use them to trigger events like splitting asteroids or destroying the player.

<DemoModal title="Chapter 6 Demo" src="/demos/ch06/" button-label="Play demo" />

## Collider types (lib, ch06)

The collision module defines simple collider shapes:

```ts
export interface CircleCollider extends BaseCollider {
	radius: number;
	colliderType: "circle";
}

export interface BoxCollider extends BaseCollider {
	width: number;
	height: number;
	colliderType: "box";
}
```

Any entity that implements one of these types can participate in collision checks.

Beginner tip: using interfaces means you can “opt in” to collisions just by adding a few fields.

## EntityManager collision pass

`EntityManager` now:

- Finds all entities with a `colliderType`.
- Checks collisions for each pair.
- Calls `onCollision()` on both entities when a hit occurs.

Supported tests:

- circle vs circle (distance check)
- box vs box (AABB overlap)
- circle vs box (closest‑point test)

This keeps collision logic centralized instead of scattering checks across the game.

Why this is helpful: you avoid duplicated math and keep all collision code in one place.

## Player, Bullet, Asteroid

All three implement `CircleCollider` with a `radius` and `colliderType: "circle"`.

- **Player** dies on collision.
- **Bullet** dies on collision and when it leaves the screen.
- **Asteroid** can split into smaller asteroids when hit.

### Asteroid splitting

`Asteroid.split()` returns two child asteroids at the next size tier. It applies a small offset and modifies their velocities so the fragments drift apart.

In this chapter, the game keeps a local list of asteroids and uses that list to add newly spawned fragments after the entity update pass.

## Shooting

In `update()`, we spawn a bullet when the player presses space:

```ts
if (this.input.wasPressed(" ")) {
	const angle = this.player.getAngle();
	const rad = (angle * Math.PI) / 180;
	const spawnOffset = this.player.radius * 1.2;
	const spawn = {
		x: this.player.position.x + Math.cos(rad) * spawnOffset,
		y: this.player.position.y + Math.sin(rad) * spawnOffset,
	};

	this.addEntity(new Bullet(spawn, angle));
}
```

The bullet inherits the player’s facing direction and moves forward at a fixed speed.

### Why we use a simple collision system

This is a **minimal, readable** collision pass. It’s not the fastest approach, but it’s easy to understand and perfect for a small game. Later, you can replace it with spatial partitioning for performance.

## Library changes

- Added `lib/Collision` with `CircleCollider` and `BoxCollider` types.
- `EntityManager` now runs collision checks and calls `onCollision()`.
