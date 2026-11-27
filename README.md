# Niskala

Techcomfest 2027, Sub-theme 3: Smart Lifestyle & Digital Wellbeing (SDG 3).

Stress can't be seen; the body and work habits that carry it can. Niskala is a browser workspace (UI in Bahasa Indonesia) that keeps the unseen side of screen work, stress and mental strain, in view through what is visible: posture and blink rate read through the webcam entirely on-device, breaks taken or skipped, and minutes past bedtime. It answers with a soft edge glow instead of pop-ups, guides a one-minute breathing pause, 20-second eye breaks and a 60-second stretch, asks for a daily stress rating and a weekly WHO-5, and shows from your own data how stress compares on days with enough breaks.

## The problem

An estimated 16% of working-age adults had a mental disorder in 2023, and depression and anxiety alone cost about 12 billion working days a year, US$ 1 trillion in lost productivity ([WHO, Mental health at work](https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work)). Most help is something you have to go and look for once things are already bad.

## What is different

- **It is there while you work.** Niskala runs beside the work itself, so it does not wait until you have dropped to be opened.
- **The evidence is your own data.** Riwayat sets the stress you rate each evening against whether you took your breaks that day, so the effect of pausing shows up in your own numbers.
- **Reminders that don't add stress.** No pop-ups or alarms: the edge of the screen lights up softly and fades again.
- **Private by design.** Video never leaves the browser. Under Indonesia's personal data protection law (UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi) health data is specific, sensitive personal data, so check-ins and WHO-5 answers stay in local storage, are never backed up, and only rounded weekly means reach the coach.
- **No emotion guessing.** Niskala deliberately does not infer emotion or stress from the face. The camera reads angles and blinks; stress comes only from what you rate yourself.

In Balinese thought *sekala* is the seen world and *niskala* the unseen. The logo is *kawung*, one of the oldest batik motifs: four petals that also read as eyes, one of them lit in kunyit, the thing Niskala makes visible. The palette follows batik dyes: lontar cream paper, soga brown line art, nila indigo for the brand and every primary action, and kunyit turmeric for strain. Three more dyes tell topics apart: daun leaf green for the eyes and for what went well, mengkudu morinda red for time away from the desk and for discomfort, and ungu eggplant for the evening and for the mind (stress, the breathing pause, the weekly check). A `.hue-*` class sets a card or section's dye. The dark theme is *malam*.

## Run

```bash
pnpm install   # also copies the MediaPipe wasm into public/mediapipe
pnpm dev       # http://localhost:3000
pnpm test      # signal math and insights aggregation (node:test, no build step)
```

## Pages

| Route | What it is |
| --- | --- |
| `/` | Landing page: a full-screen hero with the room as a floating isometric diorama, *sekala* above and *niskala* below: Raka works and Ayu stretches on top, and under the floor kunyit traces run down strata in the batik dyes into a glowing kawung. The live demo follows, then the problem in numbers and what sets Niskala apart. The demo has Raka and Ayu act out a slouch and a lean while it is in view, until you take the sliders, and the real edge glow answers. Further down, a pinned room plays the six signals as you scroll, and the page runs from morning to night with it: the section's background goes from lontar through dusk to nila as the room's lights change, straight into the closing band. Behind the light sections a few faint kawung turn over minutes, and stars come out with the night; both stand still for reduced motion |
| `/app` | Workspace: first-run setup, tracking, breaks and the breathing pause, daily missions, the daily check-in, the weekly WHO-5, evening, sensitivity, data |
| `/riwayat` | 7, 14 or 30 days of screen time, leaning share, breaks, late minutes, trainings and full-mission days, self-rated stress and focus blocks set against the breaks taken, and discomfort set against the score. A browser with no data yet can load two weeks of sample data (`lib/sample.ts`) to try it at once, clearly marked and removable without touching anything recorded since; sample sessions are never backed up |
| `/privasi` | What is processed, stored, and optionally backed up |

## Workspace features

- **Front or side camera:** a laptop webcam above the screen reads forward lean, sideways lean, head tilt and blinks (MediaPipe Face Landmarker). A camera at the side of the desk reads neck and trunk angles directly (MediaPipe Pose Landmarker), which is more accurate for forward-head posture but cannot see sideways lean or blinks. Each position has its own calibration, and any connected camera can be chosen. The preview draws what the model found: the face outline with the eye line and nose tip in front, or the upper-body skeleton with the ear, shoulder and hip from the side, red when a point is out of view.
- **Two views of the figure:** side view for forward lean, front view (mirrored like the webcam) for sideways lean and head tilt. Sitting upright, the side view is not a still: Raka or Ayu reads along with a slow nod, and the posture frames take over as soon as you lean. It stays still for reduced motion.
- **Three modes:** Camera (posture and blinks), Timer only (no camera, scheduled breaks), and Demo (sliders).
- **Edge glow:** turmeric for sustained leaning or low blinking, indigo when a scheduled break is due. Never a modal.
- **Breaks:** a 20-second eye break (20-20-20 rule) and a 60-second desk reset. Both are timed and step-by-step, with live head-angle and blink feedback from the camera, and can be snoozed for 5 minutes.
- **Desk setup check:** with the front camera, three seconds give an estimate of the eye-to-screen distance (from the iris, which is close to 11.7 mm wide in nearly every adult), whether the screen is too low or too high (from where the eyes sit relative to the camera), and whether the face is lit or backlit, with a score and concrete fixes. Sitting closer than about 45 cm for 20 seconds also shows up in the status line.
- **Daily score and streak:** a 0-100 score per day from the tracked time spent upright (three quarters) and blinking normally (one quarter), a target of 70, and the number of days in a row that met it, in the workspace's missions card and on the Riwayat page.
- **Focus blocks:** start a 25- or 50-minute block from the bar or with `F`, and the bar, the tab title and the floating window count it down. When it ends, the 60-second stretch comes due through the usual cue, so work and the break are one loop. The countdown follows the break timers: it pauses during a routine, while you are away, and while the tab is hidden without the floating window. Finished blocks are counted per session, and Riwayat compares them on days that took every break against the other work days, so you can see whether the breaks cost any work. In Demo mode, "Fokus selesai" ends a running block at once.
- **Breathing pause:** one guided minute, five seconds in and five out (six breaths a minute). The kawung logo grows on each breath in and shrinks on each breath out, and the voice says when to breathe in and out. Start it from the missions card, the Jeda tab or the `N` key. It does not reset the eye or stretch timers.
- **Daily missions:** five small goals a day that tie the other features together: three eye breaks, two stretching breaks, one breathing pause, one posture training and a score of 70. An open one starts its routine in one click, it ticks off as soon as the routine ends, the floating window shows how many are done, and Riwayat and the weekly coach count the days where all five were met. Days from before the breathing pause existed count as not fully done.
- **Daily check-in:** once a day, rate stress, and neck and shoulders, back and eyes, each from 0 to 10, the usual rating scale. In the evening the card is highlighted and the wind-down advice asks for it. Riwayat shows a strip of the days and, once there are at least two check-ins on each side of the score goal, compares discomfort on days that met it with the rest, so the effect of better posture shows up as how the body feels, not only as minutes upright. Stress gets the same treatment against breaks: once there are two rated work days on each side, Riwayat compares stress on days that met every break mission (eye breaks, stretching and the breathing pause) with the other work days, and rings the days that did. Check-ins are health data: they stay in the browser, are never backed up, and the coach only gets the rounded weekly mean of each area and of stress.
- **Weekly WHO-5:** once a week the workspace offers the WHO-5 Well-Being Index (WHO, 1998; free to use), five questions about the last two weeks on a six-point scale, scored 0 to 100. Under 50, the questionnaire's own cut-off, the card shows Healing119 from Kemenkes (call 119, extension 8, free, 24 hours, or chat at healing119.id) in plain words, with no diagnostic labels. The answers stay in the browser and are never sent anywhere, not even to the coach.
- **Weekly coach:** on request, the Riwayat page sends the last 7 days as rounded totals to `/api/coach`, which asks Gemini for a headline and three tips in casual Indonesian, aimed at the areas that feel worst when check-ins exist. With a stress mean, one tip is about stress and tied to the work habits in the numbers; the prompt forbids guessing causes or naming conditions, and a mean of 7 or more adds a gentle pointer to someone they trust or Healing119. The server checks and rebuilds the numbers before they reach the prompt, answers only this site's own pages, allows a few requests per hour per address (as seen by the hosting proxy) and a fixed number for everyone together, and stores nothing. The limits live in the server's memory: on a host that runs many instances, put them in a shared store. You can see exactly what is sent before asking.
- **Posture training:** a 2-minute routine started by hand (sit tall, chin tucks, shoulder-blade squeezes, then holding it while working). The camera counts the seconds you stay upright and the result is shown at the end.
- **Voice:** optional spoken reminders in Indonesian. It names what drifted ("Kepalamu maju ke arah layar", "Badanmu miring ke kanan"), announces breaks, reads each step of the guided routines and sums up a training. Every line is recorded once with Gemini TTS and served as a small MP3 from `public/voice/`, so nothing is sent anywhere while the app runs.
- **Floating window (two monitors):** an always-on-top Picture-in-Picture window in Chrome and Edge 116+, or a small popup elsewhere, that can be dragged to the monitor you work on. It shows the figure, posture state, strain, the edge glow and break cues, and runs the guided breaks. The camera video and the timers move into it, so tracking keeps its full rate while the main tab is in the background.
- **Desktop notifications:** opt-in system notifications for break cues and sustained strain, sent only when no Niskala window has focus.
- **Status in the tab title:** "Bungkuk ke depan · Niskala", "Waktunya jeda · Niskala", readable from the taskbar or another screen.
- **Away detection:** with the camera on, nobody in frame for a minute means you left the desk. That time is not counted as screen time; 2 minutes away counts as an eye break and 5 minutes as a desk reset.
- **Evening:** bedtime-aware warm shift with wind-down and past-bedtime guidance.
- **Sensitivity:** Gentle, Balanced or Strict thresholds. Optional soft chime.
- **Keyboard:** `R` reset, `E` eye break, `L` posture training, `N` breathing pause, `F` focus block, `M` floating window, `Esc` stop (snoozes a break cue for 5 minutes).
- **Data:** everything stays in local storage, including the check-ins and WHO-5 answers. Download as JSON, delete, or opt in to an anonymous Supabase backup.
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

**Looking up.** Front-camera head pitch only counts when the head nods down from the calibration. The face model's pitch grows as the head nods down wherever the camera sits, checked by running the landmarker on renders of a face looking up and down, so looking up at a shelf or a high monitor is never read as a slouch.

**Debouncing.** Drift must pass the sensitivity threshold. Strain builds over 6 to 16 seconds, and the glow stays dark for the first 30%, so a glance at your phone never lights the edge.

**Privacy.** Video frames and landmarks never leave the tab. The model and wasm are served from this origin. Every response carries `Permissions-Policy` (camera for this origin only; no microphone or location), `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY` with `frame-ancestors 'none'`, set in `next.config.ts`. There is no script CSP, because the pre-paint theme script is inline and MediaPipe compiles wasm.

## Supabase (optional)

1. Run `supabase/schema.sql` in the SQL editor.
2. Enable **Authentication → Anonymous sign-ins**.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Set the same variables in Vercel.

A project set up before posture trainings or breathing pauses were counted needs `supabase/schema.sql` run again: it adds the `trainings` and `breaths` columns, and backups fail without them.

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

`render.py` draws the room once by day and once by night, then the character and everything that moves as transparent frames with the room as a holdout, so the desk still hides their legs. It uses the hero's isometric camera from `iso.py`, with the room standing on a slab of soga earth, so the whole room floats on the section's sky with no frame around it; the lit lampshade's material is made there too. 332 frames per character at 1200×1200, about 5.5 MB of WebP each in `public/story/`. `lib/story.json` maps each beat to its frame range, the night fade, and the frames where the edge glows. `components/story.tsx` pins the room beside the text (above it on phones, kept under 44% of the screen's height) and plays each beat's action once, at the scene's own speed, when you scroll to it; it loads every 16th frame first and fills the gaps, and only loads the character you pick. `exercises.py` renders a short looping clip of each move in the guided routines (sitting tall, chin tuck, shoulder-blade squeeze and working upright from the side; shoulder rolls, neck tilts and looking far from the front, mirrored) for both characters; they are cropped around the character and packed as animated WebP into `public/exercise/<figure>/`, and the routine shows the one for the chosen figure beside each step. `hero.py` renders the hero's slider sequences, 17 side frames from upright to slouched and 17 front frames leaning from left to right (mirrored like a webcam), into `public/cast/`; with `-- idle` it renders only the upright reading nod, 24 frames packed as `side-idle.webp` (about 240 KB, 8 a second). Only the head moves: the mug hides the typing from the side, and a breath through the chest would change most of every frame. `iso.py` renders the landing hero: the same room through an orthographic camera at true isometric angles, Raka typing and Ayu stretching, standing on four stepped strata (soga, ungu, nila and a deeper nila) with kunyit traces that jog down every face and hang into the kawung logo from `objects.blend`. It is trimmed and served as `public/3d/iso.webp` (about 70 KB); the page floats it and pulses a glow behind the kawung, both still for reduced motion.

```bash
cd assets/story
blender -b story.blend --python-expr "exec(open('animate.py').read()); animate('raka'); exec(open('render.py').read()); backgrounds(); actor('raka')"
blender -b story.blend --python hero.py
blender -b story.blend --python iso.py   # add `-- preview` for a quick 800 px draft
```

The raw PNG renders go to `assets/story/render/` (ignored); convert them to WebP for `public/`.

## Tested

On the production build (`pnpm build && pnpm start`): Chromium and Firefox, each at desktop size and at phone size (Pixel 7, and 375 px wide), with a couple of weeks of seeded data. In all four: the landing page, workspace and Riwayat have no sideways scroll; Riwayat's sample data loads, shows the stress comparison and clears again while keeping a check-in made today; the check-in saves stress; WHO-5 waits for all five answers, scores them, and shows Healing119 under 50 with no diagnostic words; the breathing pause starts from `N` and the kawung grows on the breath in; Riwayat compares stress on days with every break against the rest; the coach payload carries the rounded stress and breathing pauses; and no page errors. With no camera, and with camera permission refused, the workspace shows a plain message and Timer mode keeps working. Safari/WebKit was not tested.

## Known limits

- Without the floating window, tracking slows to about one frame a second while the tab is hidden, and blink rate is not measured.
- The popup fallback (browsers without Picture-in-Picture) is a normal window, so it can be covered by other windows.
- The warm shift tints Niskala only, not the whole screen.
