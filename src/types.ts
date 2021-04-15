export interface FlakaPlayerOptions {
  validatePlayback?: () => Promise<void>;
  onTimeUpdate?: (duration) => void;
  onDurationUpdate?: (duration) => void;
}
