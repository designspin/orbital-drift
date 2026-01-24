export const GAME_CONFIG = {
  seed: 1337,
  debug: {
    bossTest: false,
    testWave: 0, // Set to 5, 10, 15, 20, 25+ for boss waves, or any wave number for testing
  },
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
