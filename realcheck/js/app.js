import { loadVideo, frames } from './frames.js';
import { initModel, measure, score } from './analyze.js';
import { render } from './report.js';

const $ = id => document.getElementById(id);
const drop = $('drop'), input = $('file');

['dragenter', 'dragover'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => run(e.dataTransfer.files[0]));
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
input.addEventListener('change', () => run(input.files[0]));

function setStatus(text, p, err) {
  $('status').textContent = text;
  $('status').className = err ? 'err' : '';
  $('barFill').style.width = Math.round(p * 100) + '%';
}

async function run(file) {
  if (!file) return;
  $('progress').hidden = false;
  $('result').hidden = true;
  if (!file.type.startsWith('video/')) return setStatus('That file is not a video. Choose an MP4 or WebM file.', 0, true);
  try {
    setStatus('Loading face model…', 0);
    const model = await initModel();
    const video = await loadVideo(file);
    $('preview').src = video.src;
    $('preview').hidden = false;
    const rows = [];
    for await (const fr of frames(video)) {
      rows.push(measure(model, fr));
      setStatus(`Analyzing frame ${fr.i + 1} of ${fr.n}…`, (fr.i + 1) / fr.n);
    }
    render(score(rows), rows, file.name);
    setStatus('Done.', 1);
  } catch (err) {
    setStatus('Could not analyze this video: ' + err.message, 0, true);
  }
}
