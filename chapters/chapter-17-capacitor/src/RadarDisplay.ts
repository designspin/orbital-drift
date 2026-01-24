import { BaseUIElement, type UIElementOptions } from "@course/lib";
import type { Vec2 } from "@course/lib";

type RadarTarget = { position: Vec2 };

export interface RadarDisplayOptions extends UIElementOptions {
  getAsteroids: () => RadarTarget[];
  getEnemies: () => RadarTarget[];
  getBoss?: () => RadarTarget | undefined;
  getMissiles?: () => RadarTarget[];
  getPlayer: () => Vec2 | undefined;
  getWorldSize: () => Vec2;
  width: number;
  height: number;
  asteroidColor?: string;
  enemyColor?: string;
  bossColor?: string;
  missileColor?: string;
  playerColor?: string;
  dotRadius?: number;
}

export class RadarDisplay extends BaseUIElement {
  private getAsteroids: () => RadarTarget[];
  private getEnemies: () => RadarTarget[];
  private getBoss?: () => RadarTarget | undefined;
  private getMissiles?: () => RadarTarget[];
  private getPlayer: () => Vec2 | undefined;
  private getWorldSize: () => Vec2;
  private width: number;
  private height: number;
  private asteroidColor: string;
  private enemyColor: string;
  private bossColor: string;
  private missileColor: string;
  private playerColor: string;
  private dotRadius: number;

  constructor(opts: RadarDisplayOptions) {
    super(opts);
    this.getAsteroids = opts.getAsteroids;
    this.getEnemies = opts.getEnemies;
    this.getBoss = opts.getBoss;
    this.getMissiles = opts.getMissiles;
    this.getPlayer = opts.getPlayer;
    this.getWorldSize = opts.getWorldSize;
    this.width = opts.width;
    this.height = opts.height;
    this.asteroidColor = opts.asteroidColor ?? "#ffffff";
    this.enemyColor = opts.enemyColor ?? "#ff3b30";
    this.bossColor = opts.bossColor ?? "#a855f7";
    this.missileColor = opts.missileColor ?? "#ffd60a";
    this.playerColor = opts.playerColor ?? "#3da5ff";
    this.dotRadius = opts.dotRadius ?? 2;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const pos = this.getLocalPosition(width, height);
    const margin = 8;
    const usableW = this.width - margin * 2;
    const usableH = this.height - margin * 2;
    const world = this.getWorldSize();
    const player = this.getPlayer();
    if (!player) {
      return;
    }

    ctx.save();
    ctx.translate(pos.x, pos.y);

    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

    const drawDot = (target: RadarTarget, color: string) => {
      const dx = target.position.x - player.x;
      const dy = target.position.y - player.y;
      const nx = world.x > 0 ? dx / world.x : 0;
      const ny = world.y > 0 ? dy / world.y : 0;
      const x = margin + usableW / 2 + nx * usableW;
      const y = margin + usableH / 2 + ny * usableH;
      const clampedX = Math.max(margin, Math.min(x, margin + usableW));
      const clampedY = Math.max(margin, Math.min(y, margin + usableH));
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, this.dotRadius, 0, Math.PI * 2);
      ctx.fill();
    };

    for (const asteroid of this.getAsteroids()) {
      drawDot(asteroid, this.asteroidColor);
    }

    for (const enemy of this.getEnemies()) {
      drawDot(enemy, this.enemyColor);
    }

    const boss = this.getBoss?.();
    if (boss) {
      drawDot(boss, this.bossColor);
    }

    const missiles = this.getMissiles?.() ?? [];
    for (const missile of missiles) {
      drawDot(missile, this.missileColor);
    }

    ctx.fillStyle = this.playerColor;
    ctx.beginPath();
    ctx.arc(margin + usableW / 2, margin + usableH / 2, this.dotRadius + 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
