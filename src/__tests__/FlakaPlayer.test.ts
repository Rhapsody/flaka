import * as shaka from 'shaka-player';
import { defaultPlayerState } from '../constants';

window.addEventListener = jest.fn();
shaka.Player.isBrowserSupported = () => true;
// eslint-disable-next-line @typescript-eslint/no-empty-function
shaka.polyfill.installAll = () => { };

import { FlakaPlayer } from '../FlakaPlayer';
import { DrmType, PlayState, Track } from '../types';

const TEST_PLAYER_ID = 'flaka-player-test';
const TEST_MANIFEST_URL = 'https://test.com/manifest.mpd';

const TEST_TRACK: Track = {
  id: 'track.123',
  name: 'test track',
  artist: 'test artist',
  url: TEST_MANIFEST_URL,
  albumId: 'string',
  album: 'string',
  artistId: 'string',
};

test('should create video element in the dom', () => {
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {});
  const videoElement = document.getElementById(TEST_PLAYER_ID);

  expect(videoElement).toBeInstanceOf(HTMLVideoElement);
  expect(videoElement.id).toStrictEqual(TEST_PLAYER_ID);
});

test('should instance shaka-player', () => {
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {});

  expect(flakaPlayer.player).toBeInstanceOf(shaka.Player);
});

test('should call validatePlayback before playing the track', () => {
  const validatePlaybackMock = jest.fn(() => Promise.resolve());
  const playerLoadMock = jest.fn();

  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {
    validatePlayback: validatePlaybackMock,
  });

  flakaPlayer.player.load = playerLoadMock;

  flakaPlayer.play(TEST_TRACK, 'serverUrl', DrmType.WIDEVINE);

  expect(validatePlaybackMock).toBeCalled();
});

test('should call validatePlayback and throw error if validatePlayback fails', () => {
  const validatePlaybackMock = jest.fn(() => Promise.reject());
  const playerLoadMock = jest.fn();

  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {
    validatePlayback: validatePlaybackMock,
  });

  flakaPlayer.player.load = playerLoadMock;

  expect(flakaPlayer.play(TEST_TRACK, 'serverUrl', DrmType.WIDEVINE)).rejects.toThrowError();
});

test('should call shaka-player load method with correct parameters on play', async () => {
  const playerLoadMock = jest.fn();
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {});

  flakaPlayer.player.load = playerLoadMock;

  await flakaPlayer.play(TEST_TRACK, 'serverUrl', DrmType.WIDEVINE);

  expect(playerLoadMock).toBeCalledWith(TEST_TRACK.url);
});

test('should trigger state change callback on play', async () => {
  const onStateChangeMock = jest.fn();
  const playerLoadMock = jest.fn();
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {
    onStateChange: onStateChangeMock,
  });

  flakaPlayer.player.load = playerLoadMock;

  await flakaPlayer.play(TEST_TRACK, 'serverUrl', DrmType.WIDEVINE);

  expect(onStateChangeMock).toBeCalledWith({ ...defaultPlayerState, playState: PlayState.PLAYING }, TEST_TRACK);
});

test('should pause track', () => {
  const mock = jest.fn();
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {});
  flakaPlayer.videoElement.pause = mock;

  flakaPlayer.pause();

  expect(mock).toBeCalled();
});

test('should trigger state change callback on pause', async () => {
  const onStateChangeMock = jest.fn();
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {
    onStateChange: onStateChangeMock,
  });

  flakaPlayer.pause();

  expect(onStateChangeMock).toBeCalledWith({ ...defaultPlayerState, playState: PlayState.PAUSED }, undefined);
});

test('should resume track', () => {
  const mock = jest.fn();
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {});
  flakaPlayer.videoElement.play = mock;

  flakaPlayer.resume();

  expect(mock).toBeCalled();
});

test('should trigger state change callback on resume', async () => {
  const onStateChangeMock = jest.fn();
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {
    onStateChange: onStateChangeMock,
  });
  flakaPlayer.resume();

  expect(onStateChangeMock).toBeCalledWith({ ...defaultPlayerState, playState: PlayState.PLAYING }, undefined);
});

test('should seek track', () => {
  const seekTime = 10;
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {});

  flakaPlayer.seek(seekTime);

  expect(flakaPlayer.videoElement.currentTime).toStrictEqual(seekTime);
});

test('should handle volume change', () => {
  const volume = 0.23;
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {});

  flakaPlayer.setVolume(volume);

  expect(flakaPlayer.videoElement.volume).toStrictEqual(volume);
});

test('should trigger state change on volume change', () => {
  const onStateChangeMock = jest.fn();
  const volume = 0.23;
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, { onStateChange: onStateChangeMock });

  flakaPlayer.setVolume(volume);

  expect(onStateChangeMock).toBeCalledWith({ ...defaultPlayerState, volume }, undefined);
});
