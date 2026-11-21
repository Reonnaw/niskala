import type { DrawingUtils, FaceLandmarker, FaceLandmarkerResult, LandmarkData, NormalizedLandmark, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { profileAngles, type FaceSample, type ProfileSample, type SetupSample } from './signals';
import type { CameraView } from './store';

// Everything is served from this origin (see the postinstall script), so no frame,
// landmark or even model request ever leaves for a third party.
const WASM_BASE = '/mediapipe';
const FACE_MODEL = '/models/face_landmarker.task';
const POSE_MODEL = '/models/pose_landmarker_lite.task';

const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const NOSE_TIP = 1;
// BlazePose indices: nose, then left/right ear, shoulder and hip.
const POSE = { nose: 0, ear: [7, 8], shoulder: [11, 12], hip: [23, 24] } as const;
const MIN_VISIBILITY = 0.5;
// Overlay colours: kunyit for the points the angles come from, white for the rest, red for a point out of view.
const MEASURED = '#e9b04a';
const TRACE = 'rgba(255, 255, 255, 0.85)';
const HIDDEN = '#e5534b';

export type { CameraView };
export type Sample = ({ view: 'front'; setup: SetupSample } & FaceSample) | ({ view: 'side' } & ProfileSample);

async function fileset() {
  const { FilesetResolver } = await import('@mediapipe/tasks-vision');
  return FilesetResolver.forVisionTasks(WASM_BASE);
}

// GPU is much faster but not available everywhere; fall back to CPU rather than fail.
async function withDelegate<T>(create: (delegate: 'GPU' | 'CPU') => Promise<T>) {
  try {
    return await create('GPU');
  } catch {
    return create('CPU');
  }
}

async function createFace(): Promise<FaceLandmarker> {
  const [{ FaceLandmarker }, files] = await Promise.all([import('@mediapipe/tasks-vision'), fileset()]);
  return withDelegate((delegate) =>
    FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    }),
  );
}

async function createPose(): Promise<PoseLandmarker> {
  const [{ PoseLandmarker }, files] = await Promise.all([import('@mediapipe/tasks-vision'), fileset()]);
  return withDelegate((delegate) =>
    PoseLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: POSE_MODEL, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    }),
  );
}

// Iris contour points from the 478-point face model: the left and right edge of each iris.
const IRIS_EDGES = [
  [469, 471],
  [474, 476],
] as const;

function faceSample(r: FaceLandmarkerResult, w: number, h: number, light: { face: number; room: number }): Sample | null {
  const p = r.faceLandmarks[0];
  const m = r.facialTransformationMatrixes[0]?.data;
  const shapes = r.faceBlendshapes[0]?.categories;
  if (!p || !m || !shapes) return null;
  const l = p[LEFT_EYE_OUTER];
  const rt = p[RIGHT_EYE_OUTER];
  const score = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
  // Ordered by position in the frame, so the eye line stays near 0° whichever eye each index names.
  const [a, b] = l.x < rt.x ? [l, rt] : [rt, l];
  const iris = p.length > 476 ? IRIS_EDGES.reduce((s, [i, j]) => s + Math.hypot((p[i].x - p[j].x) * w, (p[i].y - p[j].y) * h), 0) / 2 : 0;
  return {
    view: 'front',
    setup: { w, h, iris, eyeY: ((l.y + rt.y) / 2) * h, ...light },
    pitch: (Math.atan2(m[6], m[10]) * 180) / Math.PI,
    roll: (Math.atan2((b.y - a.y) * h, (b.x - a.x) * w) * 180) / Math.PI,
    iod: Math.hypot((l.x - rt.x) * w, (l.y - rt.y) * h),
    cx: ((l.x + rt.x) / 2) * w,
    noseY: p[NOSE_TIP].y * h,
    blink: (score('eyeBlinkLeft') + score('eyeBlinkRight')) / 2,
  };
}

// The body side nearer the camera has the most visible ear and shoulder.
const sideVis = (p: NormalizedLandmark[], i: 0 | 1) => Math.min(p[POSE.ear[i]].visibility, p[POSE.shoulder[i]].visibility);
const nearSide = (p: NormalizedLandmark[]) => (sideVis(p, 0) >= sideVis(p, 1) ? 0 : 1);

function poseSample(r: PoseLandmarkerResult, w: number, h: number): Sample | null {
  const p = r.landmarks[0];
  if (!p) return null;
  const i = nearSide(p);
  if (sideVis(p, i) < MIN_VISIBILITY) return null;
  const px = (k: number) => ({ x: p[k].x * w, y: p[k].y * h });
  // A desk often hides the hip from the side; the neck is still worth reading without it.
  const hip = p[POSE.hip[i]].visibility >= MIN_VISIBILITY ? px(POSE.hip[i]) : null;
  return { view: 'side', ...profileAngles(px(POSE.ear[i]), px(POSE.shoulder[i]), hip, px(POSE.nose)) };
}

/** Mean brightness inside the face's box and outside it, 0..1, from a 32x24 copy of the frame. */
function brightness(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, p: NormalizedLandmark[]) {
  const [W, H] = [ctx.canvas.width, ctx.canvas.height];
  ctx.drawImage(video, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;
  const xs = p.map((q) => q.x * W);
  const ys = p.map((q) => q.y * H);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const sum = { face: 0, faceN: 0, room: 0, roomN: 0 };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
        sum.face += l;
        sum.faceN++;
      } else {
        sum.room += l;
        sum.roomN++;
      }
    }
  return { face: sum.faceN ? sum.face / sum.faceN : 0, room: sum.roomN ? sum.room / sum.roomN : 0 };
}

const seen = (d: LandmarkData) => ((d.to ?? d.from)?.visibility ?? 1) >= MIN_VISIBILITY;

/** Face outline and features, with the eye line and nose tip that the front-camera angles come from. */
function drawFace(draw: DrawingUtils, p: NormalizedLandmark[], contours: { start: number; end: number }[]) {
  draw.drawConnectors(p, contours, { color: TRACE, lineWidth: 3 });
  draw.drawConnectors(p, [{ start: LEFT_EYE_OUTER, end: RIGHT_EYE_OUTER }], { color: MEASURED, lineWidth: 5 });
  draw.drawLandmarks([p[LEFT_EYE_OUTER], p[RIGHT_EYE_OUTER], p[NOSE_TIP]], { color: MEASURED, fillColor: MEASURED, radius: 6 });
}

/** Upper-body skeleton, with the ear, shoulder and hip that the side-camera angles come from. */
function drawPose(draw: DrawingUtils, p: NormalizedLandmark[], connections: { start: number; end: number }[]) {
  draw.drawConnectors(p, connections.filter((c) => c.start <= POSE.hip[1] && c.end <= POSE.hip[1]), { color: TRACE, lineWidth: 4 });
  const i = nearSide(p);
  const [ear, shoulder, hip] = [POSE.ear[i], POSE.shoulder[i], POSE.hip[i]];
  const color = (d: LandmarkData) => (seen(d) ? MEASURED : HIDDEN);
  draw.drawConnectors(p, [{ start: ear, end: shoulder }, { start: shoulder, end: hip }], { color, lineWidth: 7 });
  draw.drawLandmarks([p[ear], p[shoulder], p[hip]], { color, fillColor: color, radius: 9 });
}

export function describeCameraError(e: unknown) {
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'NotAllowedError') return 'Akses kamera diblokir. Izinin dari ikon di kolom alamat, atau pakai mode Timer.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Kameranya nggak ketemu. Pilih kamera lain, atau pakai mode Timer.';
  if (name === 'NotReadableError') return 'Kameranya lagi dipakai aplikasi lain. Tutup dulu aplikasinya, terus coba lagi.';
  return `Pengecek kamera gagal jalan: ${e instanceof Error ? e.message : String(e)}`;
}

/** Video inputs; labels are only filled in after camera permission was granted once. */
export async function listCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === 'videoinput')
    .map((d, i) => ({ id: d.deviceId, label: d.label || `Kamera ${i + 1}` }));
}

/** `preview` holds the video with the detected skeleton drawn over it; move it as one piece. */
export type Vision = { video: HTMLVideoElement; preview: HTMLElement; deviceId: string | null; stop: () => void };

/**
 * Opens the camera and calls `onSample` once per new video frame (null when no
 * face or body is found). The returned video element may be moved between
 * documents (e.g. into the mini monitor); the loop follows it.
 */
export async function startVision(
  onSample: (s: Sample | null, t: number) => void,
  { view, deviceId }: { view: CameraView; deviceId: string | null },
): Promise<Vision> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
    },
    audio: false,
  });
  const release = () => stream.getTracks().forEach((t) => t.stop());
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('aria-label', 'Pratinjau kamera dengan titik yang dideteksi, hanya tampil di layar ini');
  // The overlay is cropped exactly like the video, so the points land on the face and body.
  const canvas = document.createElement('canvas');
  const preview = document.createElement('div');
  preview.style.cssText = 'position:absolute;inset:0';
  for (const el of [video, canvas]) el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
  preview.append(video, canvas);
  let detect: (t: number) => Sample | null;
  let close: () => void;
  try {
    video.srcObject = stream;
    await video.play();
    const ctx = canvas.getContext('2d')!;
    const mp = await import('@mediapipe/tasks-vision');
    const draw = new mp.DrawingUtils(ctx);
    // Setting the size clears the last drawing and follows the camera if its resolution changes.
    const fit = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };
    if (view === 'front') {
      const face = await createFace();
      const probe = Object.assign(document.createElement('canvas'), { width: 32, height: 24 }).getContext('2d', { willReadFrequently: true })!;
      let light = { face: 0, room: 0 };
      let frames = 0;
      detect = (t) => {
        const r = face.detectForVideo(video, t);
        fit();
        const p = r.faceLandmarks[0];
        if (p) {
          drawFace(draw, p, mp.FaceLandmarker.FACE_LANDMARKS_CONTOURS);
          // Lighting changes slowly; twice a second is plenty.
          if (frames++ % 15 === 0) light = brightness(probe, video, p);
        }
        return faceSample(r, canvas.width, canvas.height, light);
      };
      close = () => face.close();
    } else {
      const pose = await createPose();
      detect = (t) => {
        const r = pose.detectForVideo(video, t);
        fit();
        if (r.landmarks[0]) drawPose(draw, r.landmarks[0], mp.PoseLandmarker.POSE_CONNECTIONS);
        return poseSample(r, canvas.width, canvas.height);
      };
      close = () => pose.close();
    }
  } catch (e) {
    release();
    throw e;
  }

  let alive = true;
  let raf = 0;
  let rafWin: Window | null = null;
  let lastRun = 0;
  let lastFrame = -1;
  const loop = () => {
    if (!alive) return;
    lastRun = performance.now();
    if (video.readyState >= 2 && video.currentTime !== lastFrame) {
      lastFrame = video.currentTime;
      onSample(detect(lastRun), lastRun);
    }
    try {
      rafWin?.cancelAnimationFrame(raf);
    } catch {}
    // Frames are paced by whichever window shows the video, so a visible mini
    // monitor keeps tracking at full rate while this tab is in the background.
    rafWin = video.ownerDocument.defaultView ?? window;
    raf = rafWin.requestAnimationFrame(loop);
  };
  // A frame request queued on a window that just closed never fires, and hidden
  // tabs pause them; this restarts the loop (at about 1 Hz while hidden).
  const watchdog = setInterval(() => performance.now() - lastRun > 1000 && loop(), 1000);
  loop();

  return {
    video,
    preview,
    deviceId: stream.getVideoTracks()[0]?.getSettings().deviceId ?? null,
    stop() {
      alive = false;
      clearInterval(watchdog);
      try {
        rafWin?.cancelAnimationFrame(raf);
      } catch {}
      close();
      release();
      video.srcObject = null;
      preview.remove();
    },
  };
}
