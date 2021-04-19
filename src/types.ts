export enum PlayerState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

export interface LoggerChangeParams {
  playTime: number;
  manifestLoadTime: number;
}

export interface Track {
  id: string;
  artist: string;
  name: string;
  url: string;
}

export interface FlakaPlayerOptions {
  validatePlayback?: () => Promise<void>;
  onStateChange?: (state: PlayerState) => void;
  onTimeUpdate?: (duration) => void;
  onDurationUpdate?: (duration) => void;
  onLoggerChange?: (params: LoggerChangeParams) => void;
  onTrackChange?: (track: Track) => void;
}
