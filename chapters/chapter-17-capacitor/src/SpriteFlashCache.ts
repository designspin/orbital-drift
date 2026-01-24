/**
 * Sprite Flash Cache - Pre-renders white flash versions of sprites for performance
 * Critical for mobile performance to avoid creating canvases during gameplay
 */
export class SpriteFlashCache {
  private static instance: SpriteFlashCache;
  private flashCache: Map<string, HTMLCanvasElement> = new Map();

  private constructor() {}

  static getInstance(): SpriteFlashCache {
    if (!SpriteFlashCache.instance) {
      SpriteFlashCache.instance = new SpriteFlashCache();
    }
    return SpriteFlashCache.instance;
  }

  /**
   * Pre-render a white flash version of a sprite region
   * @param key Unique identifier for this sprite
   * @param sprite The source sprite image
   * @param rect The region of the sprite to flash (optional, defaults to full sprite)
   * @param intensity Flash intensity (0-1, default 1)
   */
  preRenderFlash(
    key: string,
    sprite: HTMLImageElement,
    rect?: { x: number; y: number; w: number; h: number },
    intensity: number = 1
  ): HTMLCanvasElement {
    // Check if already cached
    const cacheKey = `${key}_${intensity}`;
    if (this.flashCache.has(cacheKey)) {
      return this.flashCache.get(cacheKey)!;
    }

    // Determine dimensions
    const sourceX = rect?.x ?? 0;
    const sourceY = rect?.y ?? 0;
    const width = rect?.w ?? sprite.width;
    const height = rect?.h ?? sprite.height;

    // Create off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Failed to create flash canvas context');
      return canvas;
    }

    // Draw the original sprite
    ctx.drawImage(
      sprite,
      sourceX,
      sourceY,
      width,
      height,
      0,
      0,
      width,
      height
    );

    // Apply white overlay
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, intensity)})`;
    ctx.fillRect(0, 0, width, height);

    // Cache it
    this.flashCache.set(cacheKey, canvas);

    return canvas;
  }

  /**
   * Get a cached flash sprite
   * @param key The sprite identifier
   * @param intensity The flash intensity (must match what was pre-rendered)
   */
  getFlash(key: string, intensity: number = 1): HTMLCanvasElement | undefined {
    const cacheKey = `${key}_${intensity}`;
    return this.flashCache.get(cacheKey);
  }

  /**
   * Pre-render multiple intensity levels for smooth flash animation
   * @param key Unique identifier for this sprite
   * @param sprite The source sprite image
   * @param rect The region of the sprite to flash
   * @param levels Number of intensity levels to pre-render (default 5)
   */
  preRenderFlashLevels(
    key: string,
    sprite: HTMLImageElement,
    rect?: { x: number; y: number; w: number; h: number },
    levels: number = 5
  ): void {
    for (let i = 0; i <= levels; i++) {
      const intensity = i / levels;
      this.preRenderFlash(key, sprite, rect, intensity);
    }
  }

  /**
   * Get the appropriate flash canvas for current animation time
   * @param key The sprite identifier
   * @param flashTimer Current flash timer value
   * @param flashDuration Total flash duration
   * @param levels Number of pre-rendered levels
   */
  getAnimatedFlash(
    key: string,
    flashTimer: number,
    flashDuration: number,
    levels: number = 5
  ): HTMLCanvasElement | undefined {
    const t = Math.min(1, flashTimer / flashDuration);
    const level = Math.round(t * levels);
    const intensity = level / levels;
    return this.getFlash(key, intensity);
  }

  /**
   * Clear the cache (useful for memory management)
   */
  clear(): void {
    this.flashCache.clear();
  }

  /**
   * Get cache size for debugging
   */
  getCacheSize(): number {
    return this.flashCache.size;
  }
}