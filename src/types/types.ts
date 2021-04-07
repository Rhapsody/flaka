// import './ima';
// import './shaka';

export interface StreamingPlayerOptions {
  onTimeUpdate: (duration: number) => void;
  onDurationUpdate: (duration: number) => void;
}