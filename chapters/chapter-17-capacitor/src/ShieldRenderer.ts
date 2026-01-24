/**
 * Advanced shield rendering with visual effects
 * Creates a dynamic, animated energy shield with hexagonal patterns
 */
export class ShieldRenderer {
  private animationTime: number = 0;
  private hitFlashTime: number = 0;
  private energyPulse: number = 0;

  /**
   * Update shield animations
   */
  update(deltaTime: number): void {
    this.animationTime += deltaTime;
    this.energyPulse += deltaTime * 2;
    this.hitFlashTime = Math.max(0, this.hitFlashTime - deltaTime);
  }

  /**
   * Trigger a hit flash effect
   */
  triggerHit(): void {
    this.hitFlashTime = 0.3; // Flash for 0.3 seconds
  }

  /**
   * Render the shield with advanced effects
   */
  render(
    ctx: CanvasRenderingContext2D,
    radius: number,
    energyLevel: number,
    isActive: boolean
  ): void {
    if (!isActive || energyLevel <= 0) return;

    ctx.save();

    const shieldRadius = radius * 1.7;
    const time = this.animationTime;

    // Energy level affects shield appearance
    const opacity = 0.3 + 0.5 * energyLevel;
    const pulseIntensity = 0.8 + 0.2 * Math.sin(this.energyPulse);

    // 1. Outer glow effect
    const gradient = ctx.createRadialGradient(0, 0, shieldRadius * 0.8, 0, 0, shieldRadius * 1.2);
    gradient.addColorStop(0, `rgba(90, 200, 250, 0)`);
    gradient.addColorStop(0.7, `rgba(90, 200, 250, ${opacity * 0.3})`);
    gradient.addColorStop(1, `rgba(120, 220, 255, ${opacity * 0.1})`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Hexagonal pattern layer
    this.renderHexagonalPattern(ctx, shieldRadius, opacity * pulseIntensity, time);

    // 3. Main shield bubble with distortion
    ctx.strokeStyle = `rgba(90, 200, 250, ${opacity * pulseIntensity})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(90, 200, 250, 0.8)';

    ctx.beginPath();
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Add subtle wave distortion
      const distortion = 1 + Math.sin(angle * 4 + time * 3) * 0.02;
      const r = shieldRadius * distortion;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Energy flow lines
    this.renderEnergyFlow(ctx, shieldRadius, opacity * 0.5, time);

    // 5. Hit flash effect
    if (this.hitFlashTime > 0) {
      const flashAlpha = this.hitFlashTime / 0.3;
      ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';

      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 6. Low energy warning effect
    if (energyLevel < 0.3) {
      const warningPulse = Math.sin(time * 8) > 0 ? 1 : 0;
      ctx.strokeStyle = `rgba(255, 100, 100, ${warningPulse * 0.5})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -time * 50;

      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  /**
   * Render hexagonal pattern on the shield
   */
  private renderHexagonalPattern(
    ctx: CanvasRenderingContext2D,
    radius: number,
    opacity: number,
    time: number
  ): void {
    const hexSize = 20;
    const hexRows = Math.ceil(radius * 2 / (hexSize * 1.5));

    ctx.strokeStyle = `rgba(120, 220, 255, ${opacity * 0.3})`;
    ctx.lineWidth = 0.5;

    for (let row = -hexRows; row <= hexRows; row++) {
      for (let col = -hexRows; col <= hexRows; col++) {
        const x = col * hexSize * 1.5;
        const y = row * hexSize * Math.sqrt(3) + (col % 2 ? hexSize * Math.sqrt(3) / 2 : 0);

        if (Math.hypot(x, y) > radius) continue;

        // Animated hex visibility
        const hexPhase = (x + y + time * 100) % 200;
        if (hexPhase > 100) continue;

        const hexOpacity = 1 - hexPhase / 100;
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = hexOpacity;

        // Draw hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const hx = Math.cos(angle) * hexSize * 0.5;
          const hy = Math.sin(angle) * hexSize * 0.5;
          if (i === 0) {
            ctx.moveTo(hx, hy);
          } else {
            ctx.lineTo(hx, hy);
          }
        }
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  /**
   * Render energy flow effect
   */
  private renderEnergyFlow(
    ctx: CanvasRenderingContext2D,
    radius: number,
    opacity: number,
    time: number
  ): void {
    ctx.strokeStyle = `rgba(150, 230, 255, ${opacity})`;
    ctx.lineWidth = 1;

    // Create rotating energy streams
    const streams = 3;
    for (let s = 0; s < streams; s++) {
      const streamOffset = (s / streams) * Math.PI * 2;
      const streamSpeed = 1.5 + s * 0.3;

      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const angle = t * Math.PI * 2 + time * streamSpeed + streamOffset;
        const r = radius * (0.9 + 0.1 * Math.sin(angle * 3 + time * 2));
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const alpha = Math.sin(t * Math.PI) * opacity;
          ctx.globalAlpha = alpha;
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}