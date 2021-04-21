export enum PlayState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

export interface PlayerState {
  playState: PlayState;
  volume: number;
  duration?: number;
}

export interface Track {
  id: string;
  artist: string;
  name: string;
  url: string;
}

export interface FlakaPlayerOptions {
  validatePlayback?: () => Promise<void>;
  onStateChange?: (state: PlayerState, track: Track) => void;
  onTimeUpdate?: (duration: number) => void;
  onDurationUpdate?: (duration: number) => void;
  reportManifestLoadedTime?: (track: Track, time: number) => void;
  reportPlayTime?: (track: Track, time: number) => void;
  onTrackChange?: (track: Track) => void;
}
