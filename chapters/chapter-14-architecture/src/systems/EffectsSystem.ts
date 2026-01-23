import type { AudioManager, EventBus, ParticleSystem, System } from "@course/lib";
import type { GameEvents } from "../events";

export class EffectsSystem implements System {
  private audio: AudioManager;
  private particles: ParticleSystem;

  constructor(audio: AudioManager, particles: ParticleSystem) {
    this.audio = audio;
    this.particles = particles;
  }

  update(): void {}

  bind(events: EventBus<GameEvents>): void {
    events.on('shot:player', ({ position, angle }) => {
      this.audio.playSound('lazerShoot', 0.6);
      this.emitMuzzleFlash(position, angle);
    });

    events.on('shot:enemy', ({ position, angle }) => {
      this.audio.playSound('laserShootEnemy', 0.7);
      this.emitMuzzleFlash(position, angle, '#ff8b8b');
    });

    events.on('asteroid:destroyed', ({ asteroid }) => {
      this.audio.playSound('explosion', 0.7);
      this.emitExplosion(asteroid.position, 26, '#ffffff', '#ff9a7a');
    });

    events.on('enemy:destroyed', ({ position }) => {
      this.audio.playSound('explosion', 0.7);
      this.emitExplosion(position, 22, '#ff6b6b', '#ffd3a3');
    });

    events.on('player:destroyed', ({ position }) => {
      this.audio.playSound('explosion', 0.7);
      this.emitExplosion(position, 30, '#7fd1ff', '#ffffff');
    });
  }

  emitThrusterTrail(position: { x: number; y: number }, angle: number, radius: number): void {
    const rad = (angle * Math.PI) / 180;
    const offset = radius * 1.1;
    const spawn = {
      x: position.x + Math.cos(rad) * offset,
      y: position.y + Math.sin(rad) * offset,
    };

    this.particles.emit({
      position: spawn,
      count: 3,
      life: { min: 0.15, max: 0.45 },
      speed: { min: 20, max: 80 },
      angle: { min: angle - 35, max: angle + 35 },
      size: { min: 1, max: 3 },
      sizeEnd: 0,
      opacity: { min: 0.4, max: 0.9 },
      opacityEnd: 0,
      color: { start: '#7fd1ff', end: '#326eff' },
      shape: 'circle',
      drag: 0.1,
    });
  }

  private emitMuzzleFlash(position: { x: number; y: number }, angle: number, tint: string = '#ffe6a7'): void {
    this.particles.emit({
      position,
      count: 14,
      life: { min: 0.12, max: 0.4 },
      speed: { min: 80, max: 220 },
      angle: { min: angle - 18, max: angle + 18 },
      size: { min: 2, max: 4 },
      sizeEnd: 0,
      opacity: 1,
      opacityEnd: 0,
      color: { start: tint, end: '#ff6b6b' },
      blendMode: 'lighter',
      shape: 'circle',
    });
  }

  private emitExplosion(position: { x: number; y: number }, count: number, startColor: string, endColor: string): void {
    this.particles.emit({
      position,
      count,
      life: { min: 0.4, max: 1.0 },
      speed: { min: 60, max: 240 },
      angle: { min: 0, max: 360 },
      size: { min: 2, max: 6 },
      sizeEnd: 0,
      opacity: { min: 0.8, max: 1 },
      opacityEnd: 0,
      color: { start: startColor, end: endColor },
      blendMode: 'lighter',
      shape: 'circle',
      spawnShape: 'circle',
      spawnRadius: 6,
    });
  }
}
