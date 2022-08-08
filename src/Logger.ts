import { onErrorType } from './types';

type LogEventName = 'manifestLoadTime' | 'playbackTime' | 'error';

type LogEventData = { error?: onErrorType; trackId: string; time?: number };

export class Logger {
  log = (eventName: LogEventName, eventData: LogEventData): void => {
    console.log('Reporting event: ', eventName);
    console.log('Event data: ', eventData);
  };
}
