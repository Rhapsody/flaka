export const createVideoElement = (id: string): HTMLVideoElement => {
  const videoElement = document.createElement('video');
  videoElement.id = id;
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  videoElement.height = 0;
  videoElement.width = 0;
  videoElement.setAttribute('style', 'position: absolute;');

  document.body.appendChild(videoElement);

  return videoElement;
};
