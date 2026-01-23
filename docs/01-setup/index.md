# Setup

This chapter gets a blank canvas on screen using Vite + TypeScript. We’ll wire up a basic HTML shell, define a few constants, and render a “Hello, World!” message in the middle of the canvas.

## What we’re building

- A full-screen page with a centered canvas.
- A fixed internal resolution of $800 \times 600$.
- A simple draw call that proves the render pipeline is working.

## Project entry points

The chapter is a standalone Vite app in chapters/chapter-01-setup with three files that matter:

- index.html — the HTML shell that mounts the app.
- src/main.ts — the startup script that creates the canvas and draws the text.
- src/style.css — minimal page styling to center the canvas.

## HTML shell

Vite uses index.html as the entry point. We just need a container and a module script.

```html
<body>
	<div id="app"></div>
	<script type="module" src="/src/main.ts"></script>
</body>
```

The app div is where we inject the canvas at runtime.

## Canvas constants

We centralize the dimensions and the starter message in constants.ts:

```ts
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const CANVAS_MSG = 'Hello, World!';
```

These values let us keep the canvas resolution independent from the browser size.

## Creating the canvas

main.ts creates the canvas, sizes it, and adds it to the DOM:

```ts
const app = document.getElementById('app')!;
const canvas = document.createElement('canvas');

canvas.style.aspectRatio = `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
canvas.id = 'game';

app.appendChild(canvas);
```

Important details:

- width and height set the internal render resolution (the coordinate system you draw in).
- aspect-ratio helps the canvas scale cleanly while keeping 800 × 600 proportions.
- We give the element an id so our CSS can target it.

### Canvas size vs. CSS size (critical concept)

The canvas has two sizes:

- Internal size: set by canvas.width and canvas.height. This defines the coordinate space for drawing.
- Display size: set by CSS width/height. This is how large the canvas appears on screen.

We keep internal size fixed at 800 × 600 so game logic and rendering math stay consistent. CSS scales the element to fit the window, which is why the canvas can look large while still drawing in a stable coordinate system.

## Drawing text

Once we have a 2D context, we can render a centered message:

```ts
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#ffffff';
ctx.font = '24px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(CANVAS_MSG, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
```

This confirms the canvas is alive, your pipeline works, and you’re ready for more interesting drawing in the next chapter.

## Styling the page

The CSS keeps the canvas centered and scales it to fit while preserving aspect ratio. This exact setup is reused in every chapter, so it’s worth understanding each rule.

```css
html, body {
	margin: 0;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

#app {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}

#game {
	width: 100%;
	height: 100%;
	object-fit: contain;
	image-rendering: crisp-edges;
}
```

### html, body

- width: 100% and height: 100% make the page fill the viewport.
- margin: 0 removes the default browser margins so the canvas can truly fill the screen.
- overflow: hidden prevents scrollbars when the canvas scales.

### #app

The app container is a flex box that centers the canvas:

- `display: flex` enables flexbox layout.
- `justify-content: center` centers on the main axis and `align-items: center` centers on the cross axis (with the default row direction, that means horizontal and vertical centering).
- `width`/`height: 100%` make the container fill the viewport.

This gives a predictable, centered frame regardless of window size.

### #game (the canvas)

- width: 100% and height: 100% allow the canvas element to scale to the container.
- object-fit: contain preserves the 800 × 600 aspect ratio and adds letterboxing if needed.
- image-rendering: crisp-edges favors sharp pixels when the canvas is scaled. This is helpful for pixel art; for smooth vector-like scaling, you could remove it.

Note: The CSS size can change every frame if the window is resized, but the internal render resolution does not. That’s why drawing uses the fixed constants and never uses DOM sizes for game math.

### Why this setup stays stable across chapters

- It decouples game logic from the browser window.
- It provides a single place (CSS) to control display scaling.
- It makes debugging easier because the coordinate system never changes.

## Run the chapter

From the repo root, run:

- npm run dev:ch01

You should see a black canvas with “Hello, World!” centered on screen.

## Checklist

- Canvas is visible and centered.
- Text renders in the middle.
- You understand the difference between CSS size and canvas resolution.

## Library changes

None. Chapters 1–2 are app‑only and don’t use lib yet.

Next up: drawing shapes and sprites.
