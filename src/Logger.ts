export class Logger {
  playbackTime: 0;
  playbackTimeStarted: number;

  addPlaybackTime(amount: number): void {
    this.playbackTimeStarted = Date.now();
    this.playbackTime += amount;
  }
}
