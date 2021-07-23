export const createVideoElement = (id: string): HTMLVideoElement => {
  const videoElement = document.createElement('video');
  videoElement.id = id;
  videoElement.autoplay = true;
  videoElement.height = 0;
  videoElement.width = 0;
  videoElement.setAttribute('style', 'position: absolute;');

  const container: Element | undefined = document.getElementById('video-player-root');

  container?.appendChild(videoElement) || document.body.appendChild(videoElement);

  return videoElement;
};
