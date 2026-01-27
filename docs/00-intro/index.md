# Introduction

Welcome! This book walks you through building a small canvas game engine in TypeScript and then using it to create a complete, playable game. Each chapter adds one focused capability to the engine and applies it immediately in a concrete demo.

## Who this is for
- You’re comfortable with basic JavaScript/TypeScript syntax.
- You want to understand how a 2D game engine works under the hood.
- You prefer hands‑on, incremental learning over heavy theory.

## What you’ll build
- A lightweight engine with rendering, input, entities, collisions, UI, assets, audio, particles, and camera.
- A fully‑featured game that evolves across chapters.
- Reusable architecture patterns (state machine, events, systems, and managers).

## How the book is structured
Each chapter weaves three threads (sometimes explicitly, sometimes implicitly):
1. **Concept** — The idea and why it matters.
2. **Implementation** — The exact code added to the engine.
3. **Application** — The feature used in a real game scenario.

Early chapters like Setup and Drawing are more about scaffolding and API fluency, while later chapters make the game usage more explicit.

By the end, the engine is not a toy, it’s a real foundation you can extend.

## What you need
- Node.js and npm
- A code editor (VS Code recommended)
- Basic TypeScript knowledge

## Repository layout
- `lib/` contains the engine code.
- `chapters/` contains a runnable project per chapter.
- `docs/` is the book source.

## How to use this book
- Read a chapter, then run the matching chapter project.
- Compare what changed vs. the previous chapter.
- Keep your own notes and experiment with variations.

## Chapter tags
Every completed chapter is tagged in git. This makes it easy to:

- Check out the exact state for a chapter.
- Diff changes between chapters.
- Reset your work if you want a clean starting point.

Example:

- ch01, ch02, ch03, …

You can list tags with `git tag` and switch with `git checkout <tag>`.

## Library changes per chapter
Starting in chapter 3, the shared engine lives in lib/. Each chapter notes any new or changed lib features so you can quickly see what the engine gained at that point. Chapters 1–2 are pure app code and do not touch lib.

## Conventions
- `Engine` methods are core loop hooks.
- Entities implement `update()` and `render()`.
- Systems are decoupled modules that handle specific responsibilities.

If you’re ready, go to the next chapter and set up your environment.
