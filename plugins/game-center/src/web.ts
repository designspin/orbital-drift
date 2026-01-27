import { WebPlugin } from '@capacitor/core';
import type { AuthenticateResult, GameCenterPlugin, ShowLeaderboardOptions, SubmitScoreOptions } from './definitions';

export class GameCenterWeb extends WebPlugin implements GameCenterPlugin {
  async authenticate(): Promise<AuthenticateResult> {
    throw this.unimplemented('Game Center is not available on web.');
  }

  async submitScore(_options: SubmitScoreOptions): Promise<void> {
    throw this.unimplemented('Game Center is not available on web.');
  }

  async showLeaderboard(_options?: ShowLeaderboardOptions): Promise<void> {
    throw this.unimplemented('Game Center is not available on web.');
  }
}
