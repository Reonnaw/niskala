// Records every line in lib/voice.ts with Gemini TTS into public/voice/<hash>.mp3.
// Run after adding or editing a line:  npm run voice
// Keys come from GEMINI_API_KEY, GEMINI_API_KEY2, GEMINI_API_KEY3... in the environment or .env.local, and are only used
// here, never in the app. When one key runs out of its daily quota the next one takes over.
// Lines that already have a file are skipped, so a run cut short by the rate limit just resumes.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { allLines, clipOf } from '../lib/voice.ts';

// The 3.x TTS models read a style direction out loud; 2.5 takes it as direction.
const MODEL = process.env.VOICE_MODEL ?? 'gemini-2.5-flash-preview-tts';
const VOICE = process.env.VOICE_NAME ?? 'Sulafat';
// A direction, not spoken: only the line after the colon is said.
const STYLE = 'Say in a warm, calm, unhurried Indonesian voice, like a friend gently reminding someone:';
const API = 'https://generativelanguage.googleapis.com/v1beta';

function apiKeys() {
  const file = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
  const names = ['GEMINI_API_KEY', ...Array.from({ length: 8 }, (_, i) => `GEMINI_API_KEY${i + 2}`)];
  const keys = names
    .map((n) => process.env[n] || file.match(new RegExp(`^${n}\\s*=\\s*"?([^"\\n]+)"?`, 'm'))?.[1]?.trim())
    .filter((k): k is string => Boolean(k));
  if (!keys.length) throw new Error('GEMINI_API_KEY is not set: export it, or put GEMINI_API_KEY=... in .env.local');
  return keys;
}

const keys = apiKeys();
let k = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function record(text: string): Promise<{ audio: Buffer; mime: string } | null> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': keys[k] },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${STYLE} ${text}` }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      }),
    });
    const body = await res.json();
    // A daily cap does not clear by waiting a minute: move on to the next key, or stop so a later run picks up from here.
    if (res.status === 429 && JSON.stringify(body).includes('PerDay')) {
      if (++k < keys.length) {
        console.log(`  key ${k} is out for today, switching to key ${k + 1}`);
        attempt = -1;
        continue;
      }
      throw new Error(`daily quota of ${MODEL} used up on all ${keys.length} keys; run again tomorrow`);
    }
    if (res.status === 429 && attempt < 5) {
      const wait = Number(String(body.error?.details?.find((d: { retryDelay?: string }) => d.retryDelay)?.retryDelay ?? '30').replace('s', ''));
      console.log(`  rate limited, waiting ${wait} s`);
      await sleep((wait + 1) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${body.error?.message ?? JSON.stringify(body).slice(0, 300)}`);
    const part = body.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData)?.inlineData;
    // Now and then a reply comes back without audio ("finishReason": "OTHER"); asking again usually works.
    if (!part) {
      if (attempt < 3) continue;
      console.log(`  no audio after ${attempt + 1} tries, skipping for now`);
      return null;
    }
    return { audio: Buffer.from(part.data, 'base64'), mime: part.mimeType };
  }
}

mkdirSync('public/voice', { recursive: true });
const lines = allLines();
let made = 0;
for (const text of lines) {
  const out = `public${clipOf(text)}`;
  if (existsSync(out)) continue;
  const got = await record(text);
  if (!got) continue;
  const { audio, mime } = got;
  // Some models send a WAV file, others raw 16-bit PCM ("audio/L16;codec=pcm;rate=24000").
  const raw = /L16|pcm/i.test(mime) ? ['-f', 's16le', '-ar', /rate=(\d+)/.exec(mime)?.[1] ?? '24000', '-ac', '1'] : [];
  // Trim the silence at both ends so a cue starts right away, and even out the loudness between lines.
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB';
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...raw, '-i', 'pipe:0',
    '-af', `${trim},areverse,${trim},areverse,loudnorm=I=-18:TP=-2`, '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '48k', out], { input: audio });
  made++;
  console.log(`${out}  ${text}`);
}
console.log(`${made} recorded, ${lines.length - made} already there, ${lines.length} lines in total.`);
