export enum PlayerState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
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
  onTimeUpdate?: (duration: number) => void;
  onDurationUpdate?: (duration: number) => void;
  onManifestLoaded?: (time: number) => void;
  onPlayTimeChange?: (time: number) => void;
  onTrackChange?: (track: Track) => void;
}
