import { Player, polyfill, net, util, extern, log } from 'shaka-player';
import { createVideoElement } from './helpers';
import { Logger } from './Logger';
import { FlakaPlayerOptions, PlayerState } from './types';

log.setLevel(log.Level.DEBUG);

export class FlakaPlayer {
  options: FlakaPlayerOptions;
  state: PlayerState = PlayerState.STOPPED;
  player?: Player;
  videoElement: HTMLVideoElement;
  logger: Logger;

  constructor(id: string, options: FlakaPlayerOptions) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    this.options = options;
    this.logger = new Logger();
    this.videoElement = document.getElementById(id) as HTMLVideoElement;

    if (!this.videoElement) {
      this.videoElement = createVideoElement(id);
    }

    this.videoElement.addEventListener('timeupdate', (event: Event & { target: HTMLVideoElement }) => {
      options.onTimeUpdate(event.target.currentTime);
      this.logger.addPlaybackTime(1);
      options.onLoggerChange(this.logger.playbackTime);
    });

    this.videoElement.addEventListener('durationchange', (event: Event & { target: HTMLVideoElement }) => {
      options.onDurationUpdate(event.target.duration);
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
    this.player = new Player(this.videoElement);

    // Listen for error events.
    this.player.addEventListener('error', this.onErrorEvent);
  }

  onError(error: util.Error): void {
    // Log the error.
    console.error('Error code', error.code, 'object', error);
  }

  onErrorEvent(event: Player.ErrorEvent): void {
    this.onError(event.detail);
  }

  changeState(newState: PlayerState): void {
    this.state = newState;
    if (this.options.onStateChange) {
      this.options.onStateChange(this.state);
    }
  }

  async play(url: string, servers?: extern.DrmConfiguration['servers'], token?: string): Promise<void> {
    this.player.resetConfiguration();

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

    // Try to load a manifest.
    // This is an asynchronous process.
    try {
      // validate playback
      if (this.options.validatePlayback) {
        await this.options.validatePlayback();
      }

      await this.player.load(url);

      this.changeState(PlayerState.PLAYING);
    } catch (e) {
      // onError is executed if the asynchronous load fails.
      this.onError(e);
    }
  }

  pause(): void {
    this.videoElement.pause();
    this.changeState(PlayerState.PAUSED);
  }

  resume(): void {
    this.videoElement.play();
    this.changeState(PlayerState.PLAYING);
  }

  seek(time: number): void {
    this.videoElement.currentTime = time;
  }
}
