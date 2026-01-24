export class StoryCrawl {
  private crawlText: string[] = [
    "Episode I",
    "COMBAT TRIALS",
    "",
    "Welcome to the DRIFT PROGRAM, pilot.",
    "",
    "You have been selected to test humanity's",
    "latest combat spacecraft in the hazardous",
    "ASTEROID FIELDS of Sector 7.",
    "",
    "Your objectives:",
    "- Survive increasingly difficult waves",
    "- Destroy all hostile test drones",
    "- Defeat the experimental BOSS units",
    "- Prove humanity's combat readiness",
    "",
    "Warning: This is not a simulation.",
    "Safety protocols have been disabled.",
    "",
    "Your performance will determine the fate",
    "of the entire fighter program.",
    "",
    "Good luck. You'll need it."
  ];

  private scrollY: number = 0;
  private scrollSpeed: number = 40; // pixels per second
  private transitionDuration: number = 1.2;
  private transitionTimer: number = 0;
  private fadeOutDuration: number = 1.0;
  private fadeTimer: number = 0;
  private isActive: boolean = false;
  private isTransitioning: boolean = false;
  private isFadingOut: boolean = false;
  private lineHeight: number = 50; // Increased for better readability with perspective
  private titleOffset: number = 0; // How much to move title up
  private promptOffset: number = 0; // How much to move prompt down

  start(): void {
    this.isActive = true;
    this.isTransitioning = true;
    this.isFadingOut = false;
    this.transitionTimer = 0;
    this.fadeTimer = 0;
    this.scrollY = 0;
    this.titleOffset = 0;
    this.promptOffset = 0;
  }

  stop(): void {
    if (this.isActive && !this.isFadingOut) {
      this.isFadingOut = true;
      this.isTransitioning = false;
      this.fadeTimer = 0;
    }
  }

  update(deltaTime: number): boolean {
    if (!this.isActive) return false;

    // Handle transition in (move title up, prompt down)
    if (this.isTransitioning) {
      this.transitionTimer += deltaTime;
      const t = Math.min(1, this.transitionTimer / this.transitionDuration);
      const eased = this.easeInOutCubic(t);

      this.titleOffset = eased * 150; // Move title up by 150px
      this.promptOffset = eased * 150; // Move prompt down by 150px

      if (this.transitionTimer >= this.transitionDuration) {
        this.isTransitioning = false;
        this.transitionTimer = 0;
      }
    }

    // Handle fade out (reverse transition)
    if (this.isFadingOut) {
      this.fadeTimer += deltaTime;
      const t = Math.min(1, this.fadeTimer / this.fadeOutDuration);
      const eased = 1 - this.easeInOutCubic(t);

      this.titleOffset = eased * 150;
      this.promptOffset = eased * 150;

      if (this.fadeTimer >= this.fadeOutDuration) {
        this.isActive = false;
        this.isFadingOut = false;
        return false; // Crawl is finished
      }
    }

    // Scroll the text
    if (!this.isTransitioning) {
      this.scrollY += this.scrollSpeed * deltaTime;

      // Check if all text has scrolled off screen
      const totalHeight = this.crawlText.length * this.lineHeight;
      if (this.scrollY > totalHeight + 600) {
        this.stop();
      }
    }

    return true; // Still active
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  renderCrawlText(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.isActive) return;

    ctx.save();

    // Calculate fade alpha based on transition progress
    let alpha = 1;
    if (this.isTransitioning) {
      alpha = this.transitionTimer / this.transitionDuration;
    } else if (this.isFadingOut) {
      alpha = 1 - (this.fadeTimer / this.fadeOutDuration);
    }

    // Setup perspective transformation
    const crawlAreaTop = 150;
    const crawlAreaBottom = height - 100;
    const centerX = width / 2;
    const centerY = height / 2;

    // Create clipping region
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, crawlAreaTop, width, crawlAreaBottom - crawlAreaTop);
    ctx.clip();

    // Apply 3D perspective transformation
    // This simulates looking at text laying flat that's tilted away from us
    const perspectiveAngle = 65; // degrees - how much the text is tilted
    const rad = (perspectiveAngle * Math.PI) / 180;

    ctx.translate(centerX, centerY);

    // Setup text properties
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255, 223, 0, ${alpha})`;

    // Draw each line with perspective transformation
    this.crawlText.forEach((line, index) => {
      // Calculate position in 3D space
      const y3d = -this.scrollY + (index * this.lineHeight) + 300;

      // Skip if too far away or behind viewer
      if (y3d < -500 || y3d > 800) return;

      // Apply perspective projection
      // As text gets further away (smaller y3d), it should:
      // 1. Move up the screen (smaller screenY)
      // 2. Get smaller (smaller scale)
      // 3. Get closer together (perspective compression)

      const distance = Math.max(0.1, (y3d + 200) / 400); // Normalize distance
      const screenY = y3d * Math.cos(rad) * distance - 100;
      const scale = Math.pow(distance, 1.5); // Exponential scaling for better perspective

      // Fade based on distance
      const distanceFade = Math.max(0, Math.min(1, (1 - Math.abs(y3d - 150) / 600)));

      ctx.save();

      // Apply transformations
      ctx.translate(0, screenY);
      ctx.scale(1, scale * 0.6); // Compress Y more than X for perspective

      // Larger font for title lines
      const isTitle = index < 2;
      const baseFontSize = isTitle ? 42 : 24;
      const fontSize = baseFontSize * scale;

      ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
      ctx.fillStyle = `rgba(255, 223, 0, ${alpha * distanceFade})`;

      // Add glow for nearby text
      if (distanceFade > 0.5) {
        ctx.shadowColor = `rgba(255, 223, 0, ${0.5 * distanceFade})`;
        ctx.shadowBlur = 3 * scale;
      }

      ctx.fillText(line, 0, 0);

      ctx.restore();
    });

    ctx.restore(); // Remove clipping
    ctx.restore(); // Remove main transformation

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  getTitleOffset(): number {
    return this.titleOffset;
  }

  getPromptOffset(): number {
    return this.promptOffset;
  }

  isRunning(): boolean {
    return this.isActive;
  }

  reset(): void {
    this.scrollY = 0;
    this.fadeTimer = 0;
    this.transitionTimer = 0;
    this.isActive = false;
    this.isTransitioning = false;
    this.isFadingOut = false;
    this.titleOffset = 0;
    this.promptOffset = 0;
  }
}