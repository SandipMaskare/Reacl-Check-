// Face analysis with MediaPipe Face Landmarker (runs fully in the browser).
import { FaceLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

let model;
export async function initModel() {
  if (model) return model;
  const files = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
  model = await FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task' },
    runningMode: 'IMAGE', numFaces: 1, outputFaceBlendshapes: true
  });
  return model;
}

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);

function thumb(c) {
  const s = document.createElement('canvas');
  s.width = 120; s.height = Math.round(c.height * 120 / c.width);
  s.getContext('2d').drawImage(c, 0, 0, s.width, s.height);
  return s.toDataURL('image/jpeg', .6);
}

// Variance of the Laplacian: higher means a sharper region.
function sharp(ctx, x, y, w, h) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  if (w < 8 || h < 8) return 0;
  const d = ctx.getImageData(x, y, w, h).data, g = new Float32Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2];
  let s = 0, s2 = 0, n = 0;
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const k = j * w + i, l = 4 * g[k] - g[k - 1] - g[k + 1] - g[k - w] - g[k + w];
    s += l; s2 += l * l; n++;
  }
  return s2 / n - (s / n) ** 2;
}

export function measure(lm, { canvas, ctx, t }) {
  const r = lm.detect(canvas), pts = r.faceLandmarks[0];
  const row = { t, found: !!pts, thumb: thumb(canvas) };
  if (!pts) return row;
  const W = canvas.width, H = canvas.height;
  const P = i => [pts[i].x * W, pts[i].y * H];
  const xs = pts.map(p => p.x * W), ys = pts.map(p => p.y * H);
  const x0 = Math.max(0, Math.min(...xs)), y0 = Math.max(0, Math.min(...ys));
  const x1 = Math.min(W, Math.max(...xs)), y1 = Math.min(H, Math.max(...ys));
  row.pts = [1, 152, 33, 263, 61, 291].map(P);
  row.eye = Math.hypot(row.pts[2][0] - row.pts[3][0], row.pts[2][1] - row.pts[3][1]) || 1;
  const b = r.faceBlendshapes?.[0]?.categories || [];
  const g = n => b.find(c => c.categoryName === n)?.score || 0;
  row.blink = (g('eyeBlinkLeft') + g('eyeBlinkRight')) / 2;
  row.face = sharp(ctx, x0, y0, x1 - x0, y1 - y0);
  row.all = sharp(ctx, 0, 0, W, H);
  return row;
}

// Turns raw per-frame measurements into three risk signals and a total score.
export function score(rows) {
  const ok = rows.filter(r => r.found), coverage = ok.length / rows.length;
  if (rows.length < 10 || coverage < .5) return { enough: false, coverage };

  const dt = rows[1].t - rows[0].t;
  let blinks = 0, was = false;
  rows.forEach(r => { const on = r.found && r.blink > .5; if (on && !was) blinks++; was = on; });
  const rate = blinks / (rows.length * dt / 60);
  const blinkRisk = rate < 4 ? 85 : rate < 8 ? 45 : rate > 35 ? 50 : 10;

  const jerk = rows.map(() => 0);
  for (let i = 2; i < rows.length; i++) {
    const a = rows[i - 2], b = rows[i - 1], c = rows[i];
    if (a.found && b.found && c.found) {
      let s = 0;
      c.pts.forEach((p, k) => { s += Math.hypot(p[0] - 2 * b.pts[k][0] + a.pts[k][0], p[1] - 2 * b.pts[k][1] + a.pts[k][1]); });
      jerk[i] = s / c.pts.length / c.eye;
    }
  }
  const jm = mean(jerk.filter((_, i) => rows[i].found));
  const jitterRisk = clamp((jm - .02) / .06 * 100);

  const ratios = ok.map(r => r.face / (r.all || 1)), rm = mean(ratios);
  const sd = Math.sqrt(mean(ratios.map(v => (v - rm) ** 2)));
  const sharpRisk = clamp(sd / (rm || 1) * 150);

  const frameRisk = rows.map((r, i) => r.found
    ? clamp(50 * jerk[i] / .08 + 50 * Math.abs(r.face / (r.all || 1) - rm) / (rm || 1) / .5) : 0);

  return {
    enough: true, coverage, frameRisk,
    total: Math.round(.3 * blinkRisk + .35 * jitterRisk + .35 * sharpRisk),
    signals: [
      { name: 'Blinking', risk: blinkRisk, note: `${rate.toFixed(0)} blinks per minute. People usually blink 8 to 30 times per minute.` },
      { name: 'Face motion', risk: Math.round(jitterRisk), note: 'Sudden jumps in face position between frames can point to a pasted-on face.' },
      { name: 'Face sharpness', risk: Math.round(sharpRisk), note: 'A face that keeps changing in sharpness compared with the rest of the frame can be a blending artifact.' }
    ]
  };
}
