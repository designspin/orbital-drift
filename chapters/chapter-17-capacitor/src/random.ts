let state = 1;

export const setSeed = (seed: number): void => {
  const s = seed >>> 0;
  state = s === 0 ? 1 : s;
};

export const random = (): number => {
  // mulberry32
  let t = (state += 0x6D2B79F5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const randomRange = (min: number, max: number): number =>
  min + (max - min) * random();

export const randomInt = (min: number, max: number): number =>
  Math.floor(randomRange(min, max + 1));
