import { Entity, type Collidable, type CircleCollider, type Vec2 } from "@course/lib";
import { Bullet } from "./Bullet";
import { CollisionLayer } from "./collisionLayers";
import { SpriteFlashCache } from "./SpriteFlashCache";

export type BossPhase = {
  healthThreshold: number; // Health percentage to trigger phase (1.0 = 100%)
  name: string;
  attacks: BossAttack[];
  movementPattern: BossMovement;
  color?: string; // Optional phase color tint
};

export type BossAttack =
  | { type: "laser"; interval: number; count?: number; spread?: number }
  | { type: "missile"; interval: number; count?: number }
  | { type: "spiral"; interval: number; arms: number; rotationSpeed: number }
  | { type: "wave"; interval: number; width: number; speed: number }
  | { type: "burst"; interval: number; bullets: number }
  | { type: "beam"; interval: number; chargeTime: number; duration: number; sweepAngle?: number }
  | { type: "minions"; interval: number; count: number }
  | { type: "shockwave"; interval: number; rings: number };

export type BossMovement =
  | { type: "patrol"; amplitude: number; speed: number }
  | { type: "strafe"; amplitude: number; speed: number; verticalAmplitude: number }
  | { type: "orbit"; radius: number; speed: number }
  | { type: "dash"; dashSpeed: number; dashDuration: number; dashCooldown: number; chaseSpeed: number }
  | { type: "teleport"; interval: number; telegraphTime: number }
  | { type: "spiral"; radius: number; speed: number; expansion: number }
  | { type: "aggressive"; speed: number; dodgeRadius: number }
  | { type: "defensive"; retreatDistance: number; strafeSpeed: number };

export type BossConfig = {
  name: string;
  tier: number; // 0-4 for regular bosses, 5 for final boss
  maxHealth: number;
  radius: number;
  sprite?: HTMLImageElement;
  phases: BossPhase[];
  enterY?: number;
  deathDuration?: number;
};

type ViewBounds = { x: number; y: number; w: number; h: number };

export class BossV2 extends Entity implements CircleCollider {
  radius: number;
  colliderType: "circle" = "circle";
  layer: number = CollisionLayer.Enemy;
  mask: number = CollisionLayer.Player | CollisionLayer.PlayerBullet;

  // Core properties
  private name: string;
  private tier: number;
  private sprite?: HTMLImageElement;
  private angle: number = 0;
  private spriteRotationOffsetDeg: number = -90;
  private maxHealth: number;
  private health: number;
  private phases: BossPhase[];
  private currentPhaseIndex: number = 0;
  private enterY: number = 160;
  private hasEntered: boolean = false;

  // Phase management
  private phaseTransitioning: boolean = false;
  private phaseTransitionTimer: number = 0;
  private phaseTransitionDuration: number = 1.5;
  private currentPhase: BossPhase;

  // Attack state
  private attackTimers: Map<string, number> = new Map();
  private attackStates: Map<string, any> = new Map();
  private isAttacking: boolean = false;
  private nextAttackIndex: number = 0;

  // Movement state
  private movementPhase: number = 0;
  private movementState: any = {};
  private targetPosition: Vec2 = { x: 0, y: 0 };
  private velocity: Vec2 = { x: 0, y: 0 };
  private patrolAnchor?: Vec2;

  // Visual effects
  private flashTimer: number = 0;
  private flashDuration: number = 0.12;
  private static flashCache = SpriteFlashCache.getInstance();
  private flashCacheKey?: string;
  private phaseGlowIntensity: number = 0;
  private telegraphAlpha: number = 0;
  private currentTelegraph?: { type: string; position: Vec2; data: any };

  // Death animation
  private isDying: boolean = false;
  private deathDuration: number = 10; // Epic 10-second death with explosions and slow fade!
  private deathTimer: number = 0;
  private deathBurstTimer: number = 0;
  private deathSmokeTimer: number = 0;
  private deathAlpha: number = 1;

  // Special attack visuals
  private beamChargeProgress: number = 0;
  private beamAngle: number = 0;
  private beamSweepProgress: number = 0;
  private spiralAngle: number = 0;
  private shockwaveRadius: number = 0;
  private activeMinionPositions: Vec2[] = [];

  // Callbacks
  private getTarget: () => Vec2;
  private isTargetInvulnerable?: () => boolean;
  private onShootProjectile: (position: Vec2, angle: number, type: "laser" | "missile") => void;
  private onSpawnMinion?: (position: Vec2) => void;
  private getViewBounds?: () => ViewBounds;
  private onHit?: (position: Vec2, healthRatio: number) => void;
  private onPhaseChange?: (phase: number, phaseName: string) => void;
  private onDestroyed?: (position: Vec2) => void;
  private onDeathBurst?: (position: Vec2) => void;
  private onDeathSmoke?: (position: Vec2, alpha: number) => void;

  constructor(
    config: BossConfig,
    position: Vec2,
    getTarget: () => Vec2,
    onShootProjectile: (position: Vec2, angle: number, type: "laser" | "missile") => void,
    callbacks?: {
      isTargetInvulnerable?: () => boolean;
      onSpawnMinion?: (position: Vec2) => void;
      getViewBounds?: () => ViewBounds;
      onHit?: (position: Vec2, healthRatio: number) => void;
      onPhaseChange?: (phase: number, phaseName: string) => void;
      onDestroyed?: (position: Vec2) => void;
      onDeathBurst?: (position: Vec2) => void;
      onDeathSmoke?: (position: Vec2, alpha: number) => void;
    }
  ) {
    super(position);

    // Initialize from config
    this.name = config.name;
    this.tier = config.tier;
    this.radius = config.radius;
    this.sprite = config.sprite;
    this.maxHealth = config.maxHealth;
    this.health = this.maxHealth;
    this.phases = config.phases;
    this.currentPhase = this.phases[0];
    this.enterY = config.enterY ?? 160;
    this.deathDuration = config.deathDuration ?? 10;

    // Set callbacks
    this.getTarget = getTarget;
    this.onShootProjectile = onShootProjectile;
    this.isTargetInvulnerable = callbacks?.isTargetInvulnerable;
    this.onSpawnMinion = callbacks?.onSpawnMinion;
    this.getViewBounds = callbacks?.getViewBounds;
    this.onHit = callbacks?.onHit;
    this.onPhaseChange = callbacks?.onPhaseChange;
    this.onDestroyed = callbacks?.onDestroyed;
    this.onDeathBurst = callbacks?.onDeathBurst;
    this.onDeathSmoke = callbacks?.onDeathSmoke;

    // Pre-cache flash sprite
    if (this.sprite) {
      this.flashCacheKey = `boss_${this.tier}_${this.name}`;
      BossV2.flashCache.preRenderFlashLevels(this.flashCacheKey, this.sprite, undefined, 5);
    }

    // Initialize attack timers
    this.initializeAttackTimers();
  }

  private initializeAttackTimers(): void {
    this.currentPhase.attacks.forEach((attack, index) => {
      this.attackTimers.set(`attack_${index}`, attack.interval * 0.5); // Stagger initial attacks
    });
  }

  update(deltaTime: number, screenSize: Vec2): void {
    // Handle death animation
    if (this.isDying) {
      this.updateDeathAnimation(deltaTime);
      return;
    }

    // Update flash timer
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - deltaTime);
    }

    // Handle entrance
    if (!this.hasEntered) {
      this.updateEntrance(deltaTime);
      return;
    }

    // Handle phase transitions
    if (this.phaseTransitioning) {
      this.updatePhaseTransition(deltaTime);
      return;
    }

    // Check for phase change
    this.checkPhaseChange();

    // Update target tracking
    const target = this.getTarget();
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Update movement
    this.updateMovement(deltaTime, target, screenSize);

    // Update attacks
    this.updateAttacks(deltaTime, target);

    // Update visual effects
    this.updateVisualEffects(deltaTime);

    // Keep within bounds
    const viewBounds = this.getViewBounds?.();
    if (viewBounds) {
      const minX = viewBounds.x + this.radius;
      const maxX = viewBounds.x + viewBounds.w - this.radius;
      const minY = viewBounds.y + this.radius;
      const maxY = viewBounds.y + viewBounds.h - this.radius;
      this.position.x = Math.max(minX, Math.min(this.position.x, maxX));
      this.position.y = Math.max(minY, Math.min(this.position.y, maxY));
    } else {
      this.position.x = Math.max(this.radius, Math.min(this.position.x, screenSize.x - this.radius));
      this.position.y = Math.max(this.radius, Math.min(this.position.y, screenSize.y - this.radius));
    }
  }

  private updateEntrance(deltaTime: number): void {
    const viewBounds = this.getViewBounds?.();
    const targetEnterY = viewBounds ? viewBounds.y + this.enterY : this.enterY;

    if (this.position.y < targetEnterY) {
      this.position.y = Math.min(targetEnterY, this.position.y + 140 * deltaTime);
    } else {
      this.hasEntered = true;
      if (viewBounds) {
        this.patrolAnchor = { x: viewBounds.x + viewBounds.w / 2, y: targetEnterY };
      } else {
        this.patrolAnchor = { x: this.position.x, y: this.position.y };
      }
      this.onPhaseChange?.(0, this.currentPhase.name);
    }
  }

  private updateDeathAnimation(deltaTime: number): void {
    this.deathTimer = Math.max(0, this.deathTimer - deltaTime);
    this.deathAlpha = Math.max(0, this.deathTimer / this.deathDuration);

    // Stop all movement during death - boss should die in place
    // No position changes during death animation!

    // Burst effects
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

    // Smoke effects
    this.deathSmokeTimer -= deltaTime;
    if (this.deathSmokeTimer <= 0) {
      this.deathSmokeTimer = 0.08;
      const smokePos = {
        x: this.position.x + (Math.random() - 0.5) * this.radius * 0.8,
        y: this.position.y - this.radius * 0.9,
      };
      this.onDeathSmoke?.(smokePos, this.deathAlpha);
    }

    if (this.deathTimer <= 0 && this.alive) {
      this.alive = false;
      // Now that death animation is complete, trigger the destroyed callback
      this.onDestroyed?.({ x: this.position.x, y: this.position.y });
    }
  }

  private checkPhaseChange(): void {
    const healthRatio = this.health / this.maxHealth;

    // Check if we should transition to next phase
    for (let i = this.currentPhaseIndex + 1; i < this.phases.length; i++) {
      if (healthRatio <= this.phases[i].healthThreshold) {
        this.startPhaseTransition(i);
        break;
      }
    }
  }

  private startPhaseTransition(newPhaseIndex: number): void {
    this.phaseTransitioning = true;
    this.phaseTransitionTimer = 0;
    this.currentPhaseIndex = newPhaseIndex;
    this.currentPhase = this.phases[newPhaseIndex];

    // Reset attack timers for new phase
    this.attackTimers.clear();
    this.attackStates.clear();
    this.initializeAttackTimers();

    // Notify phase change
    this.onPhaseChange?.(newPhaseIndex, this.currentPhase.name);
  }

  private updatePhaseTransition(deltaTime: number): void {
    this.phaseTransitionTimer += deltaTime;

    // Visual effects during transition
    this.phaseGlowIntensity = Math.sin((this.phaseTransitionTimer / this.phaseTransitionDuration) * Math.PI);

    if (this.phaseTransitionTimer >= this.phaseTransitionDuration) {
      this.phaseTransitioning = false;
      this.phaseGlowIntensity = 0;
    }
  }

  private updateMovement(deltaTime: number, target: Vec2, screenSize: Vec2): void {
    this.movementPhase += deltaTime;
    const movement = this.currentPhase.movementPattern;
    const viewBounds = this.getViewBounds?.();
    const anchor = viewBounds
      ? { x: viewBounds.x + viewBounds.w / 2, y: viewBounds.y + this.enterY }
      : (this.patrolAnchor ?? { x: screenSize.x / 2, y: this.enterY });

    // Store desired position instead of directly setting
    let desiredX = this.position.x;
    let desiredY = this.position.y;

    switch (movement.type) {
      case "patrol":
        desiredX = anchor.x + Math.cos(this.movementPhase * movement.speed) * movement.amplitude;
        desiredY = anchor.y;
        break;

      case "strafe":
        desiredX = anchor.x + Math.cos(this.movementPhase * movement.speed) * movement.amplitude;
        desiredY = anchor.y + Math.sin(this.movementPhase * movement.speed * 1.6) * movement.verticalAmplitude;
        break;

      case "orbit":
        const orbitAngle = this.movementPhase * movement.speed;
        desiredX = target.x + Math.cos(orbitAngle) * movement.radius;
        desiredY = target.y + Math.sin(orbitAngle) * movement.radius;
        break;

      case "dash":
        this.updateDashMovement(deltaTime, target, movement);
        return; // Dash handles its own movement

      case "teleport":
        this.updateTeleportMovement(deltaTime, screenSize, movement);
        return; // Teleport handles its own movement

      case "spiral":
        const spiralAngle = this.movementPhase * movement.speed;
        const spiralRadius = movement.radius + Math.sin(this.movementPhase * 0.5) * movement.expansion;
        desiredX = anchor.x + Math.cos(spiralAngle) * spiralRadius;
        desiredY = anchor.y + Math.sin(spiralAngle) * spiralRadius;
        break;

      case "aggressive":
        this.updateAggressiveMovement(deltaTime, target, movement);
        return; // Aggressive handles its own movement

      case "defensive":
        this.updateDefensiveMovement(deltaTime, target, movement);
        return; // Defensive handles its own movement
    }

    // Smooth interpolation to desired position (prevents jerky movement)
    const lerpSpeed = 5.0; // Adjust this for smoother/snappier movement
    this.position.x += (desiredX - this.position.x) * Math.min(1, deltaTime * lerpSpeed);
    this.position.y += (desiredY - this.position.y) * Math.min(1, deltaTime * lerpSpeed);
  }

  private updateDashMovement(deltaTime: number, target: Vec2, movement: { dashSpeed: number; dashDuration: number; dashCooldown: number; chaseSpeed: number }): void {
    if (!this.movementState.dashTimer) this.movementState.dashTimer = 0;
    if (!this.movementState.dashCooldownTimer) this.movementState.dashCooldownTimer = movement.dashCooldown;
    if (!this.movementState.dashDir) this.movementState.dashDir = { x: 0, y: 1 };
    if (!this.movementState.dashTelegraphTimer) this.movementState.dashTelegraphTimer = 0;

    // Telegraph warning phase (1 second warning before dash)
    if (this.movementState.dashTelegraphTimer > 0) {
      this.movementState.dashTelegraphTimer = Math.max(0, this.movementState.dashTelegraphTimer - deltaTime);

      // During telegraph, slow down movement significantly to show charging
      const dx = target.x - this.position.x;
      const dy = target.y - this.position.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      // Move very slowly during charge-up (20% speed)
      this.position.x += nx * movement.chaseSpeed * 0.2 * deltaTime;
      this.position.y += ny * movement.chaseSpeed * 0.2 * deltaTime;

      // Update dash direction to track player during telegraph
      this.movementState.dashDir = { x: nx, y: ny };

      // When telegraph ends, start the actual dash
      if (this.movementState.dashTelegraphTimer <= 0) {
        this.movementState.dashTimer = movement.dashDuration;
        this.currentTelegraph = undefined; // Clear telegraph when dash starts
      }
      return;
    }

    // Actual dash phase
    if (this.movementState.dashTimer > 0) {
      this.movementState.dashTimer = Math.max(0, this.movementState.dashTimer - deltaTime);
      this.position.x += this.movementState.dashDir.x * movement.dashSpeed * deltaTime;
      this.position.y += this.movementState.dashDir.y * movement.dashSpeed * deltaTime;
    } else {
      // Normal chase phase
      this.movementState.dashCooldownTimer -= deltaTime;
      const dx = target.x - this.position.x;
      const dy = target.y - this.position.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      this.position.x += nx * movement.chaseSpeed * deltaTime;
      this.position.y += ny * movement.chaseSpeed * deltaTime;

      // Check if ready to start a new dash (but not if player is invulnerable)
      if (this.movementState.dashCooldownTimer <= 0 && !this.isTargetInvulnerable?.()) {
        this.movementState.dashCooldownTimer = movement.dashCooldown;
        this.movementState.dashTelegraphTimer = 1.0; // 1 second warning!
        this.movementState.dashDir = { x: nx, y: ny };

        // Create the telegraph warning
        this.createTelegraph("dash", { x: this.position.x, y: this.position.y }, { direction: this.movementState.dashDir });
      }
    }
  }

  private updateTeleportMovement(deltaTime: number, screenSize: Vec2, movement: { interval: number; telegraphTime: number }): void {
    if (!this.movementState.teleportTimer) this.movementState.teleportTimer = movement.interval;
    if (!this.movementState.teleporting) this.movementState.teleporting = false;
    if (!this.movementState.telegraphTimer) this.movementState.telegraphTimer = 0;

    this.movementState.teleportTimer -= deltaTime;

    if (this.movementState.teleportTimer <= movement.telegraphTime && !this.movementState.teleporting) {
      // Show telegraph at destination
      if (!this.movementState.teleportTarget) {
        this.movementState.teleportTarget = {
          x: Math.random() * (screenSize.x - this.radius * 2) + this.radius,
          y: Math.random() * (screenSize.y * 0.5 - this.radius * 2) + this.radius
        };
        this.createTelegraph("teleport", this.movementState.teleportTarget, {});
      }

      this.telegraphAlpha = 1 - (this.movementState.teleportTimer / movement.telegraphTime);
    }

    if (this.movementState.teleportTimer <= 0) {
      // Perform teleport
      if (this.movementState.teleportTarget) {
        this.position.x = this.movementState.teleportTarget.x;
        this.position.y = this.movementState.teleportTarget.y;
        this.movementState.teleportTarget = undefined;
      }
      this.movementState.teleportTimer = movement.interval;
      this.telegraphAlpha = 0;
    }
  }

  private updateAggressiveMovement(deltaTime: number, target: Vec2, movement: { speed: number; dodgeRadius: number }): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.hypot(dx, dy) || 1;

    let desiredVx = 0;
    let desiredVy = 0;

    if (dist > movement.dodgeRadius) {
      // Chase player smoothly
      desiredVx = (dx / dist) * movement.speed;
      desiredVy = (dy / dist) * movement.speed;
    } else {
      // Orbit close to player
      const orbitAngle = this.movementPhase * 2;
      const orbitX = target.x + Math.cos(orbitAngle) * movement.dodgeRadius;
      const orbitY = target.y + Math.sin(orbitAngle) * movement.dodgeRadius;
      desiredVx = (orbitX - this.position.x) * 3;
      desiredVy = (orbitY - this.position.y) * 3;
    }

    // Apply smoothed velocity
    this.velocity.x += (desiredVx - this.velocity.x) * Math.min(1, deltaTime * 5);
    this.velocity.y += (desiredVy - this.velocity.y) * Math.min(1, deltaTime * 5);

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  private updateDefensiveMovement(deltaTime: number, target: Vec2, movement: { retreatDistance: number; strafeSpeed: number }): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.hypot(dx, dy) || 1;

    let desiredVx = 0;
    let desiredVy = 0;

    if (dist < movement.retreatDistance) {
      // Retreat from player smoothly
      desiredVx = -(dx / dist) * movement.strafeSpeed;
      desiredVy = -(dy / dist) * movement.strafeSpeed;
    }

    // Add strafe perpendicular to player
    const strafeAngle = Math.atan2(dy, dx) + Math.PI / 2;
    const strafeDir = Math.sin(this.movementPhase * 2) > 0 ? 1 : -1;
    desiredVx += Math.cos(strafeAngle) * movement.strafeSpeed * strafeDir * 0.7;
    desiredVy += Math.sin(strafeAngle) * movement.strafeSpeed * strafeDir * 0.7;

    // Apply smoothed velocity
    this.velocity.x += (desiredVx - this.velocity.x) * Math.min(1, deltaTime * 4);
    this.velocity.y += (desiredVy - this.velocity.y) * Math.min(1, deltaTime * 4);

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  private updateAttacks(deltaTime: number, target: Vec2): void {
    // Don't attack if target is invulnerable (respawn protection)
    if (this.isTargetInvulnerable?.()) {
      return; // Simply don't execute attacks during invulnerability
    }

    this.currentPhase.attacks.forEach((attack, index) => {
      const timerKey = `attack_${index}`;
      let timer = this.attackTimers.get(timerKey) ?? 0;
      timer -= deltaTime;

      if (timer <= 0) {
        this.executeAttack(attack, target);
        timer = attack.interval;
      }

      this.attackTimers.set(timerKey, timer);
    });
  }

  private executeAttack(attack: BossAttack, target: Vec2): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const angleToTarget = Math.atan2(dy, dx);

    switch (attack.type) {
      case "laser":
        const laserCount = attack.count ?? 1;
        const spread = attack.spread ?? 0;
        for (let i = 0; i < laserCount; i++) {
          const spreadAngle = laserCount > 1
            ? -spread / 2 + (spread / (laserCount - 1)) * i
            : 0;
          const angle = (angleToTarget + spreadAngle) * 180 / Math.PI;
          this.onShootProjectile({ x: this.position.x, y: this.position.y }, angle, "laser");
        }
        break;

      case "missile":
        const missileCount = attack.count ?? 1;
        for (let i = 0; i < missileCount; i++) {
          const angle = (angleToTarget + (Math.random() - 0.5) * 0.3) * 180 / Math.PI;
          setTimeout(() => {
            this.onShootProjectile({ x: this.position.x, y: this.position.y }, angle, "missile");
          }, i * 200);
        }
        break;

      case "spiral":
        this.spiralAngle += attack.rotationSpeed;
        for (let i = 0; i < attack.arms; i++) {
          const armAngle = this.spiralAngle + (i * Math.PI * 2 / attack.arms);
          const angle = armAngle * 180 / Math.PI;
          this.onShootProjectile({ x: this.position.x, y: this.position.y }, angle, "laser");
        }
        break;

      case "burst":
        for (let i = 0; i < attack.bullets; i++) {
          const angle = (i / attack.bullets) * 360;
          this.onShootProjectile({ x: this.position.x, y: this.position.y }, angle, "laser");
        }
        break;

      case "wave":
        // Create a wave of bullets
        const waveCount = Math.floor(attack.width / 30);
        const startAngle = angleToTarget - attack.width / 200;
        for (let i = 0; i < waveCount; i++) {
          const angle = (startAngle + (attack.width / 200) * (i / waveCount) * 2) * 180 / Math.PI;
          this.onShootProjectile({ x: this.position.x, y: this.position.y }, angle, "laser");
        }
        break;

      case "beam":
        // Start charging beam
        if (!this.attackStates.has("beam")) {
          this.attackStates.set("beam", {
            charging: true,
            chargeTimer: 0,
            firingTimer: 0,
            targetAngle: angleToTarget
          });
          this.createTelegraph("beam", this.position, { angle: angleToTarget, chargeTime: attack.chargeTime });
        }
        break;

      case "minions":
        if (this.onSpawnMinion) {
          for (let i = 0; i < attack.count; i++) {
            const angle = (i / attack.count) * Math.PI * 2;
            const spawnPos = {
              x: this.position.x + Math.cos(angle) * (this.radius + 50),
              y: this.position.y + Math.sin(angle) * (this.radius + 50)
            };
            this.onSpawnMinion(spawnPos);
          }
        }
        break;

      case "shockwave":
        this.shockwaveRadius = 0;
        this.attackStates.set("shockwave", { active: true, rings: attack.rings, currentRing: 0 });
        break;
    }
  }

  private updateVisualEffects(deltaTime: number): void {
    // Update beam attack
    const beamState = this.attackStates.get("beam");
    if (beamState) {
      if (beamState.charging) {
        beamState.chargeTimer += deltaTime;
        this.beamChargeProgress = Math.min(1, beamState.chargeTimer / 2); // 2 second charge

        if (beamState.chargeTimer >= 2) {
          beamState.charging = false;
          beamState.firing = true;
          this.beamAngle = beamState.targetAngle;
        }
      } else if (beamState.firing) {
        beamState.firingTimer += deltaTime;

        // Sweep beam if configured
        const attack = this.currentPhase.attacks.find(a => a.type === "beam");
        if (attack?.type === "beam" && attack.sweepAngle) {
          this.beamSweepProgress = beamState.firingTimer / attack.duration;
          this.beamAngle = beamState.targetAngle +
            Math.sin(this.beamSweepProgress * Math.PI) * attack.sweepAngle;
        }

        if (beamState.firingTimer >= (attack?.type === "beam" ? attack.duration : 1)) {
          this.attackStates.delete("beam");
          this.beamChargeProgress = 0;
        }
      }
    }

    // Update shockwave
    const shockwaveState = this.attackStates.get("shockwave");
    if (shockwaveState?.active) {
      this.shockwaveRadius += deltaTime * 300; // Expand at 300 pixels/second

      if (this.shockwaveRadius > 500) {
        shockwaveState.currentRing++;
        if (shockwaveState.currentRing >= shockwaveState.rings) {
          this.attackStates.delete("shockwave");
          this.shockwaveRadius = 0;
        } else {
          this.shockwaveRadius = 0;
        }
      }
    }
  }

  private createTelegraph(type: string, position: Vec2, data: any): void {
    this.currentTelegraph = { type, position, data };
    this.telegraphAlpha = 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Draw telegraphs
    this.renderTelegraphs(ctx);

    // Apply phase transition effects
    if (this.phaseTransitioning) {
      ctx.globalAlpha = 0.8 + this.phaseGlowIntensity * 0.2;
    }

    // Apply death alpha
    if (this.isDying) {
      ctx.globalAlpha = this.deathAlpha;
    }

    ctx.translate(this.position.x, this.position.y);
    ctx.rotate((this.angle + this.spriteRotationOffsetDeg) * Math.PI / 180);

    // Draw phase glow
    if (this.phaseGlowIntensity > 0) {
      ctx.shadowBlur = 30 * this.phaseGlowIntensity;
      ctx.shadowColor = this.currentPhase.color ?? "#ff00ff";
    }

    // Draw sprite
    if (this.sprite) {
      const scale = (this.radius * 2.6) / this.sprite.width;
      const w = this.sprite.width * scale;
      const h = this.sprite.height * scale;

      ctx.drawImage(this.sprite, -w / 2, -h / 2, w, h);

      // Draw flash overlay
      if (this.flashTimer > 0 && this.flashCacheKey) {
        const flashCanvas = BossV2.flashCache.getAnimatedFlash(
          this.flashCacheKey,
          this.flashTimer,
          this.flashDuration,
          5
        );
        if (flashCanvas) {
          ctx.drawImage(flashCanvas, -w / 2, -h / 2, w, h);
        }
      }
    } else {
      // Fallback rendering
      ctx.fillStyle = this.currentPhase.color ?? "#ff3b30";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Draw special attack effects
    this.renderAttackEffects(ctx);
  }

  private renderTelegraphs(ctx: CanvasRenderingContext2D): void {
    if (!this.currentTelegraph) return;

    ctx.save();
    ctx.globalAlpha = this.telegraphAlpha * 0.5;

    switch (this.currentTelegraph.type) {
      case "dash":
        // Calculate pulse effect for urgency
        const telegraphTime = this.movementState.dashTelegraphTimer || 0;
        const pulse = 0.5 + 0.5 * Math.sin(telegraphTime * 20); // Fast pulsing

        // Draw warning arrow/cone
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        const angle = Math.atan2(this.currentTelegraph.data.direction.y, this.currentTelegraph.data.direction.x);
        ctx.rotate(angle);

        // Draw expanding cone to show danger zone
        ctx.fillStyle = `rgba(255, 50, 50, ${0.3 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(400, -60);
        ctx.lineTo(400, 60);
        ctx.closePath();
        ctx.fill();

        // Draw bright directional line
        ctx.strokeStyle = `rgba(255, 100, 0, ${0.8 + pulse * 0.2})`;
        ctx.lineWidth = 5 + pulse * 3;
        ctx.setLineDash([20, 10]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(400, 0);
        ctx.stroke();

        // Draw warning symbols along the path
        ctx.fillStyle = `rgba(255, 255, 0, ${pulse})`;
        ctx.font = "bold 24px Arial";
        ctx.fillText("⚠", 100, -30);
        ctx.fillText("⚠", 200, -30);
        ctx.fillText("⚠", 300, -30);

        ctx.restore();

        // Draw pulsing circle around boss to show charge-up
        ctx.strokeStyle = `rgba(255, 150, 0, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + 20 + pulse * 10, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case "teleport":
        ctx.strokeStyle = "#9900ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          this.currentTelegraph.position.x,
          this.currentTelegraph.position.y,
          this.radius,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        break;

      case "beam":
        ctx.fillStyle = "#ff0000";
        ctx.globalAlpha = this.telegraphAlpha * 0.2;
        const beamLength = 1000;
        const beamWidth = 40;
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.currentTelegraph.data.angle);
        ctx.fillRect(0, -beamWidth / 2, beamLength, beamWidth);
        ctx.restore();
        break;
    }

    ctx.restore();
  }

  private renderAttackEffects(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Render beam
    const beamState = this.attackStates.get("beam");
    if (beamState?.firing) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#ff0000";
      ctx.strokeStyle = "#ffff00";
      ctx.lineWidth = 5;

      const beamLength = 1000;
      const beamWidth = 60 + Math.sin(Date.now() * 0.01) * 10;

      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(this.beamAngle);

      // Beam core
      const gradient = ctx.createLinearGradient(0, 0, beamLength, 0);
      gradient.addColorStop(0, "rgba(255, 255, 0, 0.9)");
      gradient.addColorStop(0.5, "rgba(255, 0, 0, 0.7)");
      gradient.addColorStop(1, "rgba(255, 0, 0, 0.3)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, -beamWidth / 2, beamLength, beamWidth);

      // Beam outline
      ctx.strokeRect(0, -beamWidth / 2, beamLength, beamWidth);

      ctx.restore();
    }

    // Render shockwave
    if (this.shockwaveRadius > 0) {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 4;
      ctx.globalAlpha = 1 - (this.shockwaveRadius / 500);
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.shockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();
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

        // Clear any movement state to stop boss in place
        this.movementState = {};
        this.currentTelegraph = undefined;
        this.mask = 0;
        // Don't call onDestroyed yet - wait for death animation to complete!
      }
    }
  }
}