import getVideoId from 'get-video-id';
export function providerVideo(input) {
  const url = new URL(input);
  const host = url.hostname.toLowerCase();
  const parsed = getVideoId(url.href);
  if (
    [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'youtu.be',
      'www.youtube-nocookie.com',
    ].includes(host) &&
    parsed.service === 'youtube' &&
    /^[\w-]{11}$/.test(parsed.id ?? '')
  )
    return { provider: 'youtube', id: parsed.id };
  if (
    ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host) &&
    parsed.service === 'vimeo' &&
    /^\d{1,12}$/.test(parsed.id ?? '')
  ) {
    const hash =
      url.searchParams.get('h') ||
      url.pathname.split('/').find((part) => /^[a-f\d]{10}$/i.test(part) && part !== parsed.id);
    return { provider: 'vimeo', id: parsed.id, ...(hash ? { hash } : {}) };
  }
  return null;
}
