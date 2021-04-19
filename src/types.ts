export enum PlayerState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

export interface FlakaPlayerOptions {
  validatePlayback?: () => Promise<void>;
  onStateChange?: (state: PlayerState) => void;
  onTimeUpdate?: (duration) => void;
  onDurationUpdate?: (duration) => void;
  onLoggerChange?: (playbackTime) => void;
}
