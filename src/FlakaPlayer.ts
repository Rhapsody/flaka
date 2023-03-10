import shaka from 'shaka-player';
import { defaultPlayerState } from './constants';
import { createVideoElement } from './helpers';
import { Logger } from './Logger';
import { DrmType, FlakaPlayerOptions, onErrorType, PlayerState, PlayState, Track } from './types';
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
      this.onErrorEvent(event);
      this.options.onError(event);
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
      throw new Error();
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

  onError(error: onErrorType): void {
    // Log the error.
    console.error({ error });
    if (this.options.onError) {
      this.options.onError(error);
    }
  }

  onErrorEvent(eventError: onErrorType): void {
    this.logger.log('error', {
      trackId: this.currentTrack?.id,
      error: eventError,
    });
    this.onError(eventError);
  }

  changeState(newState: PlayerState): void {
    this.state = newState;
    if (this.options.onStateChange) {
      this.options.onStateChange(this.state, this.currentTrack);
    }
  }

  async configureFairPlay(token?: string, tokenHeader: string = 'customdata'): Promise<void> {
    let contentId;

    // DELETE OLD FILTERS
    // this.player.getNetworkingEngine().clearAllRequestFilters();
    // this.player.getNetworkingEngine().clearAllResponseFilters();

    // this.player.configure('drm.initDataTransform', (initData, initDataType, drmInfo) => {
    //   if (initDataType !== 'skd') return initData;
    //   // 'initData' is a buffer containing an 'skd://' URL as a UTF-8 string.
    //   const skdUri = shaka.util.StringUtils.fromBytesAutoDetect(initData);
    //   contentId = skdUri.split('skd://')[1];
    //   return shaka.util.FairPlayUtils.initDataTransform(initData, contentId, drmInfo.serverCertificate);
    // });
    const req = await fetch('https://lic.drmtoday.com/license-server-fairplay/cert/napster');
    const cert = await req.arrayBuffer();
    this.player.configure({
      drm: {
        servers: {
          'com.widevine.alpha': 'https://lic.staging.drmtoday.com/license-proxy-widevine/cenc/?specConform=true',
          'com.microsoft.playready': 'https://lic.staging.drmtoday.com/license-proxy-headerauth/drmtoday/RightsManager.asmx',
          'com.apple.fps': 'https://lic.staging.drmtoday.com/license-server-fairplay/',
        },
        advanced: {
          'com.apple.fps': {
            serverCertificate: new Uint8Array(cert)
          }
        }
      }
    });

    this.player.getNetworkingEngine().registerRequestFilter((type, request) => {
      if (type !== shaka.net.NetworkingEngine.RequestType.LICENSE) {
        return;
      }
      // const originalPayload = new Uint8Array(request.body as ArrayBufferLike);
      // const data = `spc=${shaka.util.Uint8ArrayUtils.toStandardBase64(originalPayload)}&assetId=${contentId}`;
      // request.headers['Content-Type'] = 'text/plain';
      request.headers[tokenHeader] = token;

    });

    this.player.getNetworkingEngine().registerResponseFilter((type, response) => {
      // https://fe.drmtoday.com/documentation/integration/player/shaka.html
      if (type == shaka.net.NetworkingEngine.RequestType.LICENSE) {
        if (this.player.keySystem() === "com.apple.fps") {
          let responseText = shaka.util.StringUtils.fromUTF8(response.data);
          response.data = shaka.util.Uint8ArrayUtils.fromBase64(responseText).buffer;
        }
      }
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
    customHeaderName?: string,
  ): Promise<void> {
    this.player.resetConfiguration();
    // Try to load a manifest.
    // This is an asynchronous process.
    const retryParameters = {
      retryParameters: {
        timeout: 30000,
        stallTimeout: 30000,
        connectionTimeout: 30000,
        maxAttempts: 5,
        baseDelay: 1000,
        backoffFactor: 2,
        fuzzFactor: 0.5,
      },
    };
    try {
      if (drmType === DrmType.FAIRPLAY && certificateUrl) {
        this.player.configure({
          manifest: retryParameters,
          drm: {
            ...retryParameters,
            advanced: {
              'com.apple.fps.1_0': {
                serverCertificateUri: certificateUrl,
              },
            },
          },
        });
        await this.configureFairPlay(token, customHeaderName ? customHeaderName : 'customdata');
      }


      if (serverUrl && drmType) {
        const servers = this.getServers(drmType, serverUrl);
        this.player.configure({
          manifest: retryParameters,
          drm: {
            ...retryParameters,
            servers,
          },
        });
      }

      let tokenHeader = 'customdata'
      if (customHeaderName)
        tokenHeader = customHeaderName
      if (token && drmType !== DrmType.FAIRPLAY) {
        this.player.getNetworkingEngine().registerRequestFilter(function (type, request) {
          if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
            request.headers[tokenHeader] = token;
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

      // manifestTimeSeconds on safari is returning Nan atm, but we are not using this data in web player,
      // so removed it from condition
      if (this.options.reportManifestLoadedTime) {
        this.options.reportManifestLoadedTime(track, stats.manifestTimeSeconds);
      }
      if (/Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)) {
        // This is causing errors
        //this.videoElement.play();
      }

      this.videoElement.play();

      this.changeState({ ...this.state, playState: PlayState.PLAYING });
    } catch (e) {
      // onError is executed if the asynchronous load fails.

      this.onError(e);
    }
  }

  pause(): void {
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
