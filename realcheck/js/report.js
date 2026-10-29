// Draws the result: score ring, signal bars, timeline chart and flagged frames.
const $ = id => document.getElementById(id);
const level = s => s < 35 ? ['Looks natural', 'var(--green)']
  : s < 60 ? ['Some signs worth a closer look', 'var(--amber)']
  : ['Several signs of manipulation', 'var(--red)'];

export function render(res, rows, name) {
  $('result').hidden = false;
  $('notEnough').hidden = res.enough;
  $('full').hidden = !res.enough;
  if (!res.enough) {
    $('notEnough').textContent = `A face was found in only ${Math.round(res.coverage * 100)}% of the frames, which is not enough to judge. Try a clip where one face is clearly visible.`;
    return;
  }
  const [text, css] = level(res.total);
  $('num').textContent = res.total;
  $('ring').style.setProperty('--p', res.total);
  $('ring').style.setProperty('--c', css);
  $('verdict').textContent = text;

  $('signals').innerHTML = res.signals.map(s => `
    <div class="sig" style="--c:${level(s.risk)[1]}">
      <p><strong>${s.name}</strong>: ${s.risk}/100</p>
      <div class="bar"><i style="width:${s.risk}%"></i></div>
      <p class="muted">${s.note}</p>
    </div>`).join('');

  drawTimeline(res.frameRisk);

  const top = res.frameRisk.map((r, i) => ({ r, i })).sort((a, b) => b.r - a.r).slice(0, 4);
  $('flagged').innerHTML = top.map(({ r, i }) => `
    <figure><img src="${rows[i].thumb}" alt="Frame at ${rows[i].t.toFixed(1)} seconds">
    <figcaption>${rows[i].t.toFixed(1)}s, risk ${Math.round(r)}</figcaption></figure>`).join('');

  $('copy').onclick = async () => {
    const msg = `RealCheck: "${name}" scored ${res.total}/100 on the suspicion scale. ${text}. This is a screening result, not proof.`;
    try { await navigator.clipboard.writeText(msg); $('copy').textContent = 'Copied'; }
    catch { $('copy').textContent = 'Copy failed'; }
  };
  $('result').scrollIntoView({ behavior: 'smooth' });
}

function drawTimeline(data) {
  const c = $('timeline'), dpr = devicePixelRatio || 1;
  c.width = c.clientWidth * dpr; c.height = 120 * dpr;
  const x = c.getContext('2d'), w = c.width / data.length;
  x.clearRect(0, 0, c.width, c.height);
  data.forEach((v, i) => {
    x.fillStyle = v < 35 ? '#2f7d5b' : v < 60 ? '#b7791f' : '#c8372d';
    const h = Math.max(2, v / 100 * c.height);
    x.fillRect(i * w, c.height - h, Math.max(1, w - 1), h);
  });
}
