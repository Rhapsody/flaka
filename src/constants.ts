import { PlayerState, PlayState } from './types';

export const defaultPlayerState: PlayerState = {
  loading: false,
  playState: PlayState.STOPPED,
  volume: 0.5,
};
