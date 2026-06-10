import { supabase } from '@/utils/supabase/client';

// ¿Hay sesión de Supabase activa? Define si el estado va a la DB (compartido, prod logueado)
// o a localStorage (fallback: dev local con bypass, o sin login). Así no se rompe el dev local.
export async function hasSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}
