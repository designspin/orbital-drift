export const CollisionLayer = {
  Player: 1 << 0,
  PlayerBullet: 1 << 1,
  Enemy: 1 << 2,
  EnemyBullet: 1 << 3,
  Asteroid: 1 << 4,
} as const;
