import { Player, polyfill } from 'shaka-player';

window.addEventListener = jest.fn();
Player.isBrowserSupported = () => true;
// eslint-disable-next-line @typescript-eslint/no-empty-function
polyfill.installAll = () => {};

import { FlakaPlayer } from '../FlakaPlayer';

const TEST_PLAYER_ID = 'flaka-player-test';
const TEST_MANIFEST_URL = 'https://test.com/manifest.mpd';

Object.defineProperty(navigator, 'MediaCapabilities', {
  writable: true,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  value: jest.fn().mockImplementation(() => {}),
});

test('should create video element in the dom', () => {
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {});
  const videoElement = document.getElementById(TEST_PLAYER_ID);

  expect(videoElement).toBeInstanceOf(HTMLVideoElement);
  expect(videoElement.id).toStrictEqual(TEST_PLAYER_ID);
});

test('should call shaka-player load method with correct parameters', async () => {
  const playerLoadMock = jest.fn();
  const flakaPlayer = new FlakaPlayer(TEST_PLAYER_ID, {});

  flakaPlayer.player.load = playerLoadMock;

  flakaPlayer.play(TEST_MANIFEST_URL);

  expect(playerLoadMock).toBeCalledWith(TEST_MANIFEST_URL);
});
