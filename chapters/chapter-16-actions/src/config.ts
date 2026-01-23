export const GAME_CONFIG = {
  world: {
    width: 2400,
    height: 1800,
  },
  shield: {
    drainRate: 0.35,
    regenRate: 0.2,
    regenDelay: 3,
  },
  enemy: {
    spawnInterval: 2.5,
    minSpawnDistance: 300,
    maxCap: 20,
  },
  respawn: {
    delay: 2.5,
  },
  waves: {
    transitionDuration: 2,
  },
} as const;
