# Drawing

This chapter is a guided tour of the Canvas 2D API. We draw basic primitives, explore stroke styles, text, gradients, transforms, and images. It’s a grab‑bag of techniques you’ll reuse constantly in later chapters.

## The canvas context

Everything is done through a 2D rendering context:

```ts
const ctx = canvas.getContext('2d')!;
```

Think of `ctx` as the drawing state + toolset. It holds **style state** (fill, stroke, line width, fonts, alignment) and **transform state** (translation, rotation, scale). When you call draw methods like `fillRect` or `strokeText`, they use the current state.

### Why state matters

Canvas is immediate mode: drawing commands paint pixels right away, and there’s no scene graph. If you change the state and draw again, those changes apply to everything that follows until you change the state again.

## Shapes

### Rectangles

```ts
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);

ctx.strokeStyle = 'blue';
ctx.lineWidth = 5;
ctx.strokeRect(200, 50, 100, 100);
```

Rectangles are the simplest draw calls. `fillRect` paints the interior; `strokeRect` paints only the outline.

Parameter meanings:

- `fillRect(x, y, width, height)`
- `strokeRect(x, y, width, height)`

Where `x, y` are the top‑left corner in canvas coordinates.

### Circles and arcs

```ts
ctx.beginPath();
ctx.arc(100, 300, 50, 0, Math.PI * 2);
ctx.fill();
```

`arc` builds a path. You must call `beginPath()` before drawing a new shape or you’ll accidentally connect it to previous lines. `fill()` or `stroke()` then renders that path.

Parameter meanings:

- `arc(x, y, radius, startAngle, endAngle, anticlockwise?)`

Angles are in radians. A full circle is $2\pi$.

### Lines, joins, and caps

```ts
ctx.strokeStyle = 'purple';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(400, 50);
ctx.lineTo(550, 150);
ctx.lineTo(400, 250);
ctx.closePath();
ctx.stroke();
```

Line joins and caps affect how corners and endpoints are rendered:
Parameter meanings:

- `moveTo(x, y)` sets the current point.
- `lineTo(x, y)` draws a line from the current point to the new point.

```ts
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
```

## Gradients

```ts
const gradient = ctx.createLinearGradient(50, 400, 150, 500);
gradient.addColorStop(0, 'yellow');
gradient.addColorStop(1, 'red');

ctx.fillStyle = gradient;
ctx.fillRect(50, 400, 100, 100);
```

Gradients are just another fill style. Once assigned, they behave like a normal color.

Parameter meanings:

- `createLinearGradient(x0, y0, x1, y1)` defines the start and end points of the gradient line.
- `addColorStop(offset, color)` where `offset` is from $0$ to $1$.

## Text

```ts
ctx.fillStyle = 'cyan';
ctx.font = 'bold 30px serif';
ctx.textAlign = 'left';
ctx.textBaseline = 'alphabetic';
ctx.fillText('Styled Text', 200, 450);
```

Text rendering uses the same fill/stroke model. Font strings match CSS syntax.

Parameter meanings:

- `fillText(text, x, y, maxWidth?)`
- `strokeText(text, x, y, maxWidth?)`

`x, y` are the baseline position for the text.

## Save and restore

Canvas lets you snapshot and restore the full drawing state:

```ts
ctx.save();
ctx.fillStyle = 'white';
ctx.fillRect(425, 425, 50, 50);
ctx.restore();
```

### What `save()` stores

It captures **everything** about the state at that moment:

- Styles: `fillStyle`, `strokeStyle`, `lineWidth`, `font`, `textAlign`, etc.
- Transforms: translation, rotation, scale.
- Clipping region.

### What `restore()` does

It pops the last saved state and re‑applies it. This is crucial when you want to make a temporary style or transform change without manually resetting all the properties afterward.

In this chapter, we draw a black square, save, draw a white square, restore, then draw another square in black. The white square is the only one affected by the temporary style change.

## Transforms

```ts
ctx.save();
ctx.translate(600, 450);
ctx.rotate(Math.PI / 4);
ctx.fillRect(-25, -25, 50, 50);
ctx.restore();
```

Transforms move and rotate the entire drawing coordinate system. The rectangle is drawn around the origin after translating to $(600, 450)$ and rotating $45^\circ$.

Parameter meanings:

- `translate(tx, ty)` moves the origin.
- `rotate(angleRadians)` rotates around the origin.
- `scale(sx, sy)` scales axes independently.

## Images

```ts
const image = new Image();
image.src = spaceship;
image.onload = () => {
	ctx.drawImage(image, 680, 50, 100, 100);
};
```

Images load asynchronously, so drawing happens in `onload`. Later chapters wrap this in an asset manager so you can queue and reuse images safely.

Parameter meanings:

- `drawImage(image, dx, dy)` draws at a destination point.
- `drawImage(image, dx, dy, dWidth, dHeight)` draws scaled to a size.

There’s also a 9‑argument form for source cropping that we’ll use later.

### Rotating an image

The rotated example uses transform + scale:

```ts
ctx.save();
ctx.translate(700, 300);
ctx.rotate(Math.PI / 6);
ctx.scale(0.1, 0.1);
ctx.drawImage(image, -image.width / 2, -image.height / 5);
ctx.restore();
```

Because `drawImage` uses the current transform, you can rotate and scale around any pivot by translating first.

## Key takeaways

- The 2D context is stateful. Every draw call depends on current state.
- `save()`/`restore()` are your best tools for isolating temporary style or transform changes.
- Paths require `beginPath()` to avoid accidental connections.
- Canvas is immediate mode: once pixels are drawn, they stay until you clear or redraw.

## Library changes

None. Chapters 1–2 are app‑only and don’t use lib yet.
