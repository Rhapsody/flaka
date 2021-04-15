export const createVideoElement = (id: string): HTMLVideoElement => {
  const videoElement = document.createElement('video');
  videoElement.id = id;
  videoElement.autoplay = true;

  document.body.appendChild(videoElement);

  return videoElement;
};
