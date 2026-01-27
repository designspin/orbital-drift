export type Theme = {
  base: [number, number, number];
  overlay: [number, number, number, number];
  starTint: [number, number, number];
  nebulaAlphaScale: number;
};

const WAVE_THEMES: Theme[] = [
  { base: [11, 15, 26], overlay: [40, 60, 120, 0.35], starTint: [210, 225, 255], nebulaAlphaScale: 1.0 },
  { base: [10, 19, 18], overlay: [40, 140, 120, 0.35], starTint: [170, 255, 230], nebulaAlphaScale: 0.8 },
  { base: [20, 11, 31], overlay: [120, 50, 200, 0.4], starTint: [220, 180, 255], nebulaAlphaScale: 1.3 },
  { base: [26, 11, 11], overlay: [200, 60, 40, 0.35], starTint: [255, 190, 170], nebulaAlphaScale: 0.9 },
  { base: [11, 16, 32], overlay: [60, 120, 255, 0.42], starTint: [180, 210, 255], nebulaAlphaScale: 1.1 },
];

export class ThemeManager {
  private currentTheme?: Theme;
  private targetTheme?: Theme;
  private blendTime = 0;
  private blendDuration = 3;

  getThemeForWave(wave: number): Theme {
    return WAVE_THEMES[(wave - 1) % WAVE_THEMES.length];
  }

  setWaveTheme(wave: number): void {
    const next = this.getThemeForWave(wave);
    if (!this.currentTheme) {
      this.currentTheme = next;
      this.targetTheme = next;
      this.blendTime = this.blendDuration;
      return;
    }
    this.targetTheme = next;
    this.blendTime = 0;
  }

  update(deltaTime: number): void {
    if (!this.currentTheme || !this.targetTheme) return;
    if (this.blendTime < this.blendDuration) {
      this.blendTime = Math.min(this.blendDuration, this.blendTime + deltaTime);
    } else {
      this.currentTheme = this.targetTheme;
    }
  }

  getBlendedTheme(wave: number): Theme {
    if (!this.currentTheme || !this.targetTheme) {
      const theme = this.getThemeForWave(wave);
      this.currentTheme = theme;
      this.targetTheme = theme;
      return theme;
    }

    const t = Math.min(1, Math.max(0, this.blendTime / this.blendDuration));
    const lerp = (a: number, b: number) => a + (b - a) * t;

    return {
      base: [
        Math.round(lerp(this.currentTheme.base[0], this.targetTheme.base[0])),
        Math.round(lerp(this.currentTheme.base[1], this.targetTheme.base[1])),
        Math.round(lerp(this.currentTheme.base[2], this.targetTheme.base[2])),
      ],
      overlay: [
        Math.round(lerp(this.currentTheme.overlay[0], this.targetTheme.overlay[0])),
        Math.round(lerp(this.currentTheme.overlay[1], this.targetTheme.overlay[1])),
        Math.round(lerp(this.currentTheme.overlay[2], this.targetTheme.overlay[2])),
        lerp(this.currentTheme.overlay[3], this.targetTheme.overlay[3]),
      ],
      starTint: [
        Math.round(lerp(this.currentTheme.starTint[0], this.targetTheme.starTint[0])),
        Math.round(lerp(this.currentTheme.starTint[1], this.targetTheme.starTint[1])),
        Math.round(lerp(this.currentTheme.starTint[2], this.targetTheme.starTint[2])),
      ],
      nebulaAlphaScale: lerp(this.currentTheme.nebulaAlphaScale, this.targetTheme.nebulaAlphaScale),
    };
  }
}
