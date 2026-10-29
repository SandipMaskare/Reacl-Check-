// Loads a video file and yields one canvas frame every `step` seconds.
export function loadVideo(file) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = URL.createObjectURL(file);
    v.onloadeddata = () => resolve(v);
    v.onerror = () => reject(new Error('This browser cannot read that video format.'));
  });
}

function seek(v, t) {
  return new Promise(res => { v.onseeked = () => res(); v.currentTime = t; });
}

export async function* frames(v, step = 0.2, max = 150) {
  if (!isFinite(v.duration)) throw new Error('The video length could not be read.');
  const c = document.createElement('canvas');
  c.width = Math.min(640, v.videoWidth);
  c.height = Math.round(v.videoHeight * c.width / v.videoWidth);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const n = Math.min(max, Math.floor(v.duration / step));
  for (let i = 0; i < n; i++) {
    await seek(v, i * step + 0.01);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    yield { i, n, t: i * step, canvas: c, ctx };
  }
}
