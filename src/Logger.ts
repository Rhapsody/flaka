type LogEventName = 'manifestLoadTime' | 'playbackTime' | 'error';

type LogEventData = {
  time?: number;
  description?: string;
  trackId?: string;
};

export class Logger {
  log = (eventName: LogEventName, eventData: LogEventData) => {
    console.log('Reporting event: ', eventName);
    console.log('Event data: ', eventData);
  };
}
