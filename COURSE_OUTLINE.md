# Canvas TS Engine — Remaining Chapters (Post CH06)

## CH07 — UI / Overlay Layer - Done
- Score, health bars, menus, dialogs
- Layer drawn **after game world**
- Optional debug overlays toggle

## CH08 — Game State System
- Manage multiple states: `menu`, `playing`, `paused`, `gameOver`
- Switch states cleanly
- Delegated `update()` and `render()` per state

## CH09 — Asset Loading System
- Preload images, sprite sheets, fonts
- Reuse assets across entities
- Optional loading screen

## CH10 — Camera / World
- Follow player or scroll world
- Support maps larger than canvas

## CH11 — Sound & Music System - Done
- Play sound effects and background music
- Volume control, channels, multiple tracks

## CH12 — Particles & Effects - Done
- Explosions, trails, sparks, animated effects
- Can be implemented as short‑lived entities

---

## Optional / Advanced Chapters

### Collision Enhancements
- Collision layers / masks (e.g., player bullets vs player)
- Polygonal collisions
- Broad‑phase optimization (quadtrees / spatial grids)

### Input System Enhancements
- Mouse, touch, joystick/controller
- Action mapping abstraction (jump, shoot, move instead of raw keys)

### Entity System Enhancements
- Optional component‑style extensions
- Event messaging between entities
- Layering (z‑index / draw order)

### Debug Tools
- Visual debug overlays (colliders, FPS, entity bounds)
- Optional toggles for teaching / development
