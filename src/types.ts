export enum PlayState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

export interface PlayerState {
  loading: boolean;
  playState: PlayState;
  volume: number;
  duration?: number;
  buffering?: boolean;
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
  onTrackChange?: (track: Track) => void;
  reportManifestLoadedTime?: (track: Track, time: number) => void;
  reportPlayTime?: (track: Track, time: number) => void;
}
