import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";
import { Bullet } from "./Bullet";
import { CollisionLayer } from "./collisionLayers";

export type BossOptions = {
  behavior?: "patrol" | "strafe" | "orbit" | "dash";
  maxHealth: number;
  enterY?: number;
  patrolAmplitude?: number;
  patrolSpeed?: number;
  fireInterval?: number;
  rotationOffsetDeg?: number;
  chaseSpeed?: number;
  laserInterval?: number;
  missileInterval?: number;
  dashSpeed?: number;
  dashDuration?: number;
  dashCooldown?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
  strafeYAmplitude?: number;
};

export class Boss extends Entity implements CircleCollider {
  radius: number = 70;
  colliderType: "circle" = "circle";
  layer: number = CollisionLayer.Enemy;
  mask: number = CollisionLayer.Player | CollisionLayer.PlayerBullet;

  private sprite?: HTMLImageElement;
  private angle: number = 0;
  private maxHealth: number = 20;
  private health: number = 20;
  private enterY: number = 160;
  private behavior: "patrol" | "strafe" | "orbit" | "dash" = "patrol";
  private patrolAmplitude: number = 260;
  private patrolSpeed: number = 0.8;
  private strafeYAmplitude: number = 60;
  private patrolPhase: number = 0;
  private patrolAnchor?: Vec2;
  private hasEntered: boolean = false;
  private fireInterval: number = 1.6;
  private laserInterval: number = 1.6;
  private missileInterval: number = 2.8;
  private laserCooldown: number = 0;
  private missileCooldown: number = 0;
  private flashTimer: number = 0;
  private flashDuration: number = 0.12;
  private rotationOffsetDeg: number = 0;
  private chaseSpeed: number = 140;
  private deathDuration: number = 10;
  private deathTimer: number = 0;
  private deathBurstTimer: number = 0;
  private deathSmokeTimer: number = 0;
  private deathAlpha: number = 1;
  private isDying: boolean = false;
  private dashSpeed: number = 260;
  private dashDuration: number = 0.6;
  private dashCooldown: number = 2.4;
  private dashTimer: number = 0;
  private dashCooldownTimer: number = 0.8;
  private dashDir: Vec2 = { x: 0, y: 1 };
  private orbitRadius: number = 240;
  private orbitSpeed: number = 1.2;
  private orbitAngle: number = Math.random() * Math.PI * 2;
  private flashCanvas?: HTMLCanvasElement;
  private flashCtx?: CanvasRenderingContext2D;

  private getTarget: () => Vec2;
  private onShootLaser?: (position: Vec2, angle: number) => void;
  private onShootMissile?: (position: Vec2, angle: number) => void;
  private onHit?: (position: Vec2, healthRatio: number) => void;
  private onDestroyed?: (position: Vec2) => void;
  private onDeathBurst?: (position: Vec2) => void;
  private onDeathSmoke?: (position: Vec2, alpha: number) => void;

  constructor(
    position: Vec2,
    sprite: HTMLImageElement | undefined,
    getTarget: () => Vec2,
    onShootLaser: ((position: Vec2, angle: number) => void) | undefined,
    onShootMissile: ((position: Vec2, angle: number) => void) | undefined,
    onHit?: (position: Vec2, healthRatio: number) => void,
    onDestroyed?: (position: Vec2) => void,
    onDeathBurst?: (position: Vec2) => void,
    onDeathSmoke?: (position: Vec2, alpha: number) => void,
    options?: BossOptions
  ) {
    super(position);
    this.sprite = sprite;
    this.getTarget = getTarget;
    this.onShootLaser = onShootLaser;
    this.onShootMissile = onShootMissile;
    this.onHit = onHit;
    this.onDestroyed = onDestroyed;
    this.onDeathBurst = onDeathBurst;
    this.onDeathSmoke = onDeathSmoke;
    this.behavior = options?.behavior ?? this.behavior;
    this.maxHealth = options?.maxHealth ?? this.maxHealth;
    this.health = this.maxHealth;
    this.enterY = options?.enterY ?? this.enterY;
    this.patrolAmplitude = options?.patrolAmplitude ?? this.patrolAmplitude;
    this.patrolSpeed = options?.patrolSpeed ?? this.patrolSpeed;
    this.fireInterval = options?.fireInterval ?? this.fireInterval;
    this.laserInterval = options?.laserInterval ?? options?.fireInterval ?? this.laserInterval;
    this.missileInterval = options?.missileInterval ?? options?.fireInterval ?? this.missileInterval;
    this.rotationOffsetDeg = options?.rotationOffsetDeg ?? this.rotationOffsetDeg;
    this.chaseSpeed = options?.chaseSpeed ?? this.chaseSpeed;
    this.dashSpeed = options?.dashSpeed ?? this.dashSpeed;
    this.dashDuration = options?.dashDuration ?? this.dashDuration;
    this.dashCooldown = options?.dashCooldown ?? this.dashCooldown;
    this.orbitRadius = options?.orbitRadius ?? this.orbitRadius;
    this.orbitSpeed = options?.orbitSpeed ?? this.orbitSpeed;
    this.strafeYAmplitude = options?.strafeYAmplitude ?? this.strafeYAmplitude;
    this.laserCooldown = this.laserInterval;
    this.missileCooldown = this.missileInterval;
  }

  update(deltaTime: number, screenSize: Vec2): void {
    if (this.isDying) {
      this.deathTimer = Math.max(0, this.deathTimer - deltaTime);
      this.deathAlpha = Math.max(0, this.deathTimer / this.deathDuration);
      this.position.y += 18 * deltaTime;

      this.deathBurstTimer -= deltaTime;
      if (this.deathBurstTimer <= 0) {
        this.deathBurstTimer = 0.08 + Math.random() * 0.18;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.radius * 0.9;
        const burstPos = {
          x: this.position.x + Math.cos(angle) * radius,
          y: this.position.y + Math.sin(angle) * radius,
        };
        this.onDeathBurst?.(burstPos);
      }

      this.deathSmokeTimer -= deltaTime;
      if (this.deathSmokeTimer <= 0) {
        this.deathSmokeTimer = 0.08;
        const smokePos = {
          x: this.position.x + (Math.random() - 0.5) * this.radius * 0.8,
          y: this.position.y - this.radius * 0.9,
        };
        this.onDeathSmoke?.(smokePos, this.deathAlpha);
      }

      if (this.deathTimer <= 0) {
        this.alive = false;
      }
      return;
    }

    const target = this.getTarget();
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    this.angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    if (!this.hasEntered) {
      if (this.position.y < this.enterY) {
        this.position.y = Math.min(this.enterY, this.position.y + 140 * deltaTime);
      } else {
        this.hasEntered = true;
        if (!this.patrolAnchor) {
          this.patrolAnchor = { x: this.position.x, y: this.position.y };
        }
      }
    }

    if (this.hasEntered) {
      const anchor = this.patrolAnchor ?? (this.patrolAnchor = { x: this.position.x, y: this.position.y });
      switch (this.behavior) {
        case "patrol": {
          this.patrolPhase += this.patrolSpeed * deltaTime;
          this.position.x = anchor.x + Math.cos(this.patrolPhase) * this.patrolAmplitude;
          this.position.y = anchor.y;
          break;
        }
        case "strafe": {
          this.patrolPhase += this.patrolSpeed * deltaTime;
          this.position.x = anchor.x + Math.cos(this.patrolPhase) * this.patrolAmplitude;
          this.position.y = anchor.y + Math.sin(this.patrolPhase * 1.6) * this.strafeYAmplitude;
          break;
        }
        case "orbit": {
          this.orbitAngle += this.orbitSpeed * deltaTime;
          this.position.x = target.x + Math.cos(this.orbitAngle) * this.orbitRadius;
          this.position.y = target.y + Math.sin(this.orbitAngle) * this.orbitRadius;
          break;
        }
        case "dash": {
          if (this.dashTimer > 0) {
            this.dashTimer = Math.max(0, this.dashTimer - deltaTime);
            this.position.x += this.dashDir.x * this.dashSpeed * deltaTime;
            this.position.y += this.dashDir.y * this.dashSpeed * deltaTime;
          } else {
            this.dashCooldownTimer -= deltaTime;
            const dist = Math.hypot(dx, dy) || 1;
            const nx = dx / dist;
            const ny = dy / dist;
            this.position.x += nx * this.chaseSpeed * 0.5 * deltaTime;
            this.position.y += ny * this.chaseSpeed * 0.5 * deltaTime;

            if (this.dashCooldownTimer <= 0) {
              this.dashCooldownTimer = this.dashCooldown;
              this.dashTimer = this.dashDuration;
              this.dashDir = { x: nx, y: ny };
            }
          }
          break;
        }
      }
    }

    this.position.x = Math.max(this.radius, Math.min(this.position.x, screenSize.x - this.radius));
    this.position.y = Math.max(this.radius, Math.min(this.position.y, screenSize.y - this.radius));

    this.laserCooldown -= deltaTime;
    if (this.onShootLaser && this.laserCooldown <= 0) {
      this.laserCooldown = this.laserInterval;
      this.onShootLaser({ x: this.position.x, y: this.position.y }, this.angle);
    }

    this.missileCooldown -= deltaTime;
    if (this.onShootMissile && this.missileCooldown <= 0) {
      this.missileCooldown = this.missileInterval;
      this.onShootMissile({ x: this.position.x, y: this.position.y }, this.angle);
    }

    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - deltaTime);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(((this.rotationOffsetDeg) * Math.PI) / 180);
    if (this.isDying) {
      ctx.globalAlpha = this.deathAlpha;
    }

    if (this.sprite) {
      const scale = (this.radius * 2.6) / this.sprite.width;
      const w = this.sprite.width * scale;
      const h = this.sprite.height * scale;
      ctx.drawImage(this.sprite, -w / 2, -h / 2, w, h);

      if (this.flashTimer > 0) {
        const t = this.flashTimer / this.flashDuration;
        if (!this.flashCanvas || !this.flashCtx || this.flashCanvas.width !== this.sprite.width || this.flashCanvas.height !== this.sprite.height) {
          this.flashCanvas = document.createElement('canvas');
          this.flashCanvas.width = this.sprite.width;
          this.flashCanvas.height = this.sprite.height;
          this.flashCtx = this.flashCanvas.getContext('2d') ?? undefined;
        }
        if (this.flashCtx && this.flashCanvas) {
          this.flashCtx.clearRect(0, 0, this.flashCanvas.width, this.flashCanvas.height);
          this.flashCtx.globalCompositeOperation = 'source-over';
          this.flashCtx.drawImage(this.sprite, 0, 0);
          this.flashCtx.globalCompositeOperation = 'source-atop';
          this.flashCtx.fillStyle = `rgba(255,255,255,${Math.min(1, t)})`;
          this.flashCtx.fillRect(0, 0, this.flashCanvas.width, this.flashCanvas.height);
          ctx.drawImage(this.flashCanvas, -w / 2, -h / 2, w, h);
        }
      }
    } else {
      ctx.fillStyle = "#ff3b30";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  getHealthRatio(): number {
    return Math.max(0, Math.min(1, this.health / this.maxHealth));
  }

  onCollision(other: Collidable): void {
    if (other instanceof Bullet) {
      this.health = Math.max(0, this.health - 1);
      this.flashTimer = this.flashDuration;
      this.onHit?.({ x: this.position.x, y: this.position.y }, this.getHealthRatio());
      if (this.health <= 0 && !this.isDying) {
        this.isDying = true;
        this.deathTimer = this.deathDuration;
        this.deathBurstTimer = 0.1;
        this.deathSmokeTimer = 0;
        this.mask = 0;
        this.onDestroyed?.({ x: this.position.x, y: this.position.y });
      }
    }
  }
}
