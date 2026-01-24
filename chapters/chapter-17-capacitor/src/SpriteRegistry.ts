/**
 * Centralized registry for all sprite assets and their source rectangles
 * Reduces clutter in main.ts by organizing all sprite data in one place
 */
export class SpriteRegistry {
  // Player sprite rectangles
  readonly player = {
    ship: { x: 38, y: 464, w: 63, h: 57 },
    shipLarge: { x: 60, y: 146, w: 264, h: 262 }, // Large ship sprite for title screen
  };

  // Projectile sprite rectangles
  readonly projectiles = {
    player: { x: 122, y: 468, w: 121, h: 124 },
    enemy: { x: 122, y: 653, w: 117, h: 132 },
  };

  // Missile sprite rectangles
  readonly missiles = [
    { x: 142, y: 167, w: 76, h: 225 },
    { x: 311, y: 169, w: 74, h: 223 },
    { x: 473, y: 169, w: 78, h: 223 },
    { x: 638, y: 169, w: 78, h: 222 },
    { x: 805, y: 170, w: 79, h: 223 },
  ];

  // Enemy sprite rectangles (enemy.png)
  readonly enemies = {
    default: { x: 376, y: 187, w: 274, h: 218 },
    strafe: { x: 693, y: 199, w: 276, h: 201 },
    dasher: { x: 372, y: 584, w: 281, h: 230 },
    orbiter: { x: 703, y: 603, w: 258, h: 204 },
    // sine: { x: 70, y: 581, w: 244, h: 208 }, // Unused
  };

  // Enemy2 sprite rectangles (enemy2.png)
  readonly enemies2 = {
    type1: { x: 704, y: 102, w: 277, h: 289 },
    type2: { x: 49, y: 104, w: 284, h: 270 },
    type3: { x: 372, y: 119, w: 280, h: 266 },
    type4: { x: 55, y: 552, w: 271, h: 254 },
  };

  // Boss sprite rectangles
  readonly boss = {
    default: { x: 373, y: 421, w: 275, h: 232 },
  };

  // Asteroid sprite rectangles
  readonly asteroids = {
    XL: [
      { x: 43, y: 41, w: 352, h: 253 },
      { x: 441, y: 37, w: 359, h: 269 },
    ],
    L: [
      { x: 37, y: 361, w: 220, h: 177 },
      { x: 305, y: 372, w: 234, h: 171 },
      { x: 587, y: 375, w: 224, h: 168 },
    ],
    M: [
      { x: 48, y: 638, w: 168, h: 139 },
      { x: 269, y: 650, w: 155, h: 125 },
      { x: 476, y: 656, w: 149, h: 116 },
      { x: 678, y: 658, w: 136, h: 114 },
    ],
    S: [
      { x: 67, y: 891, w: 97, h: 73 },
      { x: 227, y: 888, w: 95, h: 76 },
      { x: 387, y: 888, w: 95, h: 76 },
      { x: 544, y: 892, w: 95, h: 74 },
      { x: 701, y: 895, w: 81, h: 67 },
    ],
  };

  /**
   * Get enemy sprite rect based on behavior type
   */
  getEnemySpriteRect(behavior: string): { x: number; y: number; w: number; h: number } {
    switch (behavior) {
      case 'scout':
      case 'hunter':
        return this.enemies.default;
      case 'guardian':
        return this.enemies.strafe;
      case 'interceptor':
        return this.enemies.dasher;
      case 'bomber':
        return this.enemies.orbiter;
      case 'sniper':
        return this.enemies2.type1;
      case 'assassin':
        return this.enemies2.type2;
      case 'swarm':
        return this.enemies2.type3;
      case 'elite':
      case 'commander':
        return this.enemies2.type4;
      default:
        return this.enemies.default;
    }
  }

  /**
   * Get the appropriate enemy sprite image name
   */
  getEnemySpriteName(behavior: string): 'enemy' | 'enemy2' {
    const enemy2Behaviors = ['sniper', 'assassin', 'swarm', 'elite', 'commander'];
    return enemy2Behaviors.includes(behavior) ? 'enemy2' : 'enemy';
  }
}