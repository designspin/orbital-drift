import { Preferences } from '@capacitor/preferences';

export type Settings = {
  musicVolume: number;
  sfxVolume: number;
  touchHandedness: 'left' | 'right';
  touchFireSide: 'left' | 'right';
  touchHintShown: boolean;
  touchHintSignature: string;
};

export type SettingsCallbacks = {
  onMusicVolumeChange: (volume: number) => void;
  onSfxVolumeChange: (volume: number) => void;
  onTouchOptionsChange: (handedness: 'left' | 'right', fireSide: 'left' | 'right') => void;
};

const STORAGE_KEY = 'od-settings';

const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.5,
  sfxVolume: 1,
  touchHandedness: 'right',
  touchFireSide: 'right',
  touchHintShown: false,
  touchHintSignature: '',
};

export class SettingsManager {
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private callbacks?: SettingsCallbacks;
  private touchLeftRegionRatio = 0.52;
  private touchActionRegionRatio = 0.33;

  constructor(callbacks?: SettingsCallbacks) {
    this.callbacks = callbacks;
  }

  setCallbacks(callbacks: SettingsCallbacks): void {
    this.callbacks = callbacks;
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  get musicVolume(): number {
    return this.settings.musicVolume;
  }

  get sfxVolume(): number {
    return this.settings.sfxVolume;
  }

  get touchHandedness(): 'left' | 'right' {
    return this.settings.touchHandedness;
  }

  get touchFireSide(): 'left' | 'right' {
    return this.settings.touchFireSide;
  }

  get touchHintShown(): boolean {
    return this.settings.touchHintShown;
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.callbacks?.onMusicVolumeChange(this.settings.musicVolume);
    void this.save();
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.callbacks?.onSfxVolumeChange(this.settings.sfxVolume);
    void this.save();
  }

  setTouchHandedness(handedness: 'left' | 'right'): void {
    this.settings.touchHandedness = handedness;
    this.callbacks?.onTouchOptionsChange(this.settings.touchHandedness, this.settings.touchFireSide);
    void this.save();
  }

  setTouchFireSide(fireSide: 'left' | 'right'): void {
    this.settings.touchFireSide = fireSide;
    this.callbacks?.onTouchOptionsChange(this.settings.touchHandedness, this.settings.touchFireSide);
    void this.save();
  }

  setTouchOptions(handedness: 'left' | 'right', fireSide: 'left' | 'right'): void {
    this.settings.touchHandedness = handedness;
    this.settings.touchFireSide = fireSide;
    this.callbacks?.onTouchOptionsChange(handedness, fireSide);
    void this.save();
  }

  markTouchHintShown(): void {
    this.settings.touchHintShown = true;
    this.settings.touchHintSignature = this.getTouchHintSignature();
    void this.save();
  }

  shouldShowTouchHint(): boolean {
    if (this.settings.touchHintShown) {
      // Check if signature changed (settings changed since hint was shown)
      const currentSignature = this.getTouchHintSignature();
      if (this.settings.touchHintSignature !== currentSignature) {
        return true;
      }
      return false;
    }
    return true;
  }

  private getTouchHintSignature(): string {
    return JSON.stringify({
      handedness: this.settings.touchHandedness,
      fireSide: this.settings.touchFireSide,
      leftRegionRatio: this.touchLeftRegionRatio,
      actionRegionRatio: this.touchActionRegionRatio,
    });
  }

  async load(): Promise<void> {
    try {
      const stored = await Preferences.get({ key: STORAGE_KEY });
      if (!stored.value) {
        this.applyCallbacks();
        return;
      }

      const data = JSON.parse(stored.value) as Partial<Settings>;

      if (typeof data.musicVolume === 'number') {
        this.settings.musicVolume = Math.max(0, Math.min(1, data.musicVolume));
      }
      if (typeof data.sfxVolume === 'number') {
        this.settings.sfxVolume = Math.max(0, Math.min(1, data.sfxVolume));
      }
      if (data.touchHandedness === 'left' || data.touchHandedness === 'right') {
        this.settings.touchHandedness = data.touchHandedness;
      }
      if (data.touchFireSide === 'left' || data.touchFireSide === 'right') {
        this.settings.touchFireSide = data.touchFireSide;
      }
      if (typeof data.touchHintShown === 'boolean') {
        this.settings.touchHintShown = data.touchHintShown;
      }
      if (typeof data.touchHintSignature === 'string') {
        this.settings.touchHintSignature = data.touchHintSignature;
      }

      // Check if touch hint signature changed
      const currentSignature = this.getTouchHintSignature();
      if (this.settings.touchHintSignature !== currentSignature) {
        this.settings.touchHintShown = false;
        this.settings.touchHintSignature = currentSignature;
      }

      this.applyCallbacks();
    } catch {
      this.applyCallbacks();
    }
  }

  private applyCallbacks(): void {
    this.callbacks?.onMusicVolumeChange(this.settings.musicVolume);
    this.callbacks?.onSfxVolumeChange(this.settings.sfxVolume);
    this.callbacks?.onTouchOptionsChange(this.settings.touchHandedness, this.settings.touchFireSide);
  }

  private async save(): Promise<void> {
    const payload = JSON.stringify({
      musicVolume: this.settings.musicVolume,
      sfxVolume: this.settings.sfxVolume,
      touchHandedness: this.settings.touchHandedness,
      touchFireSide: this.settings.touchFireSide,
      touchHintShown: this.settings.touchHintShown,
      touchHintSignature: this.getTouchHintSignature(),
    });
    try {
      await Preferences.set({ key: STORAGE_KEY, value: payload });
    } catch {
      // Ignore persistence errors on unsupported platforms
    }
  }
}
