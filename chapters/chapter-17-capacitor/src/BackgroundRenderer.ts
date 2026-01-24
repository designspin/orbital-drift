import { random } from './random';

/**
 * Handles all background rendering including stars, nebulae, and space effects
 * Extracted from main.ts to reduce complexity
 */
export class BackgroundRenderer {
  private menuStars: Array<{ x: number; y: number; speed: number; size: number }> = [];
  private starLayers: Array<{ speed: number; stars: Array<{ x: number; y: number; size: number; alpha: number }> }> = [];
  private nebulae: Array<{ x: number; y: number; radius: number; color: string; alpha: number }> = [];
  private spiralStars: Array<{ radius: number; angle: number; size: number; alpha: number }> = [];
  private backgroundTime: number = 0;
  private starTint: [number, number, number] = [210, 225, 255];
  private nebulaAlphaScale: number = 1;

  constructor() {
    // Don't initialize here - call init() after seed is set
  }

  init(worldWidth: number, worldHeight: number): void {
    this.initMenuStars();
    this.initBackground(worldWidth, worldHeight);
  }

  updateBackgroundTime(deltaTime: number): void {
    this.backgroundTime += deltaTime;
  }

  getBackgroundTime(): number {
    return this.backgroundTime;
  }

  setStarTint(tint: [number, number, number]): void {
    this.starTint = tint;
  }

  setNebulaAlphaScale(scale: number): void {
    this.nebulaAlphaScale = scale;
  }

  private initMenuStars(): void {
    const count = 90;
    this.menuStars = Array.from({ length: count }, () => ({
      x: random(),
      y: random(),
      speed: 0.05 + random() * 0.15,
      size: 0.5 + random() * 1.5,
    }));
  }

  private initBackground(worldWidth: number, worldHeight: number): void {
    // Initialize star layers with different speeds for parallax effect
    const layers = [
      { count: 50, speed: 0.12, maxSize: 1.8, minAlpha: 0.3, maxAlpha: 0.8 },
      { count: 80, speed: 0.08, maxSize: 1.4, minAlpha: 0.2, maxAlpha: 0.6 },
      { count: 120, speed: 0.04, maxSize: 1.0, minAlpha: 0.1, maxAlpha: 0.4 },
    ];

    this.starLayers = layers.map((layer) => ({
      speed: layer.speed,
      stars: Array.from({ length: layer.count }, () => ({
        x: random() * worldWidth,
        y: random() * worldHeight,
        size: 0.3 + random() * layer.maxSize,
        alpha: layer.minAlpha + random() * (layer.maxAlpha - layer.minAlpha),
      })),
    }));

    // Initialize nebulae for atmospheric effect
    const palette = ['#5b6cf5', '#7a4fff', '#2f88ff', '#42c7ff'];
    this.nebulae = Array.from({ length: 6 }, () => ({
      x: random() * worldWidth,
      y: random() * worldHeight,
      radius: 280 + random() * 380,
      color: palette[Math.floor(random() * palette.length)],
      alpha: 0.05 + random() * 0.08,
    }));

    // Initialize spiral galaxy stars
    const count = 150;
    this.spiralStars = Array.from({ length: count }, () => {
      const angle = random() * Math.PI * 2;
      const radius = 50 + Math.pow(random(), 0.5) * 800;
      return {
        radius,
        angle: angle + radius * 0.003,
        size: 0.3 + random() * 1.2,
        alpha: 0.1 + random() * 0.5,
      };
    });
  }

  renderMenuStars(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;

    for (const star of this.menuStars) {
      const y = (star.y + time * star.speed) % 1;
      const x = star.x * width;
      const sy = y * height;

      // Swirling motion
      const dx = x - cx;
      const dy = sy - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) + time * 0.3 + dist * 0.0015;
      const radius = dist + Math.sin(time * 1.2 + dist * 0.02) * 4;
      const swirlX = cx + Math.cos(angle) * radius;
      const swirlY = cy + Math.sin(angle) * radius;

      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 2 + star.x * 12));
      ctx.fillStyle = `rgba(120, 196, 255, ${twinkle.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(swirlX, swirlY, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderStars(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, worldWidth: number, worldHeight: number): void {
    ctx.save();
    const center = { x: worldWidth / 2, y: worldHeight / 2 };
    const [sr, sg, sb] = this.starTint;

    for (const layer of this.starLayers) {
      const offsetX = -cameraX * layer.speed;
      const offsetY = -cameraY * layer.speed;

      for (const star of layer.stars) {
        const x = (star.x + offsetX) % worldWidth;
        const y = (star.y + offsetY) % worldHeight;
        const sx = x < 0 ? x + worldWidth : x;
        const sy = y < 0 ? y + worldHeight : y;
        ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${star.alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Render spiral galaxy effect
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rotation = this.backgroundTime * 0.08;
    for (const star of this.spiralStars) {
      const angle = star.angle + rotation;
      const x = center.x + Math.cos(angle) * star.radius;
      const y = center.y + Math.sin(angle) * star.radius;
      const pulse = 0.6 + 0.4 * Math.sin(this.backgroundTime * 1.2 + star.radius * 0.02);
      const alpha = star.alpha * pulse;
      ctx.fillStyle = `rgba(150, 200, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderNebulae(ctx: CanvasRenderingContext2D, _cameraX: number, _cameraY: number, _worldWidth: number, _worldHeight: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const nebula of this.nebulae) {
      const gradient = ctx.createRadialGradient(
        nebula.x,
        nebula.y,
        0,
        nebula.x,
        nebula.y,
        nebula.radius,
      );
      const alphaScale = this.nebulaAlphaScale;
      gradient.addColorStop(0, `rgba(255,255,255,${(nebula.alpha * 0.2 * alphaScale).toFixed(3)})`);
      gradient.addColorStop(0.4, `rgba(255,255,255,${(nebula.alpha * 0.12 * alphaScale).toFixed(3)})`);
      gradient.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
      ctx.fill();

      // Parse hex color and render second layer
      ctx.fillStyle = `rgba(${parseInt(nebula.color.slice(1,3),16)}, ${parseInt(nebula.color.slice(3,5),16)}, ${parseInt(nebula.color.slice(5,7),16)}, ${(nebula.alpha * 0.6 * alphaScale).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(nebula.x, nebula.y, nebula.radius * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}