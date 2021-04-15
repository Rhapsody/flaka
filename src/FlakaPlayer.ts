import { Player, polyfill, net, util, extern } from 'shaka-player';
import { createVideoElement } from './helpers';
import { FlakaPlayerOptions } from './types';

export class FlakaPlayer {
  options: FlakaPlayerOptions;
  player?: Player;
  videoElement: HTMLVideoElement;
  constructor(id: string, options: FlakaPlayerOptions) {
    this.options = options;
    this.videoElement = document.getElementById(id) as HTMLVideoElement;

    if (!this.videoElement) {
      this.videoElement = createVideoElement(id);
    }

    this.videoElement.addEventListener('timeupdate', (event: Event & { target: HTMLVideoElement }) => {
      options.onTimeUpdate(event.target.currentTime);
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
    } catch (e) {
      // onError is executed if the asynchronous load fails.
      this.onError(e);
    }
  }

  pause(): void {
    this.videoElement.pause();
  }

  resume(): void {
    this.videoElement.play();
  }

  seek(time: number): void {
    this.videoElement.currentTime = time;
  }
}
