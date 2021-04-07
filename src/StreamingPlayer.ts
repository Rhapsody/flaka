import './types/shaka';
import './types/ima';
import {Player, polyfill, net} from "shaka-player";
import {StreamingPlayerOptions} from './types/types';

export class StreamingPlayer {
  player?: Player;
  videoElement?: HTMLVideoElement;
  constructor(id: string, options: StreamingPlayerOptions) {
    polyfill.installAll();

    this.videoElement = document.getElementById(id) as HTMLVideoElement;
    
    if (!this.videoElement) {
      const videoElement = document.createElement('video');
      videoElement.id = id;
      videoElement.autoplay = true;
      
      document.body.appendChild(videoElement);

      this.videoElement = videoElement;
    }

    this.videoElement.addEventListener('timeupdate', (event: Event & { target: HTMLVideoElement }) => {
      options.onTimeUpdate(event.target.currentTime);
    });

    this.videoElement.addEventListener('durationchange', (event: Event & { target: HTMLVideoElement }) => {
      options.onDurationUpdate(event.target.duration);
    });

    // Check to see if the browser supports the basic APIs Shaka needs.
    if (Player.isBrowserSupported()) {
      // Everything looks good!
      this.initPlayer();
    } else {
      throw new Error('Browser is not supported');
    }
  }

  initPlayer() {
    this.player = new Player(this.videoElement);

    // Listen for error events.
    this.player.addEventListener('error', this.onErrorEvent);
  }

  onError(error) {
    // Log the error.
    console.error('Error code', error.code, 'object', error);
  }

  onErrorEvent(event) {
    this.onError(event.detail);
  }

  async play(url: string, serverUrl: string, token: string) {
    this.player.resetConfiguration();

    this.player.configure({
      drm: {
        servers: { "com.widevine.alpha": serverUrl },
        // 'com.microsoft.playready': stream.tokenServerUrl
      },
    });

    this.player.getNetworkingEngine().registerRequestFilter(function(type, request) {
      // Only add headers to license requests:
      if (type === net.NetworkingEngine.RequestType.LICENSE) {
        // This is the specific header name and value the server wants:
        request.headers['customdata'] = token;
      }
    });

    console.log('PLAYING SONG: ', url)

    // Try to load a manifest.
    // This is an asynchronous process.
    try {
      await this.player.load(url);
      // This runs if the asynchronous load is successful.
      console.log('The video has now been loaded!');
    } catch (e) {
      // onError is executed if the asynchronous load fails.
      this.onError(e);
    }
  }

  pause() {
    this.videoElement.pause();
  }

  resume() {
    this.videoElement.play();
  }
  
  seek(time: number) {
    this.videoElement.currentTime = time;
  }
}