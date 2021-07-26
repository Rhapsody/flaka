import { Player, polyfill, net, util, extern } from 'shaka-player';
import { defaultPlayerState } from './constants';
import { createVideoElement, appendVideoToBody } from './helpers';
import { Logger } from './Logger';
import { FlakaPlayerOptions, PlayerState, PlayState, Track, DetermineVideoElement } from './types';

export class FlakaPlayer {
  id: string;
  options: FlakaPlayerOptions;
  state = defaultPlayerState;
  player?: Player;
  currentTrack?: Track;
  videoElement: HTMLVideoElement;
  determineVideoElement?: DetermineVideoElement;
  logger: Logger;

  constructor(id: string, options: FlakaPlayerOptions, determineVideoElement?: DetermineVideoElement) {
    this.id = id;
    this.options = options;
    this.logger = new Logger();

    this.videoElement = document.getElementById(id) as HTMLVideoElement;
    if (this.videoElement) {
      this.videoElement.remove();
    }

    if (determineVideoElement && typeof determineVideoElement === 'function') {
      this.videoElement = determineVideoElement(createVideoElement(id));
    } else {
      this.videoElement = document.getElementById(id) as HTMLVideoElement;

      if (!this.videoElement) {
        this.videoElement = createVideoElement(id);
        this.videoElement = appendVideoToBody(this.videoElement);
      }
    }

    this.videoElement.addEventListener('timeupdate', (event: Event & { target: HTMLVideoElement }) => {
      options.onTimeUpdate(event.target.currentTime);
    });

    this.videoElement.addEventListener('error', (event) => {
      console.error(event);
      this.options.onError(event.message);
    });

    this.videoElement.addEventListener('durationchange', (event: Event & { target: HTMLVideoElement }) => {
      this.changeState({ ...this.state, duration: event.target.duration });
    });

    this.videoElement.addEventListener('ended', () => {
      this.changeState({ ...this.state, playState: PlayState.STOPPED });
      options.onTrackEnded();
    });

    // Check to see if the browser supports the basic APIs Shaka needs.
    if (Player.isBrowserSupported()) {
      polyfill.installAll();
      this.initPlayer();
    } else {
      throw new Error('Browser is not supported');
    }
  }

  initPlayer(): void {
    const player = new Player(this.videoElement);

    // Listen for error events.
    player.addEventListener('error', (event) => {
      this.onErrorEvent(event);
    });
    player.addEventListener('buffering', (event) => {
      this.changeState({ ...this.state, loading: event.buffering });
    });
    player.addEventListener('loading', () => {
      this.changeState({ ...this.state, loading: true });
    });
    player.addEventListener('loaded', () => {
      this.changeState({ ...this.state, loading: false });
    });

    this.player = player;
  }

  onError(error: util.Error): void {
    // Log the error.
    console.error('Error code', error.code, 'object', error);
    if (this.options.onError) {
      this.options.onError(error.message);
    }
  }

  onErrorEvent(event: Player.ErrorEvent): void {
    this.logger.log('error', {
      trackId: this.currentTrack?.id,
      description: event.detail.message,
    });
    this.onError(event.detail);
  }

  changeState(newState: PlayerState): void {
    this.state = newState;
    if (this.options.onStateChange) {
      this.options.onStateChange(this.state, this.currentTrack);
    }
  }

  async play(track: Track, servers?: extern.DrmConfiguration['servers'], token?: string): Promise<void> {
    this.player.resetConfiguration();
    // Try to load a manifest.
    // This is an asynchronous process.
    try {
      if (servers) {
        this.player.configure({
          drm: {
            servers,
          },
        });
      }

      if (token) {
        this.player.getNetworkingEngine().registerRequestFilter(function (type, request) {
          if (type === net.NetworkingEngine.RequestType.LICENSE) {
            request.headers['customdata'] = token;
          }
        });
      }

      // validate playback
      if (this.options.validatePlayback) {
        await this.options.validatePlayback();
      }

      let stats = this.player.getStats();

      this.logger.log('playbackTime', {
        trackId: this.currentTrack?.id,
        time: stats.playTime,
      });

      if (this.options.reportPlayTime && stats.playTime) {
        this.options.reportPlayTime(this.currentTrack, stats.playTime);
      }

      await this.player.load(track.url);

      this.currentTrack = track;

      if (this.options.onTrackChange) {
        this.options.onTrackChange(track);
      }

      stats = this.player.getStats();

      this.logger.log('manifestLoadTime', {
        trackId: this.currentTrack?.id,
        time: stats.manifestTimeSeconds,
      });

      if (this.options.reportManifestLoadedTime && stats.manifestTimeSeconds) {
        this.options.reportManifestLoadedTime(track, stats.manifestTimeSeconds);
      }

      this.changeState({ ...this.state, playState: PlayState.PLAYING });
    } catch (e) {
      // onError is executed if the asynchronous load fails.
      this.onError(e);
    }
  }

  pause(): void {
    console.log('PAUSE');
    this.videoElement.pause();
    this.changeState({ ...this.state, playState: PlayState.PAUSED });
  }

  resume(): void {
    this.videoElement.play();
    this.changeState({ ...this.state, playState: PlayState.PLAYING });
  }

  seek(time: number): void {
    this.videoElement.currentTime = time;
  }

  setVolume(volume: number): void {
    this.videoElement.volume = volume;
    this.changeState({ ...this.state, volume });
  }

  handleSize(width: string | number | undefined, height: string | number | undefined): void {
    this.videoElement.setAttribute('style', `width: ${width || '100%'}; height: ${height || '100%'}`);
  }
}
