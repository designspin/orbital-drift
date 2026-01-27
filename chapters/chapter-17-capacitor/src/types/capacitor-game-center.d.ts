declare module 'capacitor-game-center' {
  export interface AuthenticateResult {
    playerId?: string;
    displayName?: string;
  }

  export interface SubmitScoreOptions {
    leaderboardId: string;
    score: number;
  }

  export interface ShowLeaderboardOptions {
    leaderboardId?: string;
  }

  export interface GameCenterPlugin {
    authenticate(): Promise<AuthenticateResult>;
    submitScore(options: SubmitScoreOptions): Promise<void>;
    showLeaderboard(options?: ShowLeaderboardOptions): Promise<void>;
  }

  export const GameCenter: GameCenterPlugin;
}