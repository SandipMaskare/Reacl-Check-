# RealCheck: video authenticity analyzer

A frontend-only web app (HTML, CSS, JavaScript) that screens a video for signs of face manipulation. Everything runs in the browser, so videos are never uploaded.

## How it works
1. **Frame extraction** (`js/frames.js`): samples the video 5 times per second onto a canvas.
2. **Face analysis** (`js/analyze.js`): MediaPipe Face Landmarker finds 478 face points per frame.
3. **Three signals**:
   - Blink rate, from eye-blink blendshapes
   - Face motion jumps, from the second difference of key landmarks
   - Face sharpness compared with the whole frame (Laplacian variance)
4. **Report** (`js/report.js`): suspicion score, timeline chart and the most suspicious frames.

## Run locally
ES modules need a web server, so do not open `index.html` by double-clicking.
- VS Code: install **Live Server**, right-click `index.html`, then **Open with Live Server**
- Or: `npx serve .`

## Publish on GitHub Pages
```bash
git init
git add .
git commit -m "Initial commit: RealCheck"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/realcheck.git
git push -u origin main
```
Then open **Settings → Pages**, choose branch `main` and folder `/ (root)`.

## Limitations (say this in your presentation)
- This is a **heuristic screening tool**. It cannot prove a video is real or fake.
- Thresholds are hand-tuned and should be tested on more videos.
- Needs a visible, mostly front-facing face. Heavy compression and low light reduce accuracy.

## Ideas for next steps
- Compare results on real and deepfake sample clips and report accuracy
- Add audio and lip-sync checks
- Connect a trained detection model through a backend API
