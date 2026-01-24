import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";
import { Bullet } from "./Bullet";
import { CollisionLayer } from "./collisionLayers";
import { random } from "./random";
import { SpriteFlashCache } from "./SpriteFlashCache";

export type EnemyBehavior =
  | "scout"        // Wave 1: Simple, predictable, teaches basics
  | "hunter"       // Wave 2: Tracks player smoothly, occasional bursts
  | "guardian"     // Wave 3: Defensive, protects area, suppressing fire
  | "interceptor"  // Wave 4: Fast flanker, hit-and-run tactics
  | "bomber"       // Wave 5: Slow but dangerous, area denial
  | "sniper"       // Wave 6: Long range, precise shots, telegraphed
  | "swarm"        // Wave 7: Weak individually, dangerous in groups
  | "elite"        // Wave 8+: Smart AI, adapts to player tactics
  | "assassin"     // Special: Cloaks, ambushes, high damage
  | "commander";   // Boss support: Buffs nearby enemies

type EnemyOptions = {
  behavior?: EnemyBehavior;
  speed?: number;
  fireInterval?: number;
  health?: number;
  damage?: number;
  getTargetVelocity?: () => Vec2;
  getGroupTargets?: () => Enemy[];
  getAvoidTargets?: () => Vec2[];
  getViewBounds?: () => { x: number; y: number; w: number; h: number };
  waveNumber?: number;
};

export class Enemy extends Entity implements CircleCollider {
  radius: number = 18;
  colliderType: "circle" = "circle";
  layer: number = CollisionLayer.Enemy;
  mask: number = CollisionLayer.Player | CollisionLayer.PlayerBullet | CollisionLayer.Asteroid;

  private sprite?: HTMLImageElement;
  private spriteRect?: { x: number; y: number; w: number; h: number };

  // Core attributes
  private behavior: EnemyBehavior = "scout";
  private health: number = 1;
  private maxHealth: number = 1;
  private speed: number = 50;
  private angle: number = 0;
  private angleLerpSpeed: number = 5;
  private waveNumber: number = 1;

  // Shooting
  private shootCooldown: number = 0;
  private fireInterval: number = 3.0;
  private burstCount: number = 1;
  private burstDelay: number = 0.2;
  private burstTimer: number = 0;
  private burstsFired: number = 0;
  private isAiming: boolean = false;
  private aimTimer: number = 0;
  private aimDuration: number = 0.5;

  // Movement state
  private movementPhase: number = 0;
  private stateTimer: number = 0;
  private targetPosition: Vec2 = { x: 0, y: 0 };
  private velocity: Vec2 = { x: 0, y: 0 };
  private acceleration: Vec2 = { x: 0, y: 0 };

  // AI parameters
  private reactionTime: number = 0.3;
  private reactionTimer: number = 0;
  private lastKnownTarget: Vec2 = { x: 0, y: 0 };
  private thinkTimer: number = 0;
  private thinkInterval: number = 0.5;
  private accuracyDegrees: number = 10;

  // Special behavior states
  private isRetreating: boolean = false;
  private isCharging: boolean = false;
  private isDodging: boolean = false;
  private dodgeTimer: number = 0;
  private dodgeDirection: Vec2 = { x: 0, y: 0 };
  private opacity: number = 1.0; // For assassin cloaking
  private buffRadius: number = 200; // For commander

  // Hit flash effect (optimized for mobile)
  private flashTimer: number = 0;
  private flashDuration: number = 0.12; // Same as boss
  private flashCacheKey?: string; // Key for cached flash sprite
  private static flashCache = SpriteFlashCache.getInstance();

  // Callbacks
  private getTarget: () => Vec2;
  private onShoot: (position: Vec2, angle: number) => void;
  private onDestroyed?: (position: Vec2) => void;
  private hasScored: boolean = false;
  private getTargetVelocity?: () => Vec2;
  private getGroupTargets?: () => Enemy[];
  private getAvoidTargets?: () => Vec2[];
  private getViewBounds?: () => { x: number; y: number; w: number; h: number };

  constructor(
    position: Vec2,
    getTarget: () => Vec2,
    onShoot: (position: Vec2, angle: number) => void,
    sprite?: HTMLImageElement,
    spriteRect?: { x: number; y: number; w: number; h: number },
    onDestroyed?: (position: Vec2) => void,
    options?: EnemyOptions
  ) {
    super(position);
    this.getTarget = getTarget;
    this.onShoot = onShoot;
    this.sprite = sprite;
    this.spriteRect = spriteRect;
    this.onDestroyed = onDestroyed;

    // Apply options
    this.behavior = options?.behavior ?? this.behavior;
    this.speed = options?.speed ?? this.speed;
    this.fireInterval = options?.fireInterval ?? this.fireInterval;
    this.health = options?.health ?? this.health;
    this.maxHealth = this.health;
    this.getTargetVelocity = options?.getTargetVelocity;
    this.getGroupTargets = options?.getGroupTargets;
    this.getAvoidTargets = options?.getAvoidTargets;
    this.getViewBounds = options?.getViewBounds;
    this.waveNumber = options?.waveNumber ?? 1;

    // Initialize behavior-specific parameters
    this.initializeBehavior();
  }

  private initializeBehavior(): void {
    switch (this.behavior) {
      case "scout":
        this.speed = 40;
        this.fireInterval = 4.0;
        this.accuracyDegrees = 25;
        this.reactionTime = 0.8;
        this.health = 1;
        break;

      case "hunter":
        this.speed = 55;
        this.fireInterval = 3.0;
        this.burstCount = 2;
        this.accuracyDegrees = 15;
        this.reactionTime = 0.5;
        this.health = 2;
        break;

      case "guardian":
        this.speed = 30;
        this.fireInterval = 1.5;
        this.accuracyDegrees = 30;
        this.reactionTime = 0.3;
        this.health = 3;
        this.radius = 22;
        break;

      case "interceptor":
        this.speed = 80;
        this.fireInterval = 4.5;
        this.accuracyDegrees = 20;
        this.reactionTime = 0.2;
        this.health = 1;
        this.radius = 15;
        break;

      case "bomber":
        this.speed = 25;
        this.fireInterval = 2.0;
        this.burstCount = 5;
        this.burstDelay = 0.1;
        this.accuracyDegrees = 40;
        this.health = 4;
        this.radius = 25;
        break;

      case "sniper":
        this.speed = 35;
        this.fireInterval = 5.0;
        this.aimDuration = 1.5;
        this.accuracyDegrees = 5;
        this.health = 2;
        break;

      case "swarm":
        this.speed = 60;
        this.fireInterval = 6.0;
        this.accuracyDegrees = 35;
        this.health = 1;
        this.radius = 12;
        break;

      case "elite":
        this.speed = 50;
        this.fireInterval = 2.5;
        this.burstCount = 3;
        this.accuracyDegrees = 10;
        this.reactionTime = 0.15;
        this.health = 5;
        break;

      case "assassin":
        this.speed = 70;
        this.fireInterval = 3.5;
        this.accuracyDegrees = 8;
        this.health = 2;
        this.opacity = 0.3;
        break;

      case "commander":
        this.speed = 35;
        this.fireInterval = 3.0;
        this.accuracyDegrees = 20;
        this.health = 6;
        this.radius = 24;
        this.buffRadius = 250;
        break;
    }

    // Scale difficulty based on wave
    const difficultyScale = 1 + (this.waveNumber - 1) * 0.05;
    this.speed *= difficultyScale;
    this.fireInterval /= difficultyScale;
  }

  update(deltaTime: number, screenSize: Vec2): void {
    // Update timers
    this.reactionTimer += deltaTime;
    this.thinkTimer += deltaTime;
    this.stateTimer += deltaTime;
    this.movementPhase += deltaTime;

    // Update flash timer
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - deltaTime);
    }

    // Update target tracking with reaction delay
    const actualTarget = this.getTarget();
    if (this.thinkTimer >= this.thinkInterval) {
      this.thinkTimer = 0;
      this.lastKnownTarget = { ...actualTarget };
      this.reactionTimer = 0;
    }

    const target = this.reactionTimer < this.reactionTime
      ? this.lastKnownTarget
      : actualTarget;

    // Calculate direction to target
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    // Update movement based on behavior
    this.updateMovement(deltaTime, target, dist, nx, ny, screenSize);

    // Update shooting
    this.updateShooting(deltaTime, target, dist);

    // Apply special effects
    this.applySpecialEffects(deltaTime);

    // Keep within bounds
    this.position.x = Math.max(20, Math.min(this.position.x, screenSize.x - 20));
    this.position.y = Math.max(20, Math.min(this.position.y, screenSize.y - 20));

    // Update angle to face movement direction
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed > 5) {
      const targetAngle = (Math.atan2(this.velocity.y, this.velocity.x) * 180) / Math.PI;
      this.angle = this.lerpAngle(this.angle, targetAngle, Math.min(1, deltaTime * this.angleLerpSpeed));
    }
  }

  private updateMovement(deltaTime: number, target: Vec2, dist: number, nx: number, ny: number, screenSize: Vec2): void {
    let desiredVx = 0;
    let desiredVy = 0;

    switch (this.behavior) {
      case "scout":
        // Simple circular movement around player
        const orbitRadius = 200;
        const orbitSpeed = 1.0;
        const orbitAngle = this.movementPhase * orbitSpeed;
        const orbitX = target.x + Math.cos(orbitAngle) * orbitRadius;
        const orbitY = target.y + Math.sin(orbitAngle) * orbitRadius;
        const odx = orbitX - this.position.x;
        const ody = orbitY - this.position.y;
        const odist = Math.hypot(odx, ody) || 1;
        desiredVx = (odx / odist) * this.speed;
        desiredVy = (ody / odist) * this.speed;
        break;

      case "hunter":
        // Smooth pursuit with occasional lateral dodges
        if (this.stateTimer > 3 && random() < 0.02) {
          this.isDodging = true;
          this.dodgeTimer = 0.5;
          this.dodgeDirection = { x: -ny, y: nx };
          if (random() < 0.5) {
            this.dodgeDirection.x *= -1;
            this.dodgeDirection.y *= -1;
          }
          this.stateTimer = 0;
        }

        if (this.isDodging && this.dodgeTimer > 0) {
          this.dodgeTimer -= deltaTime;
          desiredVx = this.dodgeDirection.x * this.speed * 1.5;
          desiredVy = this.dodgeDirection.y * this.speed * 1.5;
          if (this.dodgeTimer <= 0) {
            this.isDodging = false;
          }
        } else {
          // Smooth approach with deceleration
          const approachSpeed = dist > 150 ? this.speed : this.speed * (dist / 150);
          desiredVx = nx * approachSpeed;
          desiredVy = ny * approachSpeed;
        }
        break;

      case "guardian":
        // Hold position and strafe
        const guardRadius = 250;
        if (dist > guardRadius + 50) {
          desiredVx = nx * this.speed;
          desiredVy = ny * this.speed;
        } else if (dist < guardRadius - 50) {
          desiredVx = -nx * this.speed * 0.5;
          desiredVy = -ny * this.speed * 0.5;
        } else {
          // Strafe around target
          const strafeDir = Math.sin(this.movementPhase * 2) > 0 ? 1 : -1;
          desiredVx = -ny * this.speed * 0.7 * strafeDir;
          desiredVy = nx * this.speed * 0.7 * strafeDir;
        }
        break;

      case "interceptor":
        // Fast flanking attacks
        const flankAngle = Math.atan2(ny, nx) + (Math.sin(this.movementPhase * 3) * Math.PI / 3);
        const flankDist = 180;
        const flankX = target.x + Math.cos(flankAngle) * flankDist;
        const flankY = target.y + Math.sin(flankAngle) * flankDist;
        const fdx = flankX - this.position.x;
        const fdy = flankY - this.position.y;
        const fdist = Math.hypot(fdx, fdy) || 1;

        // Boost speed during attack runs
        const speedMult = Math.sin(this.movementPhase * 2) > 0 ? 1.5 : 0.8;
        desiredVx = (fdx / fdist) * this.speed * speedMult;
        desiredVy = (fdy / fdist) * this.speed * speedMult;
        break;

      case "bomber":
        // Slow approach with area control
        if (dist > 300) {
          desiredVx = nx * this.speed;
          desiredVy = ny * this.speed;
        } else {
          // Circle at medium range
          const circleSpeed = 0.5;
          desiredVx = -ny * this.speed * 0.5 + nx * this.speed * 0.2;
          desiredVy = nx * this.speed * 0.5 + ny * this.speed * 0.2;
        }
        break;

      case "sniper":
        // Maintain long distance
        const sniperRange = 400;
        if (dist < sniperRange - 50) {
          // Retreat to optimal range
          desiredVx = -nx * this.speed;
          desiredVy = -ny * this.speed;
          this.isRetreating = true;
        } else if (dist > sniperRange + 100) {
          // Approach to optimal range
          desiredVx = nx * this.speed * 0.5;
          desiredVy = ny * this.speed * 0.5;
          this.isRetreating = false;
        } else {
          // Minimal movement while aiming
          this.isRetreating = false;
          desiredVx = Math.sin(this.movementPhase) * this.speed * 0.2;
          desiredVy = Math.cos(this.movementPhase) * this.speed * 0.2;
        }
        break;

      case "swarm":
        // Flock behavior with group
        const swarmTargets = this.getGroupTargets?.() ?? [];
        let cohesionX = 0, cohesionY = 0;
        let separationX = 0, separationY = 0;
        let alignmentX = 0, alignmentY = 0;
        let neighborCount = 0;

        for (const other of swarmTargets) {
          if (other === this || other.behavior !== "swarm") continue;

          const sdx = other.position.x - this.position.x;
          const sdy = other.position.y - this.position.y;
          const sdist = Math.hypot(sdx, sdy) || 1;

          if (sdist < 200) {
            // Cohesion
            cohesionX += other.position.x;
            cohesionY += other.position.y;
            neighborCount++;

            // Separation
            if (sdist < 50) {
              separationX -= sdx / sdist;
              separationY -= sdy / sdist;
            }

            // Alignment
            alignmentX += other.velocity.x;
            alignmentY += other.velocity.y;
          }
        }

        if (neighborCount > 0) {
          cohesionX = (cohesionX / neighborCount - this.position.x) * 0.01;
          cohesionY = (cohesionY / neighborCount - this.position.y) * 0.01;
          alignmentX = alignmentX / neighborCount * 0.1;
          alignmentY = alignmentY / neighborCount * 0.1;
        }

        // Combine forces
        desiredVx = nx * this.speed * 0.5 + cohesionX + separationX * 30 + alignmentX;
        desiredVy = ny * this.speed * 0.5 + cohesionY + separationY * 30 + alignmentY;
        break;

      case "elite":
        // Adaptive AI that changes tactics
        const tacticPhase = Math.floor(this.movementPhase / 4) % 3;

        switch (tacticPhase) {
          case 0: // Aggressive pursuit
            if (dist > 100) {
              desiredVx = nx * this.speed * 1.2;
              desiredVy = ny * this.speed * 1.2;
            } else {
              desiredVx = nx * this.speed * 0.5;
              desiredVy = ny * this.speed * 0.5;
            }
            break;
          case 1: // Evasive strafing
            const strafeAngle = this.movementPhase * 2;
            desiredVx = nx * this.speed * 0.7 + Math.cos(strafeAngle) * this.speed * 0.5;
            desiredVy = ny * this.speed * 0.7 + Math.sin(strafeAngle) * this.speed * 0.5;
            break;
          case 2: // Tactical retreat
            if (dist < 200) {
              desiredVx = -nx * this.speed * 0.8;
              desiredVy = -ny * this.speed * 0.8;
            } else {
              desiredVx = -ny * this.speed * 0.6;
              desiredVy = nx * this.speed * 0.6;
            }
            break;
        }
        break;

      case "assassin":
        // Stealth approach and ambush
        if (dist > 250) {
          // Stealthy approach
          this.opacity = Math.max(0.2, this.opacity - deltaTime * 0.5);
          desiredVx = nx * this.speed * 0.7;
          desiredVy = ny * this.speed * 0.7;
        } else if (!this.isCharging && dist < 150) {
          // Begin ambush
          this.isCharging = true;
          this.stateTimer = 0;
        }

        if (this.isCharging) {
          this.opacity = Math.min(1.0, this.opacity + deltaTime * 2);
          if (this.stateTimer < 0.5) {
            // Charge!
            desiredVx = nx * this.speed * 2;
            desiredVy = ny * this.speed * 2;
          } else if (this.stateTimer < 1.5) {
            // Strike and retreat
            desiredVx = -nx * this.speed * 1.5;
            desiredVy = -ny * this.speed * 1.5;
          } else {
            this.isCharging = false;
            this.stateTimer = 0;
          }
        }
        break;

      case "commander":
        // Stay back and coordinate
        const commandRange = 350;
        if (dist < commandRange) {
          desiredVx = -nx * this.speed * 0.7;
          desiredVy = -ny * this.speed * 0.7;
        } else if (dist > commandRange + 100) {
          desiredVx = nx * this.speed * 0.5;
          desiredVy = ny * this.speed * 0.5;
        } else {
          // Slow lateral movement
          const phase = this.movementPhase * 0.5;
          desiredVx = Math.sin(phase) * this.speed * 0.3;
          desiredVy = Math.cos(phase) * this.speed * 0.3;
        }

        // Buff nearby allies
        this.buffNearbyAllies(deltaTime);
        break;
    }

    // Smooth velocity changes
    const accelRate = 200;
    this.acceleration.x = (desiredVx - this.velocity.x);
    this.acceleration.y = (desiredVy - this.velocity.y);

    const accelMag = Math.hypot(this.acceleration.x, this.acceleration.y);
    if (accelMag > accelRate) {
      this.acceleration.x = (this.acceleration.x / accelMag) * accelRate;
      this.acceleration.y = (this.acceleration.y / accelMag) * accelRate;
    }

    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;

    // Apply velocity
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Avoid obstacles
    this.applyAvoidance(deltaTime);
  }

  private updateShooting(deltaTime: number, target: Vec2, dist: number): void {
    // Check if in view
    const bounds = this.getViewBounds?.();
    if (bounds) {
      const pad = 100;
      const inView =
        this.position.x >= bounds.x - pad &&
        this.position.x <= bounds.x + bounds.w + pad &&
        this.position.y >= bounds.y - pad &&
        this.position.y <= bounds.y + bounds.h + pad;
      if (!inView) return;
    }

    this.shootCooldown -= deltaTime;

    // Handle burst firing
    if (this.burstsFired > 0 && this.burstsFired < this.burstCount) {
      this.burstTimer -= deltaTime;
      if (this.burstTimer <= 0) {
        this.fireBullet(target);
        this.burstsFired++;
        this.burstTimer = this.burstDelay;
      }
      return;
    }

    if (this.shootCooldown <= 0) {
      // Check if we can shoot
      const canShoot = this.canShootAt(target, dist);

      if (canShoot) {
        // Special aiming for snipers
        if (this.behavior === "sniper") {
          if (!this.isAiming) {
            this.isAiming = true;
            this.aimTimer = 0;
          }

          this.aimTimer += deltaTime;

          // Visual telegraph for sniper shot
          if (this.aimTimer >= this.aimDuration) {
            this.fireBullet(target);
            this.shootCooldown = this.fireInterval;
            this.isAiming = false;
            this.aimTimer = 0;
          }
        } else {
          // Normal shooting
          this.fireBullet(target);
          this.burstsFired = 1;

          if (this.burstCount > 1) {
            this.burstTimer = this.burstDelay;
          } else {
            this.shootCooldown = this.fireInterval;
            this.burstsFired = 0;
          }
        }
      } else {
        this.isAiming = false;
        this.aimTimer = 0;
      }
    }

    // Reset burst if cooldown is done
    if (this.shootCooldown <= 0 && this.burstsFired >= this.burstCount) {
      this.burstsFired = 0;
      this.shootCooldown = this.fireInterval;
    }
  }

  private canShootAt(target: Vec2, dist: number): boolean {
    // Behavior-specific shooting conditions
    switch (this.behavior) {
      case "scout":
        return dist < 300;
      case "hunter":
        return dist < 250 && !this.isDodging;
      case "guardian":
        return dist < 350;
      case "interceptor":
        return dist < 200 && Math.sin(this.movementPhase * 2) > 0;
      case "bomber":
        return dist < 250;
      case "sniper":
        return dist > 300 && dist < 500 && !this.isRetreating;
      case "swarm":
        return dist < 200 && random() < 0.3; // Swarm units shoot randomly
      case "elite":
        return dist < 300;
      case "assassin":
        return dist < 150 && this.isCharging;
      case "commander":
        return dist < 400;
      default:
        return dist < 300;
    }
  }

  private fireBullet(target: Vec2): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Add inaccuracy based on behavior
    const spread = this.accuracyDegrees;
    angle += (random() - 0.5) * spread;

    // Predict target movement for some behaviors
    if (this.behavior === "hunter" || this.behavior === "elite" || this.behavior === "sniper") {
      const targetVel = this.getTargetVelocity?.();
      if (targetVel) {
        const bulletSpeed = 260;
        const timeToTarget = Math.hypot(dx, dy) / bulletSpeed;
        const predictX = target.x + targetVel.x * timeToTarget * 0.5;
        const predictY = target.y + targetVel.y * timeToTarget * 0.5;
        angle = Math.atan2(predictY - this.position.y, predictX - this.position.x) * 180 / Math.PI;
      }
    }

    this.onShoot({ x: this.position.x, y: this.position.y }, angle);
  }

  private applyAvoidance(deltaTime: number): void {
    const avoidTargets = this.getAvoidTargets?.() ?? [];
    if (avoidTargets.length === 0) return;

    let avoidX = 0;
    let avoidY = 0;

    for (const obstacle of avoidTargets) {
      const dx = this.position.x - obstacle.x;
      const dy = this.position.y - obstacle.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist < 100) {
        const force = (100 - dist) / 100;
        avoidX += (dx / dist) * force;
        avoidY += (dy / dist) * force;
      }
    }

    const avoidMag = Math.hypot(avoidX, avoidY);
    if (avoidMag > 0) {
      this.position.x += (avoidX / avoidMag) * 100 * deltaTime;
      this.position.y += (avoidY / avoidMag) * 100 * deltaTime;
    }
  }

  private applySpecialEffects(deltaTime: number): void {
    // Special visual effects for behaviors
    if (this.behavior === "assassin") {
      // Pulsing opacity when cloaked
      if (!this.isCharging) {
        this.opacity = 0.2 + Math.sin(this.movementPhase * 3) * 0.1;
      }
    }
  }

  private buffNearbyAllies(deltaTime: number): void {
    if (this.behavior !== "commander") return;

    const allies = this.getGroupTargets?.() ?? [];
    for (const ally of allies) {
      if (ally === this) continue;

      const dist = Math.hypot(
        ally.position.x - this.position.x,
        ally.position.y - this.position.y
      );

      if (dist < this.buffRadius) {
        // Apply buff effects (simplified - in real implementation would boost stats)
        ally.angleLerpSpeed = Math.min(10, ally.angleLerpSpeed + deltaTime);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Apply opacity for assassin
    if (this.behavior === "assassin") {
      ctx.globalAlpha = this.opacity;
    }

    // Draw aiming laser for sniper
    if (this.behavior === "sniper" && this.isAiming) {
      ctx.strokeStyle = `rgba(255, 0, 0, ${this.aimTimer / this.aimDuration * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.position.x, this.position.y);
      const target = this.getTarget();
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }

    // Draw commander aura
    if (this.behavior === "commander") {
      ctx.strokeStyle = "rgba(100, 200, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.buffRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.angle * Math.PI / 180);

    if (this.sprite && this.spriteRect) {
      ctx.rotate(-Math.PI / 2);
      const scale = (this.radius * 2.4) / this.spriteRect.w;
      const w = this.spriteRect.w * scale;
      const h = this.spriteRect.h * scale;

      // Draw the sprite
      ctx.drawImage(
        this.sprite,
        this.spriteRect.x,
        this.spriteRect.y,
        this.spriteRect.w,
        this.spriteRect.h,
        -w / 2,
        -h / 2,
        w,
        h
      );

      // Apply white flash overlay (optimized with pre-cached sprites)
      if (this.flashTimer > 0) {
        // Generate cache key if not already set
        if (!this.flashCacheKey) {
          this.flashCacheKey = `enemy_${this.behavior}_${this.spriteRect.x}_${this.spriteRect.y}`;
          // Pre-render multiple intensity levels for smooth animation
          Enemy.flashCache.preRenderFlashLevels(
            this.flashCacheKey,
            this.sprite,
            this.spriteRect,
            5 // 5 levels of intensity
          );
        }

        // Get the pre-rendered flash sprite for current timer
        const flashCanvas = Enemy.flashCache.getAnimatedFlash(
          this.flashCacheKey,
          this.flashTimer,
          this.flashDuration,
          5
        );

        if (flashCanvas) {
          // Draw the pre-rendered flash version (much faster on mobile!)
          ctx.drawImage(flashCanvas, -w / 2, -h / 2, w, h);
        }
      }
    } else {
      // Fallback rendering with behavior-specific colors
      const colors: Record<EnemyBehavior, string> = {
        scout: "#4CAF50",
        hunter: "#FF9800",
        guardian: "#2196F3",
        interceptor: "#FFEB3B",
        bomber: "#F44336",
        sniper: "#9C27B0",
        swarm: "#00BCD4",
        elite: "#FF5722",
        assassin: "#607D8B",
        commander: "#3F51B5"
      };

      ctx.fillStyle = colors[this.behavior] ?? "#FF6B6B";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Apply white overlay if flashing (for fallback rendering)
      if (this.flashTimer > 0) {
        const t = this.flashTimer / this.flashDuration;
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, t) * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw health bar if damaged
      if (this.health < this.maxHealth) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fillRect(-this.radius, -this.radius - 8, this.radius * 2, 4);
        ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
        ctx.fillRect(-this.radius, -this.radius - 8, this.radius * 2 * (this.health / this.maxHealth), 4);
      }
    }

    ctx.restore();
  }

  onCollision(other: Collidable): void {
    if (other instanceof Enemy) {
      return;
    }
    if (other instanceof Bullet) {
      this.takeDamage(1);
      return;
    }
    if ((other as { layer?: number }).layer === CollisionLayer.Asteroid) {
      this.destroy();
    }
  }

  takeDamage(damage: number): void {
    this.health -= damage;

    // Trigger flash effect (same as boss)
    if (this.health > 0) {
      this.flashTimer = this.flashDuration;
    }

    if (this.health <= 0) {
      this.destroy();
    }
  }

  destroy(): void {
    if (!this.alive) return;
    if (!this.hasScored) {
      this.hasScored = true;
      this.onDestroyed?.({ x: this.position.x, y: this.position.y });
    }
    this.alive = false;
  }

  getBehavior(): EnemyBehavior {
    return this.behavior;
  }

  private lerpAngle(from: number, to: number, t: number): number {
    const delta = ((((to - from) % 360) + 540) % 360) - 180;
    return from + delta * t;
  }
}