import { Player, polyfill, net, util, extern } from 'shaka-player';
import { defaultPlayerState } from './constants';
import { createVideoElement } from './helpers';
import { Logger } from './Logger';
import { DrmType, FlakaPlayerOptions, PlayerState, PlayState, Track } from './types';

export class FlakaPlayer {
  id: string;
  options: FlakaPlayerOptions;
  state = defaultPlayerState;
  player?: Player;
  currentTrack?: Track;
  videoElement: HTMLVideoElement;
  logger: Logger;
  fairPlaySetup: boolean;

  constructor(id: string, options: FlakaPlayerOptions) {
    this.id = id;
    this.options = options;
    this.logger = new Logger();
    this.videoElement = document.getElementById(id) as HTMLVideoElement;
    this.fairPlaySetup = false;

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

  getFairPlayContentId(skdUri: string): string {
    return skdUri.split('skd://')[1];
  }

  async configureFairPlay(certificateUrl: string, token?: string): Promise<void> {
    let contentId;

    this.player.configure('drm.initDataTransform', (initData, initDataType) => {
      if (initDataType !== 'skd') return initData;
      // 'initData' is a buffer containing an 'skd://' URL as a UTF-8 string.
      const skdUri = util.StringUtils.fromBytesAutoDetect(initData);
      contentId = this.getFairPlayContentId(skdUri);
      const cert = this.player.drmInfo().serverCertificate;
      return util.FairPlayUtils.initDataTransform(initData, contentId, cert);
    });

    this.player.getNetworkingEngine().registerRequestFilter((type, request) => {
      if (type !== net.NetworkingEngine.RequestType.LICENSE) {
        return;
      }

      const base64EncodeUint8Array = function (a) {
        let c = '';
        for (
          let d, e, f, g, h, i, j, b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=', k = 0;
          k < a.length;

        ) {
          (d = a[k++]),
            (e = k < a.length ? a[k++] : Number.NaN),
            (f = k < a.length ? a[k++] : Number.NaN),
            (g = d >> 2),
            (h = ((3 & d) << 4) | (e >> 4)),
            (i = ((15 & e) << 2) | (f >> 6)),
            (j = 63 & f),
            isNaN(e) ? (i = j = 64) : isNaN(f) && (j = 64),
            (c += b.charAt(g) + b.charAt(h) + b.charAt(i) + b.charAt(j));
        }
        return c;
      };

      const originalPayload = new Uint8Array(request.body as ArrayBufferLike);
      const data = `spc=${base64EncodeUint8Array(originalPayload)}&assetId=${contentId}`;

      request.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
      request.headers['customdata'] = token;
      request.body = util.StringUtils.toUTF8(data);
    });

    this.player.getNetworkingEngine().registerResponseFilter((type, response) => {
      if (type != net.NetworkingEngine.RequestType.LICENSE) {
        return;
      }
      let responseText = util.StringUtils.fromUTF8(response.data);
      responseText = responseText.trim();
      response.data = util.Uint8ArrayUtils.fromBase64(responseText).buffer;
    });
  }

  getServers(drmType: DrmType, serverUrl: string): extern.DrmConfiguration['servers'] {
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
    // Try to load a manifest.
    // This is an asynchronous process.
    try {
      if (drmType === DrmType.FAIRPLAY && certificateUrl && !this.fairPlaySetup) {
        this.fairPlaySetup = true;
        const req = await fetch(certificateUrl);
        const cert = await req.arrayBuffer();
        this.player.configure({
          drm: {
            advanced: {
              'com.apple.fps.1_0': {
                serverCertificate: new Uint8Array(cert),
              },
            },
          },
        });
        await this.configureFairPlay(certificateUrl, token);
      }

      if (serverUrl && drmType) {
        const servers = this.getServers(drmType, serverUrl);
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

      if (drmType === DrmType.FAIRPLAY) {
        this.videoElement.play();
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
}
