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
  albumId: string;
  album: string;
  artistId: string;
}

export enum DrmType {
  WIDEVINE = 'widevine',
  PLAYREADY = 'playready',
  FAIRPLAY = 'fairplay',
}

export type onErrorType = ErrorEvent | shaka.util.Error | Event;

export interface FlakaPlayerOptions {
  validatePlayback?: () => Promise<void>;
  onStateChange?: (state: PlayerState, track: Track) => void;
  onTimeUpdate?: (duration: number) => void;
  onTrackChange?: (track: Track) => void;
  onTrackEnded?: () => void;
  onError?: (error: onErrorType) => void;
  reportManifestLoadedTime?: (track: Track, time: number) => void;
  reportPlayTime?: (track: Track, time: number) => void;
}
