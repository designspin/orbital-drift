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
  private scrollSpeed: number = 30; // pixels per second
  private transitionDuration: number = 1.2;
  private transitionTimer: number = 0;
  private fadeOutDuration: number = 1.0;
  private fadeTimer: number = 0;
  private isActive: boolean = false;
  private isTransitioning: boolean = false;
  private isFadingOut: boolean = false;
  private lineHeight: number = 40;
  private perspectiveScale: number = 0.5; // How much smaller text gets at the top
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

    // Don't clear screen - let background show through

    // Calculate fade alpha based on transition progress
    let alpha = 1;
    if (this.isTransitioning) {
      alpha = this.transitionTimer / this.transitionDuration;
    } else if (this.isFadingOut) {
      alpha = 1 - (this.fadeTimer / this.fadeOutDuration);
    }

    // Setup for perspective text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Create gradient for text fade at top and bottom - using center area only
    const crawlAreaTop = 150; // Space for title
    const crawlAreaBottom = height - 100; // Space for prompt
    const crawlHeight = crawlAreaBottom - crawlAreaTop;

    // Create clipping region for the crawl text
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, crawlAreaTop, width, crawlHeight);
    ctx.clip();

    const gradient = ctx.createLinearGradient(0, crawlAreaTop, 0, crawlAreaBottom);
    gradient.addColorStop(0, `rgba(255, 223, 0, 0)`);
    gradient.addColorStop(0.1, `rgba(255, 223, 0, ${alpha})`);
    gradient.addColorStop(0.9, `rgba(255, 223, 0, ${alpha})`);
    gradient.addColorStop(1, `rgba(255, 223, 0, 0)`);

    // Draw crawling text with perspective
    this.crawlText.forEach((line, index) => {
      const baseY = height / 2 - this.scrollY + (index * this.lineHeight) + 200;

      // Skip lines that are too far off screen
      if (baseY < crawlAreaTop - 100 || baseY > crawlAreaBottom + 100) return;

      // Calculate perspective scale based on Y position
      const normalizedY = (baseY - crawlAreaTop) / crawlHeight;
      const perspectiveFactor = 1 - (1 - this.perspectiveScale) * (1 - normalizedY);
      const scale = Math.max(0.3, Math.min(1, perspectiveFactor));

      // Larger font for title lines
      const isTitle = index < 2;
      const baseFontSize = isTitle ? 36 : 20;
      const fontSize = baseFontSize * scale;

      ctx.font = `${fontSize}px 'Courier New', monospace`;
      ctx.fillStyle = gradient;

      // Apply perspective transformation
      const centerX = width / 2;
      const perspectiveX = centerX;
      const perspectiveY = baseY;

      // Draw text with slight shadow for depth
      ctx.shadowColor = 'rgba(255, 223, 0, 0.5)';
      ctx.shadowBlur = 2 * scale;
      ctx.fillText(line, perspectiveX, perspectiveY);
    });

    ctx.restore(); // Remove clipping

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.restore();
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