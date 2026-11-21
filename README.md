# Niskala

Techcomfest 2027, Sub-theme 3: Smart Lifestyle & Digital Wellbeing (SDG 3).

A browser workspace (UI in Bahasa Indonesia) that watches posture and blink rate through the webcam, entirely on-device. Posture covers both planes: forward lean and head drop, and sideways lean and head tilt. It responds with a soft edge glow instead of pop-ups, guides 20-second eye breaks and a 60-second desk reset, and warms the screen as bedtime approaches.

In Balinese thought *sekala* is the seen world and *niskala* the unseen. The logo is *kawung*, one of the oldest batik motifs: four petals that also read as eyes, one of them lit in kunyit, the thing Niskala makes visible. The palette follows batik dyes: lontar cream paper, soga brown line art, nila indigo for the brand and every primary action, and kunyit turmeric for strain. Three more dyes tell topics apart: daun leaf green for the eyes and for what went well, mengkudu morinda red for time away from the desk, and ungu eggplant for the evening. A `.hue-*` class sets a card or section's dye. The dark theme is *malam*.

## Run

```bash
pnpm install   # also copies the MediaPipe wasm into public/mediapipe
pnpm dev       # http://localhost:3000
pnpm test      # signal math and insights aggregation (node:test, no build step)
```

## Pages

| Route | What it is |
| --- | --- |
| `/` | Landing page whose hero is the live demo: Raka and Ayu act out a slouch and a lean until you take the sliders, and the real edge glow answers. Below it a pinned room plays the six signals as you scroll |
| `/app` | Workspace: first-run setup, tracking, breaks, evening, sensitivity, data |
| `/riwayat` | 7, 14 or 30 days of screen time, leaning share, breaks and late minutes |
| `/privasi` | What is processed, stored, and optionally backed up |

## Workspace features

- **Front or side camera:** a laptop webcam above the screen reads forward lean, sideways lean, head tilt and blinks (MediaPipe Face Landmarker). A camera at the side of the desk reads neck and trunk angles directly (MediaPipe Pose Landmarker), which is more accurate for forward-head posture but cannot see sideways lean or blinks. Each position has its own calibration, and any connected camera can be chosen. The preview draws what the model found: the face outline with the eye line and nose tip in front, or the upper-body skeleton with the ear, shoulder and hip from the side, red when a point is out of view.
- **Two views of the figure:** side view for forward lean, front view (mirrored like the webcam) for sideways lean and head tilt.
- **Three modes:** Camera (posture and blinks), Timer only (no camera, scheduled breaks), and Demo (sliders).
- **Edge glow:** turmeric for sustained leaning or low blinking, indigo when a scheduled break is due. Never a modal.
- **Breaks:** a 20-second eye break (20-20-20 rule) and a 60-second desk reset. Both are timed and step-by-step, with live head-angle and blink feedback from the camera, and can be snoozed for 5 minutes.
- **Desk setup check:** with the front camera, three seconds give an estimate of the eye-to-screen distance (from the iris, which is close to 11.7 mm wide in nearly every adult), whether the screen is too low or too high (from where the eyes sit relative to the camera), and whether the face is lit or backlit, with a score and concrete fixes. Sitting closer than about 45 cm for 20 seconds also shows up in the status line.
- **Daily score and streak:** a 0-100 score per day from the tracked time spent upright (three quarters) and blinking normally (one quarter), a target of 70, and the number of days in a row that met it, in the workspace bar and on the Riwayat page.
- **Weekly coach:** on request, the Riwayat page sends the last 7 days as rounded totals to `/api/coach`, which asks Gemini for a headline and three tips in casual Indonesian. The server checks and rebuilds the numbers before they reach the prompt, answers only this site's own pages, allows a few requests per hour per address (as seen by the hosting proxy) and a fixed number for everyone together, and stores nothing. The limits live in the server's memory: on a host that runs many instances, put them in a shared store. You can see exactly what is sent before asking.
- **Posture training:** a 2-minute routine started by hand (sit tall, chin tucks, shoulder-blade squeezes, then holding it while working). The camera counts the seconds you stay upright and the result is shown at the end.
- **Voice:** optional spoken reminders in Indonesian. It names what drifted ("Kepalamu maju ke arah layar", "Badanmu miring ke kanan"), announces breaks, reads each step of the guided routines and sums up a training. Every line is recorded once with Gemini TTS and served as a small MP3 from `public/voice/`, so nothing is sent anywhere while the app runs.
- **Floating window (two monitors):** an always-on-top Picture-in-Picture window in Chrome and Edge 116+, or a small popup elsewhere, that can be dragged to the monitor you work on. It shows the figure, posture state, strain, the edge glow and break cues, and runs the guided breaks. The camera video and the timers move into it, so tracking keeps its full rate while the main tab is in the background.
- **Desktop notifications:** opt-in system notifications for break cues and sustained strain, sent only when no Niskala window has focus.
- **Status in the tab title:** "Bungkuk ke depan · Niskala", "Waktunya jeda · Niskala", readable from the taskbar or another screen.
- **Away detection:** with the camera on, nobody in frame for a minute means you left the desk. That time is not counted as screen time; 2 minutes away counts as an eye break and 5 minutes as a desk reset.
- **Evening:** bedtime-aware warm shift with wind-down and past-bedtime guidance.
- **Sensitivity:** Gentle, Balanced or Strict thresholds. Optional soft chime.
- **Keyboard:** `R` reset, `E` eye break, `L` posture training, `M` floating window, `Esc` stop (snoozes a break cue for 5 minutes).
- **Data:** everything stays in local storage. Download as JSON, delete, or opt in to an anonymous Supabase backup.
- **Installable:** web manifest and icons. Lontar/Malam/Auto theme with no flash on load.

## Architecture

| Module | Role |
| --- | --- |
| `lib/vision.ts` | MediaPipe Face or Pose Landmarker per video frame, with the detected points drawn over the preview. Its loop follows the video into the mini monitor window. |
| `lib/coach.ts`, `app/api/coach/route.ts` | The weekly summary that leaves the device, its validation, the prompt, and the route that calls Gemini with `GEMINI_API_KEY` |
| `lib/voice.ts` | Every spoken line, its recording's file name, and playback. `npm run voice` (`scripts/voice.ts`) records new or edited lines with Gemini TTS, using `GEMINI_API_KEY` from the environment or `.env.local`. |
| `lib/signals.ts` | Pure math: baseline, posture on four axes (head, torso, side, tilt), blink counter, strain accumulators, sensitivity presets, bedtime stages |
| `lib/insights.ts` | Per-day aggregation for the Insights page |
| `lib/use-monitor.ts` | 4 Hz loop: drift, strain, glow, break cues, session totals, save and sync |
| `lib/store.ts` | localStorage stores shaped for `useSyncExternalStore`, plus the pre-paint theme script |
| `lib/sync.ts` | Optional Supabase backup (anonymous auth, RLS). The SDK loads only after opt-in. |
| `components/posture-figure.tsx` | 2.5D figure: side view (four layers: hip, shoulder, neck pivots) and front view (three layers: hip and neck roll) |
| `components/ui.tsx`, `ui-client.tsx` | Design-system parts: badge, stat card, meter, progress ring; switch, segmented control, tabs, confirm dialog, toasts |
| `components/icons.tsx` | One-style icon set (24 px grid, 1.75 stroke) |

**Side camera.** The neck angle is the shoulder-to-ear line against vertical (the inverse of the clinical craniovertebral angle) and the trunk angle is the hip-to-shoulder line, both taken from the body side with the most visible landmarks and signed by which way the nose points, so a camera on either side works. A desk often hides the hip from the side; then only the neck is read, and the status line asks to move the camera.

**Sideways lean.** The midpoint between the eye corners is compared with the calibration in eye-widths; the midpoint barely moves when the head turns, so glancing at a second monitor is not read as a lean. Head tilt is the angle of the eye line in the raw frame, ordered by position so it never wraps around ±180°.

**Debouncing.** Drift must pass the sensitivity threshold. Strain builds over 6 to 16 seconds, and the glow stays dark for the first 30%, so a glance at your phone never lights the edge.

**Privacy.** Video frames and landmarks never leave the tab. The model and wasm are served from this origin.

## Supabase (optional)

1. Run `supabase/schema.sql` in the SQL editor.
2. Enable **Authentication → Anonymous sign-ins**.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Set the same variables in Vercel.

Without them the backup option is hidden. On Vercel, `VERCEL_PROJECT_PRODUCTION_URL` sets the canonical URL for metadata, the sitemap and robots.txt. Set `NEXT_PUBLIC_SITE_URL` to override it for a custom domain.

## Figure assets

`assets/figure/figure.blend` holds the scene: a primitive-built figure at a desk with laptop and mug, a three-band toon emission shader with a rim term, inverted-hull outlines in soga brown, an orthographic camera, and `pivot_hip` → `pivot_arms` / `pivot_neck` empties.

Each body group (seat, torso, arms, head) is rendered alone, with the groups in front of it set as holdouts (`assets/figure/render/`). `figure.aseprite` stacks the layers, holds the pivot slices, and exports a 256-colour packed sheet (`public/figure/sheet.png`, 70 KB) plus `lib/figure-sheet.json`. In the browser the arms counter-rotate around the shoulder, so the hands stay on the keyboard as the back rounds.

The front view uses a second orthographic camera (`OrthoFront`) at webcam height with the desk, laptop and mug hidden. Its base, upper and head layers are in `render-front/`, assembled in `figure-front.aseprite`, and exported as `public/figure/front.png` (34 KB) with `lib/figure-front.json`.

**Figures.** The workspace, onboarding and the small window show the same Raka and Ayu as the landing page, through `components/cast.tsx`: the side view picks one of 17 frames from upright to fully slouched, the front view one of 17 from leaning left to right. Back and head share the side dial (the larger one leads), and body lean and head tilt share the front one. The older hand-modelled layered figures in `assets/figure/` are no longer used by the app.

## 3D objects

`assets/objects/objects.blend` holds the kawung logo, a webcam, an eye, an hourglass, a mug, a moon and star, a padlock and a snake plant, modelled from primitives with the figure's toon shader and outlines. Each is rendered at 512 px and served as a trimmed WebP from `public/3d/` (9 to 15 KB each). `logo-wobble.webp` is 24 frames of the logo turning, played with CSS `steps()` and held on the first frame for reduced motion.

## Story and cast

The landing page has two characters, Raka and Ayu, generated in Tripo Studio and sent to Blender with the Tripo DCC Bridge. Ayu was generated from a front render of Raka, so both share the same proportions. Each arrived as one textured mesh of about 2 million faces and was decimated to 48 thousand. `assets/story/characters.py` turns them into toon characters: the Tripo colour texture goes through the shared toon shader, and both share one rig with the same bone names (FK spine, IK arms and legs with pole targets), placed from landmarks measured on each mesh. Bone-heat weighting fails on Tripo meshes that aren't watertight, so the weights come from a voxel-remeshed copy and are transferred to the real surface. Their T-poses differ (Raka's palms face forward, Ayu's face down); a per-character palm angle turns each rest hand palm-down before the poses apply. The seat height comes from each character's shin, so thighs rest level and feet stay flat.

`assets/story/story.blend` holds the room: walls, window and clock built by hand, and furniture from Kenney's Furniture Kit (CC0) recoloured to the dye palette. Everything uses the figure's toon shader and outlines, and a `night` value in the shared shader dims the whole room towards nila. `animate.py` keys either character through the six beats in the character's own frame, so the same poses fit both bodies: typing, slouching, leaning on one hand, looking out of the window, standing up to stretch, carrying the mug to the coffee machine with a walk that plants each foot, nightfall, closing the laptop and a wave. The chair, mug, laptop lid and screen glow, and clock hands are keyed with it.

`render.py` draws the room once by day and once by night, then the character and everything that moves as transparent frames with the room as a holdout, so the desk still hides their legs: 332 frames per character at 1200×900, about 5.5 MB of WebP each in `public/story/`. `lib/story.json` maps each beat to its frame range, the night fade, and the frames where the edge glows. `components/story.tsx` pins the room beside the text (above it on phones) and plays each beat's action once, at the scene's own speed, when you scroll to it; it loads every 16th frame first and fills the gaps, and only loads the character you pick. `exercises.py` renders a short looping clip of each move in the guided routines (sitting tall, chin tuck, shoulder-blade squeeze and working upright from the side; shoulder rolls, neck tilts and looking far from the front, mirrored) for both characters; they are cropped around the character and packed as animated WebP into `public/exercise/<figure>/`, and the routine shows the one for the chosen figure beside each step. `hero.py` renders the hero's slider sequences, 17 side frames from upright to slouched and 17 front frames leaning from left to right (mirrored like a webcam), into `public/cast/`.

```bash
cd assets/story
blender -b story.blend --python-expr "exec(open('animate.py').read()); animate('raka'); exec(open('render.py').read()); backgrounds(); actor('raka')"
blender -b story.blend --python hero.py
```

The raw PNG renders go to `assets/story/render/` (ignored); convert them to WebP for `public/`.

## Known limits

- Without the floating window, tracking slows to about one frame a second while the tab is hidden, and blink rate is not measured.
- The popup fallback (browsers without Picture-in-Picture) is a normal window, so it can be covered by other windows.
- Head pitch is compared to the calibration as an absolute change, so looking up for a long time also counts as drift.
- The warm shift tints Niskala only, not the whole screen.
