import shaka from 'shaka-player';
import { defaultPlayerState } from './constants';
import { createVideoElement } from './helpers';
import { Logger } from './Logger';
import { DrmType, FlakaPlayerOptions, PlayerState, PlayState, Track } from './types';
import muxjs from 'mux.js';

window.muxjs = muxjs;

export class FlakaPlayer {
  id: string;
  options: FlakaPlayerOptions;
  state = defaultPlayerState;
  player?: shaka.Player;
  currentTrack?: Track;
  videoElement: HTMLVideoElement;
  logger: Logger;

  constructor(id: string, options: FlakaPlayerOptions) {
    this.id = id;
    this.options = options;
    this.logger = new Logger();
    this.videoElement = document.getElementById(id) as HTMLVideoElement;

    if (!this.videoElement) {
      this.videoElement = createVideoElement(id);
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
    if (shaka.Player.isBrowserSupported()) {
      shaka.polyfill.installAll();
      this.initPlayer();
    } else {
      throw new Error('Browser is not supported');
    }
  }

  initPlayer(): void {
    const player = new shaka.Player(this.videoElement);

    // Listen for error events.
    player.addEventListener('error', (event) => {
      this.onErrorEvent(event);
    });
    player.addEventListener('buffering', (event: Event & { buffering: boolean }) => {
      this.changeState({ ...this.state, loading: event.buffering });
    });
    // player.addEventListener('loading', (event: Event) => {
    //   debugger;
    //   this.changeState({ ...this.state, loading: true });
    // });
    player.addEventListener('loaded', () => {
      this.changeState({ ...this.state, loading: false });
    });

    this.player = player;
  }

  onError(error: shaka.util.Error): void {
    // Log the error.
    console.error('Error code', error.code, 'object', error);
    if (this.options.onError) {
      this.options.onError(error.message);
    }
  }

  onErrorEvent(event: any): void {
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

  async configureFairPlay(token?: string): Promise<void> {
    let contentId;

    // DELETE OLD FILTERS
    this.player.getNetworkingEngine().clearAllRequestFilters();
    this.player.getNetworkingEngine().clearAllResponseFilters();

    this.player.configure('drm.initDataTransform', (initData, initDataType, drmInfo) => {
      if (initDataType !== 'skd') return initData;
      // 'initData' is a buffer containing an 'skd://' URL as a UTF-8 string.
      const skdUri = shaka.util.StringUtils.fromBytesAutoDetect(initData);
      contentId = skdUri.split('skd://')[1];
      return shaka.util.FairPlayUtils.initDataTransform(initData, contentId, drmInfo.serverCertificate);
    });

    this.player.getNetworkingEngine().registerRequestFilter((type, request) => {
      if (type !== shaka.net.NetworkingEngine.RequestType.LICENSE) {
        return;
      }
      const originalPayload = new Uint8Array(request.body as ArrayBufferLike);
      const data = `spc=${shaka.util.Uint8ArrayUtils.toStandardBase64(originalPayload)}&assetId=${contentId}`;
      request.headers['Content-Type'] = 'text/plain';
      request.headers['customdata'] = token;
      //request.body = shaka.util.StringUtils.toUTF8(encodeURIComponent(data));
      request.body = shaka.util.StringUtils.toUTF8(data);
    });

    this.player.getNetworkingEngine().registerResponseFilter((type, response) => {
      if (type != shaka.net.NetworkingEngine.RequestType.LICENSE) {
        return;
      }
      let responseText = shaka.util.StringUtils.fromUTF8(response.data);
      responseText = responseText.trim();
      if (responseText.substr(0, 5) === '<ckc>' && responseText.substr(-6) === '</ckc>') {
        responseText = responseText.slice(5, -6);
      }
      response.data = shaka.util.Uint8ArrayUtils.fromBase64(responseText).buffer;
    });
  }

  getServers(drmType: DrmType, serverUrl: string): shaka.extern.DrmConfiguration['servers'] {
    if (drmType === DrmType.FAIRPLAY) {
      return { 'com.apple.fps.1_0': serverUrl };
    }

    if (drmType === DrmType.PLAYREADY) {
      return { 'com.microsoft.playready': serverUrl };
    }

    return { 'com.widevine.alpha': serverUrl };
  }

  async play(
    track: Track,
    serverUrl?: string,
    drmType?: DrmType,
    token?: string,
    certificateUrl?: string,
  ): Promise<void> {
    this.player.resetConfiguration();
    // Try to load a manifest.
    // This is an asynchronous process.
    try {
      if (drmType === DrmType.FAIRPLAY && certificateUrl) {
        this.player.configure({
          drm: {
            advanced: {
              'com.apple.fps.1_0': {
                serverCertificateUri: certificateUrl,
              },
            },
          },
        });
        await this.configureFairPlay(token);
      }

      if (serverUrl && drmType) {
        const servers = this.getServers(drmType, serverUrl);
        this.player.configure({
          drm: {
            servers,
          },
        });
      }

      if (token && drmType !== DrmType.FAIRPLAY) {
        this.player.getNetworkingEngine().registerRequestFilter(function (type, request) {
          if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
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
      if (/Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)) {
        this.videoElement.play();
      }

      this.videoElement.play();

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
}
