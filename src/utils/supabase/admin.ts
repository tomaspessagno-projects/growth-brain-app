import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cliente SERVER-SIDE con service-role: bypassa RLS para que el cron escriba snapshots/priors
// y las rutas lean estado agregado del motor. La service key es SECRETA (sin NEXT_PUBLIC_),
// nunca se importa en código de cliente. Si falta la env, devuelve null → el caller degrada solo.
let cached: SupabaseClient | null | undefined;

export function getAdminClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  return cached;
}
