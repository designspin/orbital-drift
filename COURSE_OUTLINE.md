# Canvas Games with TypeScript — Course Outline

## Course goals
- Learn the Canvas 2D API through small, iterative game projects.
- Build a reusable game loop and input system in TypeScript.
- Practice organizing game code into clean, testable modules.
- Understand core game dev concepts: update/render loops, delta time, collisions, sprites, and state.

## Audience & prerequisites
- Comfortable with basic JavaScript/TypeScript and HTML/CSS.
- Familiar with VS Code and running `npm` scripts.

## Course format
- Short, focused chapters with a single main concept.
- Each chapter ends with a small playable result and optional extensions.
- Each chapter builds on the previous one, reusing a shared `lib` package where helpful.

---

## Chapter 01 — Setup & first canvas
**Outcome:** A working TypeScript + Vite project that renders a blank canvas at the correct size.

**Topics:**
- Repo structure overview (monorepo with `chapters/` and `lib/`).
- Vite + TypeScript basics and how to run dev/build scripts.
- Creating the `<canvas>` in TypeScript and appending to `#app`.
- Setting logical size with `CANVAS_WIDTH`/`CANVAS_HEIGHT`.
- Keeping display size responsive with CSS and `aspect-ratio`.
- Basic 2D context setup and a “Hello, World!” render.


**Exercises:**
- Change canvas size dynamically based on window size.
- Add a background color fill.

---

## Chapter 02 — Drawing primitives
**Outcome:** Draw simple shapes and text to build a static scene.

**Topics:**
- Rectangles, circles, lines, and text.
- Fill vs stroke styles.
- Coordinate system basics.
- Saving/restoring canvas state.

**Exercises:**
- Draw a simple “level” layout with rectangles.
- Render a score label in the top-left corner.

---

## Chapter 03 — The game loop
**Outcome:** A consistent update/render loop using `requestAnimationFrame`.

**Topics:**
- Separating update and render steps.
- Delta time and frame-independent movement.
- Fixed vs variable time step (intro only).

**Exercises:**
- Animate a moving square across the screen.
- Pause/resume the loop with a key press.

---

## Chapter 04 — Input handling
**Outcome:** Keyboard input controls a player on screen.

**Topics:**
- Keydown/keyup events.
- Input state tracking.
- Mapping keys to actions.

**Exercises:**
- Implement WASD movement.
- Add a sprint modifier key.

---

## Chapter 05 — Player entity & movement
**Outcome:** A simple player object with position, velocity, and movement limits.

**Topics:**
- Entity data modeling.
- Acceleration and friction.
- Screen bounds and clamping.

**Exercises:**
- Add diagonal movement normalization.
- Add a “dash” action with cooldown.

---

## Chapter 06 — Collision basics
**Outcome:** Player collides with obstacles.

**Topics:**
- Axis-aligned bounding boxes (AABB).
- Collision detection vs resolution.
- Separating axes for resolution.

**Exercises:**
- Add multiple obstacles.
- Visualize collision bounds for debugging.

---

## Chapter 07 — Sprites & animation
**Outcome:** Replace primitives with a sprite sheet animation.

**Topics:**
- Loading images.
- Sprite sheets and frame selection.
- Animation timing.

**Exercises:**
- Switch animations based on movement direction.
- Add an idle animation.

---

## Chapter 08 — Camera & world
**Outcome:** A larger world with a camera that follows the player.

**Topics:**
- World vs screen coordinates.
- Camera transform (translate).
- Parallax background idea (intro).

**Exercises:**
- Add a simple scrolling background.
- Clamp the camera to world bounds.

---

## Chapter 09 — Game states & UI
**Outcome:** Title screen, playing state, and game over screen.

**Topics:**
- State machine concept.
- Rendering different UI layers.
- Basic text-based UI buttons.

**Exercises:**
- Add a pause menu.
- Track and display score/time.

---

## Chapter 10 — Audio & polish
**Outcome:** Add sound effects and small polish improvements.

**Topics:**
- Audio loading and playback.
- Simple sound manager.
- Screen shake, particle burst (intro).

**Exercises:**
- Add a jump or hit sound effect.
- Add a small particle effect on collision.

---

## Chapter 11 — Build a mini game
**Outcome:** Combine learned concepts into a small complete game.

**Topics:**
- Designing a simple gameplay loop.
- Win/lose conditions.
- Tuning difficulty.

**Exercises:**
- Add a high-score list stored in `localStorage`.
- Add an endless mode.

---

## Chapter 12 — Packaging & sharing
**Outcome:** Build the project for production and share it.

**Topics:**
- `vite build` and output structure.
- Hosting options (GitHub Pages, static hosting).
- Basic performance considerations.

**Exercises:**
- Deploy the mini game.
- Add a simple loading screen.

---

## Optional appendices
- **A. TypeScript tips for game dev** (types for vectors, entities, and config)
- **B. Debugging tools** (FPS counter, debug overlays)
- **C. Common pitfalls** (blurry canvas, resizing issues, input lag)

## Notes on repo structure
- `chapters/` contains chapter-specific examples.
- `lib/` contains shared helpers that can be reused across chapters.

## Suggested pacing
- 12 short chapters, 15–30 minutes each.
- Total course length: ~4–6 hours.
