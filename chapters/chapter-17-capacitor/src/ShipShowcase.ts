import type { EnemyBehavior } from "./Enemy";
import { SpriteRegistry } from "./SpriteRegistry";

interface ShipInfo {
  name: string;
  behavior?: EnemyBehavior;
  scale: number;
  isBoss?: boolean;
  isCredits?: boolean;
  creditsLines?: string[];
  bossSpriteIndex?: number;
  isFinalBoss?: boolean;
  bossRadius?: number;
  description: string[];
  stats: { label: string; value: string }[];
}

export class ShipShowcase {
  private sprites = new SpriteRegistry();
  private limitToSingleShip = false;
  private originalShips?: ShipInfo[];
  private ships: ShipInfo[] = [
    {
      name: "SCOUT DRONE",
      behavior: "scout",
      scale: 1,
      description: [
        "Basic reconnaissance unit",
        "Light armor, moderate speed"
      ],
      stats: [
        { label: "THREAT LEVEL", value: "LOW" },
        { label: "SPEED", value: "250 px/s" },
        { label: "PATTERN", value: "LINEAR" },
        { label: "POINTS", value: "100" }
      ]
    },
    {
      name: "HUNTER",
      behavior: "hunter",
      scale: 1,
      description: [
        "Aggressive pursuit fighter",
        "Advanced tracking"
      ],
      stats: [
        { label: "THREAT LEVEL", value: "MEDIUM" },
        { label: "SPEED", value: "180 px/s" },
        { label: "PATTERN", value: "HOMING" },
        { label: "POINTS", value: "200" }
      ]
    },
    {
      name: "STRIKER",
      behavior: "guardian",
      scale: 1,
      description: [
        "Heavy assault craft",
        "High firepower, slower movement"
      ],
      stats: [
        { label: "THREAT LEVEL", value: "MEDIUM" },
        { label: "SPEED", value: "150 px/s" },
        { label: "PATTERN", value: "ZIGZAG" },
        { label: "POINTS", value: "300" }
      ]
    },
    {
      name: "INTERCEPTOR",
      behavior: "interceptor",
      scale: 1,
      description: [
        "Elite fighter unit",
        "Unpredicatble"
      ],
      stats: [
        { label: "THREAT LEVEL", value: "HIGH" },
        { label: "SPEED", value: "220 px/s" },
        { label: "PATTERN", value: "SINE WAVE" },
        { label: "POINTS", value: "400" }
      ]
    },
    {
      name: "BOMBER",
      behavior: "bomber",
      scale: 1,
      description: [
        "Area denial craft",
        "Slow, heavy payloads"
      ],
      stats: []
    },
    {
      name: "SNIPER",
      behavior: "sniper",
      scale: 1,
      description: [
        "Long-range marksman",
        "Telegraphed shots"
      ],
      stats: []
    },
    {
      name: "SWARM",
      behavior: "swarm",
      scale: 1,
      description: [
        "Mass attack drones",
        "Weak alone, deadly in groups"
      ],
      stats: []
    },
    {
      name: "ELITE",
      behavior: "elite",
      scale: 1,
      description: [
        "Adaptive assault unit",
        "Tactical evasions"
      ],
      stats: []
    },
    {
      name: "PHANTOM",
      behavior: "assassin",
      scale: 1,
      description: [
        "Stealth reconnaissance",
        "Circular evasion patterns"
      ],
      stats: [
        { label: "THREAT LEVEL", value: "HIGH" },
        { label: "SPEED", value: "200 px/s" },
        { label: "PATTERN", value: "CIRCULAR" },
        { label: "POINTS", value: "500" }
      ]
    },
    {
      name: "COMMANDER",
      behavior: "commander",
      scale: 1,
      description: [
        "Support command ship",
        "Buffs nearby enemies"
      ],
      stats: []
    },
    {
      name: "THE GUARDIAN",
      scale: 1,
      isBoss: true,
      bossSpriteIndex: 0,
      bossRadius: 70,
      description: [
        "Wave 5 boss",
        "Defensive patterns"
      ],
      stats: []
    },
    {
      name: "THE HUNTER",
      scale: 1,
      isBoss: true,
      bossSpriteIndex: 1,
      bossRadius: 65,
      description: [
        "Wave 10 boss",
        "Escalating aggression"
      ],
      stats: []
    },
    {
      name: "THE DESTROYER",
      scale: 1,
      isBoss: true,
      bossSpriteIndex: 2,
      bossRadius: 75,
      description: [
        "Wave 15 boss",
        "Beam and shockwave attacks"
      ],
      stats: []
    },
    {
      name: "THE VANGUARD",
      scale: 1,
      isBoss: true,
      bossSpriteIndex: 3,
      bossRadius: 70,
      description: [
        "Wave 20 boss",
        "Teleport strike platform"
      ],
      stats: []
    },
    {
      name: "THE OVERLORD",
      scale: 1,
      isBoss: true,
      isFinalBoss: true,
      bossRadius: 85,
      description: [
        "Wave 25+ final boss",
        "Multi-phase apocalypse"
      ],
      stats: []
    },
    {
      name: "CREDITS",
      scale: 1,
      isCredits: true,
      creditsLines: [
        "Game By",
        "",
        "Jason Foster",
        "",
        "Music",
        "",
        "Doomed Track - Alexander Ehlers",
        "Flags Track - Alexander Ehlers",
        "Source: opengameart.org",
      ],
      description: [],
      stats: []
    }
  ];

  private currentShipIndex: number = 0;
  private shipTimer: number = 0;
  private shipPauseDuration: number = 1.8; // Pause after each ship
  private isActive: boolean = false;

  // Animation states
  private shipSlideX: number = 0;
  private shipExitX: number = 0;
  private shipExitY: number = 0;
  private shipExitProgress: number = 0;
  private shipExitRotation: number = 0;
  private typewriterIndex: number = 0;
  private typewriterTimer: number = 0;
  private typewriterSpeed: number = 0.06; // seconds per character
  private deleteSpeed: number = 0.04; // seconds per character
  private phase: "enter" | "pause" | "delete" | "exit" = "enter";
  private phaseTimer: number = 0;
  private exitDuration: number = 1.9;

  // Transition states
  private isTransitioning: boolean = false;
  private transitionTimer: number = 0;
  private transitionDuration: number = 1.2;
  private titleOffset: number = 0;
  private promptOffset: number = 0;
  private isFadingOut: boolean = false;
  private fadeTimer: number = 0;
  private fadeOutDuration: number = 1.0;
  private isCycleResetting: boolean = false;
  private cycleResetTimer: number = 0;
  private cycleResetDuration: number = 0.9;

  start(): void {
    if (this.limitToSingleShip) {
      if (!this.originalShips) {
        this.originalShips = this.ships.slice();
      }
      if (this.originalShips.length > 1) {
        this.ships = [this.originalShips[0], this.originalShips[this.originalShips.length - 1]];
      }
    } else if (this.originalShips) {
      this.ships = this.originalShips.slice();
    }
    this.isActive = true;
    this.isTransitioning = true;
    this.isFadingOut = false;
    this.transitionTimer = 0;
    this.fadeTimer = 0;
    this.currentShipIndex = 0;
    this.shipTimer = 0;
    this.shipSlideX = 0;
    this.shipExitX = 0;
    this.shipExitY = 0;
    this.shipExitProgress = 0;
    this.shipExitRotation = 0;
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.phase = "enter";
    this.phaseTimer = 0;
    this.titleOffset = 0;
    this.promptOffset = 0;
    this.isCycleResetting = false;
    this.cycleResetTimer = 0;
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

    // Handle transition in
    if (this.isTransitioning) {
      this.transitionTimer += deltaTime;
      const t = Math.min(1, this.transitionTimer / this.transitionDuration);
      const eased = this.easeInOutCubic(t);

      this.titleOffset = eased * 180;
      this.promptOffset = eased * 180;

      if (this.transitionTimer >= this.transitionDuration) {
        this.isTransitioning = false;
        this.transitionTimer = 0;
      }
    }

    // Handle fade out
    if (this.isFadingOut) {
      this.fadeTimer += deltaTime;
      const t = Math.min(1, this.fadeTimer / this.fadeOutDuration);
      const eased = 1 - this.easeInOutCubic(t);

      this.titleOffset = eased * 180;
      this.promptOffset = eased * 180;

      if (this.fadeTimer >= this.fadeOutDuration) {
        this.isActive = false;
        this.isFadingOut = false;
        return false;
      }
    }

    // Handle cycle reset (return title/prompt to original position)
    if (this.isCycleResetting) {
      this.cycleResetTimer += deltaTime;
      const t = Math.min(1, this.cycleResetTimer / this.cycleResetDuration);
      const eased = this.easeInOutCubic(t);
      this.titleOffset = (1 - eased) * 180;
      this.promptOffset = (1 - eased) * 180;

      if (this.cycleResetTimer >= this.cycleResetDuration) {
        this.isCycleResetting = false;
        this.cycleResetTimer = 0;
        this.titleOffset = 0;
        this.promptOffset = 0;
        this.isActive = false;
        return false;
      }
      return true;
    }

    // Update ship showcase
    if (!this.isTransitioning && !this.isFadingOut) {
      this.shipTimer += deltaTime;
      this.phaseTimer += deltaTime;

      const currentShip = this.ships[this.currentShipIndex];
      const maxChars = this.getEntryMaxChars(currentShip);

      switch (this.phase) {
        case "enter": {
          const slideProgress = Math.min(1, this.phaseTimer / 1);
          this.shipSlideX = this.easeOutBack(slideProgress);
          this.shipExitX = 0;
          this.shipExitY = 0;
          this.shipExitRotation = 0;

          if (this.phaseTimer > 0.5) {
            this.typewriterTimer += deltaTime;
            if (this.typewriterTimer >= this.typewriterSpeed) {
              this.typewriterTimer = 0;
              this.typewriterIndex = Math.min(this.typewriterIndex + 1, maxChars);
            }
          }

          if (this.typewriterIndex >= maxChars) {
            this.phase = "pause";
            this.phaseTimer = 0;
          }
          break;
        }
        case "pause": {
          if (this.phaseTimer >= this.shipPauseDuration) {
            this.phase = "delete";
            this.phaseTimer = 0;
            this.typewriterTimer = 0;
          }
          break;
        }
        case "delete": {
          this.typewriterTimer += deltaTime;
          if (this.typewriterTimer >= this.deleteSpeed) {
            this.typewriterTimer = 0;
            this.typewriterIndex = Math.max(0, this.typewriterIndex - 1);
          }
          if (this.typewriterIndex <= 0) {
            this.phase = "exit";
            this.phaseTimer = 0;
          }
          break;
        }
        case "exit": {
          const t = Math.min(1, this.phaseTimer / this.exitDuration);
          const eased = this.easeInOutCubic(t);
          const direction = this.currentShipIndex % 2 === 0 ? 1 : -1;
          this.shipExitX = eased;
          this.shipExitY = Math.sin(eased * Math.PI / 2) * direction;
          this.shipExitProgress = eased;

          if (t >= 1) {
            this.shipTimer = 0;
            const nextIndex = (this.currentShipIndex + 1) % this.ships.length;
            this.shipSlideX = 0;
            this.shipExitX = 0;
            this.shipExitY = 0;
            this.shipExitProgress = 0;
            this.shipExitRotation = 0;
            this.typewriterIndex = 0;
            this.typewriterTimer = 0;
            this.phase = "enter";
            this.phaseTimer = 0;

            if (nextIndex === 0) {
              this.currentShipIndex = 0;
              this.isCycleResetting = true;
              this.cycleResetTimer = 0;
            } else {
              this.currentShipIndex = nextIndex;
            }
          }
          break;
        }
      }
    }

    return true;
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    spriteSheets: { enemy?: HTMLImageElement | null; enemy2?: HTMLImageElement | null; bosses?: Array<HTMLImageElement | undefined>; finalBoss?: HTMLImageElement | null }
  ): void {
    if (!this.isActive || this.isTransitioning) return;

    const ship = this.ships[this.currentShipIndex];
    const centerY = height / 2;

    // Calculate alpha for fade
    let alpha = 1;
    if (this.isFadingOut) {
      alpha = 1 - (this.fadeTimer / this.fadeOutDuration);
    }

    if (ship.isCredits) {
      this.renderCreditsText(ctx, width, height, alpha);
      return;
    }

    const isBoss = Boolean(ship.isBoss);
    let rect: { x: number; y: number; w: number; h: number } | null = null;
    let spriteSheet: HTMLImageElement | null = null;
    let bossSprite: HTMLImageElement | null = null;

    if (isBoss) {
      bossSprite = ship.isFinalBoss ? (spriteSheets.finalBoss ?? null) : (spriteSheets.bosses?.[ship.bossSpriteIndex ?? -1] ?? null);
      if (!bossSprite) return;
    } else {
      const behavior = ship.behavior ?? "scout";
      rect = this.sprites.getEnemySpriteRect(behavior);
      const spriteName = this.sprites.getEnemySpriteName(behavior);
      spriteSheet = spriteName === "enemy2" ? spriteSheets.enemy2 ?? null : spriteSheets.enemy ?? null;
      if (!spriteSheet || !rect) return;
    }

    // Draw ship on the left center
    const targetShipX = width * 0.28;
    const enterX = -120 + (this.shipSlideX * (targetShipX + 120)); // Slide in from left
    const exitTargetX = width * 1.35;
    const shipX = enterX + (exitTargetX - targetShipX) * this.shipExitX;
    const shipY = centerY + (height * 0.55) * this.shipExitY;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Ship glow effect
    ctx.shadowColor = 'rgba(0, 255, 128, 0.5)';
    ctx.shadowBlur = 20;

    // Draw ship
    ctx.save();
    ctx.translate(shipX, shipY);
    let targetRotation = 0;
    if (this.phase === "exit") {
      const direction = this.currentShipIndex % 2 === 0 ? 1 : -1;
      const progress = this.shipExitProgress;
      const nextProgress = Math.min(1, progress + 0.02);
      const y1 = Math.sin(progress * Math.PI / 2) * direction;
      const y2 = Math.sin(nextProgress * Math.PI / 2) * direction;
      const x1 = enterX + (exitTargetX - targetShipX) * progress;
      const x2 = enterX + (exitTargetX - targetShipX) * nextProgress;
      const yPos1 = centerY + (height * 0.55) * y1;
      const yPos2 = centerY + (height * 0.55) * y2;
      const pathAngle = Math.atan2(yPos2 - yPos1, x2 - x1);
      targetRotation = pathAngle;
    }
    this.shipExitRotation = this.lerpAngle(this.shipExitRotation, targetRotation, 0.15);
    ctx.rotate(-Math.PI / 2 + this.shipExitRotation); // Match in-game sprite orientation

    let w = 0;
    let h = 0;

    if (isBoss && bossSprite) {
      const inGameSize = (ship.bossRadius ?? 70) * 2.6;
      const scale = (inGameSize / bossSprite.width) * ship.scale * 3;
      w = bossSprite.width * scale;
      h = bossSprite.height * scale;
      ctx.drawImage(bossSprite, -w / 2, -h / 2, w, h);
    } else if (spriteSheet && rect) {
      const inGameSize = 18 * 2.4;
      const scale = (inGameSize / rect.w) * ship.scale * 3;
      w = rect.w * scale;
      h = rect.h * scale;
      ctx.drawImage(
        spriteSheet,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        -w / 2,
        -h / 2,
        w,
        h
      );
    }
    ctx.restore();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw text information on the right (right-aligned, but to the right of the ship)
    const textLeftBound = shipX + w / 2 + 40;
    const textX = Math.max(width * 0.55, textLeftBound);
    const nameLineHeight = 24;
    const blockHeight = nameLineHeight;
    const textStartY = centerY - blockHeight / 2 + nameLineHeight;

    // Terminal-style green text
    ctx.fillStyle = `rgba(0, 255, 128, ${alpha})`;
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'left';

    // Draw ship name
    const nameText = this.getTypewriterText(ship.name, 0);
    ctx.fillText(nameText, textX, textStartY);

    // Draw flashing cursor during name typing
    const currentName = ship.name.substring(0, this.typewriterIndex);
    const cursorX = textX + ctx.measureText(currentName).width;
    this.drawCursor(ctx, cursorX, textStartY, alpha);

    ctx.restore();
  }

  private getTypewriterText(fullText: string, startIndex: number): string {
    const endIndex = Math.max(0, this.typewriterIndex - startIndex);
    return fullText.substring(0, Math.min(endIndex, fullText.length));
  }

  private drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number): void {
    if (Math.floor(Date.now() / 500) % 2) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 255, 128, ${alpha})`;
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.fillText('_', x + 2, y);
      ctx.restore();
    }
  }

  private getEntryMaxChars(entry: ShipInfo): number {
    if (entry.isCredits) {
      const lines = entry.creditsLines ?? [];
      return lines.reduce((sum, line) => sum + line.length + 1, 0);
    }
    return entry.name.length;
  }

  private renderCreditsText(ctx: CanvasRenderingContext2D, width: number, height: number, alpha: number): void {
    const ship = this.ships[this.currentShipIndex];
    const lines = ship.creditsLines ?? [];
    const textX = width * 0.25;
    const textStartY = height / 2 - 30;
    const lineHeight = 26;
    const gapHeight = lineHeight * 0.5;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(0, 255, 128, ${alpha})`;
    ctx.font = '20px "Courier New", monospace';
    ctx.textAlign = 'left';

    let charCount = 0;
    let y = textStartY;
    lines.forEach((line) => {
      const text = this.getCreditsTypewriterText(line, charCount);
      ctx.fillText(text, textX, y);
      charCount += line.length + 1;
      y += line.length === 0 ? gapHeight : lineHeight;
    });

    const cursorPos = this.getCreditsCursorPosition(ctx, textX, textStartY, lines, lineHeight, gapHeight);
    this.drawCreditsCursor(ctx, cursorPos.x, cursorPos.y, alpha);

    ctx.restore();
  }

  private getCreditsTypewriterText(fullText: string, startIndex: number): string {
    const endIndex = Math.max(0, this.typewriterIndex - startIndex);
    return fullText.substring(0, Math.min(endIndex, fullText.length));
  }

  private getCreditsCursorPosition(
    ctx: CanvasRenderingContext2D,
    textX: number,
    textStartY: number,
    lines: string[],
    lineHeight: number,
    gapHeight: number
  ): { x: number; y: number } {
    let remaining = this.typewriterIndex;
    let y = textStartY;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (remaining <= line.length) {
        const current = line.substring(0, Math.max(0, remaining));
        return { x: textX + ctx.measureText(current).width, y };
      }
      remaining -= line.length + 1;
      y += line.length === 0 ? gapHeight : lineHeight;
    }

    const lastIndex = lines.length - 1;
    const lastLine = lines[lastIndex] ?? '';
    return { x: textX + ctx.measureText(lastLine).width, y };
  }

  private drawCreditsCursor(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number): void {
    if (Math.floor(Date.now() / 500) % 2) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 255, 128, ${alpha})`;
      ctx.font = '20px "Courier New", monospace';
      ctx.fillText('_', x + 2, y);
      ctx.restore();
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private lerpAngle(from: number, to: number, t: number): number {
    const delta = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return from + delta * t;
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
    this.isActive = false;
    this.isTransitioning = false;
    this.isFadingOut = false;
    this.currentShipIndex = 0;
    this.shipTimer = 0;
    this.shipSlideX = 0;
    this.shipExitX = 0;
    this.shipExitY = 0;
    this.shipExitProgress = 0;
    this.shipExitRotation = 0;
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.phase = "enter";
    this.phaseTimer = 0;
    this.titleOffset = 0;
    this.promptOffset = 0;
    this.isCycleResetting = false;
    this.cycleResetTimer = 0;
  }
}