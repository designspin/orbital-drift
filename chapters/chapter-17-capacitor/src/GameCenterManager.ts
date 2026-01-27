import { Capacitor } from '@capacitor/core';
import { GameCenter } from 'capacitor-game-center';

export type GameCenterState = {
  available: boolean;
  authenticated: boolean;
};

export class GameCenterManager {
  private leaderboardId: string;
  private authenticated = false;
  private authPending = false;
  private presenting = false;
  private presentedAt = 0;
  private onChange?: (state: GameCenterState) => void;

  constructor(leaderboardId: string) {
    this.leaderboardId = leaderboardId;
  }

  isAvailable(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getState(): GameCenterState {
    return {
      available: this.isAvailable(),
      authenticated: this.authenticated,
    };
  }

  setOnChange(onChange: (state: GameCenterState) => void): void {
    this.onChange = onChange;
  }

  private notifyChange(): void {
    this.onChange?.(this.getState());
  }

  async authenticate(): Promise<void> {
    if (!this.isAvailable()) return;
    if (this.authenticated || this.authPending) return;

    this.authPending = true;
    console.log('[GameCenter] platform', Capacitor.getPlatform(), 'native', Capacitor.isNativePlatform());
    console.log('[GameCenter] authenticate: start');

    try {
      await GameCenter.authenticate();
      this.authenticated = true;
      console.log('[GameCenter] authenticate: success');
    } catch (error) {
      this.authenticated = false;
      console.warn('[GameCenter] authenticate: failed', error);
    } finally {
      this.authPending = false;
      this.notifyChange();
    }
  }

  async submitScore(score: number): Promise<void> {
    if (!this.isAvailable()) return;
    if (!this.leaderboardId) return;

    await this.authenticate();
    if (!this.authenticated) return;

    const finalScore = Math.max(0, Math.floor(score));
    if (finalScore <= 0) return;

    try {
      await GameCenter.submitScore({ leaderboardId: this.leaderboardId, score: finalScore });
      console.log('[GameCenter] submitScore: success', finalScore);
    } catch (error) {
      console.warn('[GameCenter] submitScore: failed', error);
    }
  }

  async showLeaderboard(): Promise<void> {
    if (!this.isAvailable()) return;

    await this.authenticate();
    if (!this.authenticated) return;
    if (this.presenting) return;

    const now = performance.now();
    if (now - this.presentedAt < 800) return;

    this.presenting = true;
    try {
      await GameCenter.showLeaderboard(this.leaderboardId ? { leaderboardId: this.leaderboardId } : undefined);
      this.presentedAt = performance.now();
      console.log('[GameCenter] showLeaderboard: success');
    } catch (error) {
      console.warn('[GameCenter] showLeaderboard: failed', error);
    } finally {
      this.presenting = false;
    }
  }
}
