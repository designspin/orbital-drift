import type { BossConfig } from './BossV2';

export class BossFactory {
  createBossConfig(wave: number, tier: number, sprite: HTMLImageElement): BossConfig {
    const baseHealth = 12 + Math.floor(wave / 2) * 2;

    switch (tier) {
      case 0: // Wave 5 - The Guardian
        return {
          name: 'The Guardian',
          tier: 0,
          maxHealth: baseHealth,
          radius: 70,
          sprite,
          phases: [
            {
              healthThreshold: 1.0,
              name: 'Defensive',
              attacks: [{ type: 'laser', interval: 3.0, count: 1 }],
              movementPattern: { type: 'patrol', amplitude: 200, speed: 0.6 },
            },
            {
              healthThreshold: 0.75,
              name: 'Alert',
              attacks: [
                { type: 'laser', interval: 2.5, count: 2, spread: 0.2 },
                { type: 'burst', interval: 8.0, bullets: 8 },
              ],
              movementPattern: { type: 'patrol', amplitude: 250, speed: 0.8 },
            },
            {
              healthThreshold: 0.4,
              name: 'Desperate',
              attacks: [
                { type: 'laser', interval: 2.0, count: 3, spread: 0.3 },
                { type: 'burst', interval: 5.0, bullets: 12 },
                { type: 'wave', interval: 7.0, width: 150, speed: 200 },
              ],
              movementPattern: { type: 'strafe', amplitude: 280, speed: 1.0, verticalAmplitude: 60 },
            },
          ],
        };

      case 1: // Wave 10 - The Hunter
        return {
          name: 'The Hunter',
          tier: 1,
          maxHealth: baseHealth,
          radius: 65,
          sprite,
          phases: [
            {
              healthThreshold: 1.0,
              name: 'Stalking',
              attacks: [
                { type: 'laser', interval: 2.5, count: 2, spread: 0.15 },
                { type: 'missile', interval: 4.0, count: 1 },
              ],
              movementPattern: { type: 'strafe', amplitude: 300, speed: 0.9, verticalAmplitude: 80 },
            },
            {
              healthThreshold: 0.6,
              name: 'Pursuing',
              attacks: [
                { type: 'laser', interval: 2.0, count: 3, spread: 0.25 },
                { type: 'missile', interval: 3.0, count: 2 },
                { type: 'burst', interval: 5.0, bullets: 8 },
              ],
              movementPattern: { type: 'aggressive', speed: 100, dodgeRadius: 200 },
            },
            {
              healthThreshold: 0.3,
              name: 'Frenzy',
              attacks: [
                { type: 'spiral', interval: 0.1, arms: 3, rotationSpeed: 0.1 },
                { type: 'missile', interval: 2.0, count: 3 },
                { type: 'burst', interval: 4.0, bullets: 16 },
              ],
              movementPattern: { type: 'dash', dashSpeed: 180, dashDuration: 1.0, dashCooldown: 3.5, chaseSpeed: 90 },
            },
          ],
        };

      case 2: // Wave 15 - The Destroyer
        return {
          name: 'The Destroyer',
          tier: 2,
          maxHealth: baseHealth + 10,
          radius: 75,
          sprite,
          phases: [
            {
              healthThreshold: 1.0,
              name: 'Warming Up',
              attacks: [
                { type: 'laser', interval: 2.5, count: 2, spread: 0.2 },
                { type: 'missile', interval: 4.0, count: 2 },
                { type: 'wave', interval: 7.0, width: 180, speed: 220 },
              ],
              movementPattern: { type: 'orbit', radius: 240, speed: 1.0 },
            },
            {
              healthThreshold: 0.7,
              name: 'Destruction Mode',
              attacks: [
                { type: 'beam', chargeTime: 2.0, duration: 2.0, sweepAngle: 0.5, interval: 9.0 },
                { type: 'laser', interval: 2.2, count: 3, spread: 0.25 },
                { type: 'missile', interval: 3.5, count: 2 },
              ],
              movementPattern: { type: 'defensive', retreatDistance: 300, strafeSpeed: 70 },
            },
            {
              healthThreshold: 0.35,
              name: 'Overload',
              attacks: [
                { type: 'beam', chargeTime: 1.8, duration: 2.5, sweepAngle: 0.8, interval: 8.0 },
                { type: 'burst', interval: 5.0, bullets: 12 },
                { type: 'missile', interval: 3.0, count: 2 },
              ],
              movementPattern: { type: 'strafe', amplitude: 250, speed: 1.2, verticalAmplitude: 80 },
            },
          ],
        };

      case 3: // Wave 20 - The Vanguard
        return {
          name: 'The Vanguard',
          tier: 3,
          maxHealth: baseHealth + 15,
          radius: 70,
          sprite,
          phases: [
            {
              healthThreshold: 1.0,
              name: 'Tactical',
              attacks: [
                { type: 'laser', interval: 2.5, count: 2, spread: 0.2 },
                { type: 'missile', interval: 4.0, count: 2 },
                { type: 'minions', interval: 12.0, count: 2 },
              ],
              movementPattern: { type: 'teleport', interval: 5.0, telegraphTime: 1.2 },
            },
            {
              healthThreshold: 0.65,
              name: 'Blitz',
              attacks: [
                { type: 'laser', interval: 2.0, count: 3, spread: 0.3 },
                { type: 'missile', interval: 3.5, count: 2 },
                { type: 'burst', interval: 6.0, bullets: 12 },
              ],
              movementPattern: { type: 'aggressive', speed: 90, dodgeRadius: 200 },
            },
            {
              healthThreshold: 0.3,
              name: 'Last Stand',
              attacks: [
                { type: 'beam', chargeTime: 1.5, duration: 2.0, sweepAngle: 0.6, interval: 7.0 },
                { type: 'burst', interval: 5.0, bullets: 16 },
                { type: 'wave', interval: 4.0, width: 200, speed: 250 },
              ],
              movementPattern: { type: 'dash', dashSpeed: 160, dashDuration: 0.8, dashCooldown: 4.0, chaseSpeed: 80 },
            },
          ],
        };

      default: // Wave 25+ - The Overlord (Final Boss)
        return {
          name: 'The Overlord',
          tier: 5,
          maxHealth: 60,
          radius: 85,
          sprite,
          phases: [
            {
              healthThreshold: 1.0,
              name: 'Awakening',
              attacks: [
                { type: 'laser', interval: 2.2, count: 3, spread: 0.2 },
                { type: 'missile', interval: 3.5, count: 2 },
                { type: 'wave', interval: 6.0, width: 200, speed: 240 },
              ],
              movementPattern: { type: 'patrol', amplitude: 280, speed: 0.8 },
              color: '#ff0000',
            },
            {
              healthThreshold: 0.75,
              name: 'Unleashed',
              attacks: [
                { type: 'beam', chargeTime: 2.0, duration: 2.0, sweepAngle: 0.5, interval: 8.0 },
                { type: 'laser', interval: 2.0, count: 4, spread: 0.3 },
                { type: 'missile', interval: 3.0, count: 3 },
                { type: 'burst', interval: 6.0, bullets: 16 },
              ],
              movementPattern: { type: 'teleport', interval: 4.5, telegraphTime: 1.0 },
              color: '#ff00ff',
            },
            {
              healthThreshold: 0.5,
              name: 'Apocalypse',
              attacks: [
                { type: 'beam', chargeTime: 1.8, duration: 2.5, sweepAngle: 0.8, interval: 7.0 },
                { type: 'burst', interval: 5.0, bullets: 20 },
                { type: 'minions', interval: 10.0, count: 3 },
                { type: 'missile', interval: 2.5, count: 3 },
              ],
              movementPattern: { type: 'aggressive', speed: 100, dodgeRadius: 180 },
              color: '#ffff00',
            },
            {
              healthThreshold: 0.25,
              name: 'Desperation',
              attacks: [
                { type: 'beam', chargeTime: 1.5, duration: 3.0, sweepAngle: 1.0, interval: 6.0 },
                { type: 'burst', interval: 4.0, bullets: 24 },
                { type: 'wave', interval: 4.0, width: 250, speed: 280 },
                { type: 'missile', interval: 2.0, count: 4 },
              ],
              movementPattern: { type: 'dash', dashSpeed: 180, dashDuration: 1.0, dashCooldown: 3.5, chaseSpeed: 90 },
              color: '#00ffff',
            },
          ],
        };
    }
  }
}
