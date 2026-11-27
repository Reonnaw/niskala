import type { SupabaseClient } from '@supabase/supabase-js';
import { SAMPLE_ID, type Prefs, type SessionSummary } from './store';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the deployment has a Supabase project configured. */
export const syncConfigured = Boolean(url && key);

let client: Promise<SupabaseClient> | null = null;

// The SDK is only downloaded once the user opts in, and every request runs as an
// anonymous Supabase user so row-level security scopes rows to this browser.
function getClient() {
  client ??= import('@supabase/supabase-js')
    .then(async ({ createClient }) => {
      const c = createClient(url!, key!);
      const { data } = await c.auth.getSession();
      if (!data.session) {
        const { error } = await c.auth.signInAnonymously();
        if (error) throw error;
      }
      return c;
    })
    .catch((e) => {
      client = null;
      throw e;
    });
  return client;
}

/** Upserts session summaries and preferences. Never sends video, landmarks, the calibration baseline or sample sessions. */
export async function pushToSupabase(all: SessionSummary[], prefs: Prefs) {
  const sessions = all.filter((s) => !s.id.startsWith(SAMPLE_ID));
  const c = await getClient();
  const { data } = await c.auth.getSession();
  const user_id = data.session?.user.id;
  if (!user_id) throw new Error('No Supabase session');
  const results = await Promise.all([
    sessions.length
      ? c.from('session_summaries').upsert(sessions.map((s) => ({ ...s, user_id })))
      : null,
    c.from('preferences').upsert({
      user_id,
      bedtime_min: prefs.bedtime,
      warmth: prefs.warmth,
      sensitivity: prefs.sensitivity,
      eye_min: prefs.eyeMin,
      reset_min: prefs.resetMin,
      updated_at: new Date().toISOString(),
    }),
  ]);
  const error = results.find((r) => r?.error)?.error;
  if (error) throw error;
}
