export const createVideoElement = (id: string): HTMLVideoElement => {
  const videoElement = document.createElement('video');
  videoElement.id = id;
  videoElement.autoplay = true;

  return videoElement;
};

export const appendVideoToBody = (videoElement: HTMLVideoElement): HTMLVideoElement => {
  document.body.appendChild(videoElement);
  return videoElement;
};

export const setAbsolutePosition = (videoElement: HTMLVideoElement): HTMLVideoElement => {
  videoElement.setAttribute('style', 'position: absolute;');
  return videoElement;
};

export const setDimensionsForAudioStream = (videoElement: HTMLVideoElement): HTMLVideoElement => {
  videoElement.height = 0;
  videoElement.width = 0;
  return videoElement;
};
