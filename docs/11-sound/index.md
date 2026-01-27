# Sound

This chapter adds audio. We extend the asset manager to queue sounds, introduce an `AudioManager`, and wire up SFX + background music.

<DemoModal title="Chapter 11 Demo" src="/demos/ch11/" button-label="Play demo" />

## AudioManager (lib, ch11)

The audio system wraps the Web Audio API:

- `loadSound(key, src)` decodes a sound into an `AudioBuffer`.
- `registerSound(key, buffer)` stores a buffer (useful with the asset loader).
- `playSound(key, volume)` plays one‑shot effects.
- `playMusic(key, volume)` loops a track and keeps a handle for volume/stop.

### Why use Web Audio?

Web Audio gives reliable timing and volume control, which is important for responsive gameplay sounds. It also lets us mix multiple sounds without managing `<audio>` tags.

## AssetManager changes

`AssetManager` now supports queued tasks and sounds:

- `queueSound(key, src, ctx)` adds a sound task using an `AudioContext`.
- `loadAll()` reports progress across images and tasks.
- `getSound(key)` retrieves the decoded buffer.

This keeps audio loading in the same pipeline as images.

Beginner tip: by treating sounds like assets, you avoid “missing sound” bugs the same way you avoid “missing sprite” bugs.

## Wiring audio in the game

In the loading state:

- queue music tracks and SFX.
- load all assets.
- register the decoded buffers with `AudioManager`.

When the player starts the game, `AudioManager.resume()` is called after user input to satisfy browser autoplay rules.

If you try to play audio before a user gesture, most browsers will block it. Calling `resume()` after pressing Enter unlocks audio playback.

## Gameplay audio

- Laser shots play on fire.
- Enemy shots play when enemies shoot.
- Explosions play on asteroid and enemy destruction.
- Music changes between menu and gameplay.

This makes the game feel more alive and gives feedback for actions.

## Library changes

- Added `lib/Audio`.
- Extended `lib/Assets` to support sound queues and typed progress.
