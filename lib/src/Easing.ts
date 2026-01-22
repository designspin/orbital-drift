const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

export const easeInSine = (t: number): number => {
  t = clamp01(t);
  return 1 - Math.cos((t * Math.PI) / 2);
};

export const easeOutSine = (t: number): number => {
  t = clamp01(t);
  return Math.sin((t * Math.PI) / 2);
};

export const easeInOutSine = (t: number): number => {
  t = clamp01(t);
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

export const easeInQuad = (t: number): number => {
  t = clamp01(t);
  return t * t;
};

export const easeOutQuad = (t: number): number => {
  t = clamp01(t);
  return 1 - (1 - t) * (1 - t);
};

export const easeInOutQuad = (t: number): number => {
  t = clamp01(t);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

export const easeInCubic = (t: number): number => {
  t = clamp01(t);
  return t * t * t;
};

export const easeOutCubic = (t: number): number => {
  t = clamp01(t);
  return 1 - Math.pow(1 - t, 3);
};

export const easeInOutCubic = (t: number): number => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
