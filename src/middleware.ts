import { NextResponse, type NextRequest } from 'next/server';

// Gate de auth para TODAS las rutas /api/*. Sin esto, los endpoints exponen data de negocio
// (HubSpot/Mixpanel/NPS) sin login. El front, una vez logueado, manda el token en la cookie
// `sb-access-token` (la setea AuthWrapper); acá se valida contra Supabase + dominio @medicus.com.ar.
// En local con NEXT_PUBLIC_DEV_BYPASS_AUTH=true se saltea (igual que el resto de la app).

export const config = { matcher: '/api/:path*' };

const unauthorized = (msg: string, status = 401) => NextResponse.json({ error: msg }, { status });

export async function middleware(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') return NextResponse.next();

  // El cron diario se autentica con CRON_SECRET en su propia ruta (no con la cookie de Supabase).
  if (req.nextUrl.pathname.startsWith('/api/cron')) return NextResponse.next();

  const token = req.cookies.get('sb-access-token')?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return unauthorized('No autorizado — login requerido');

  // Validar el token contra Supabase (getUser). Si es inválido/expirado → 401.
  let user: { email?: string } | null = null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: anon } });
    if (!r.ok) return unauthorized('Sesión inválida o expirada');
    user = await r.json();
  } catch {
    return unauthorized('No se pudo validar la sesión');
  }

  const email = (user?.email || '').toLowerCase();
  if (!email.endsWith('@medicus.com.ar')) return unauthorized('Dominio no permitido', 403);

  return NextResponse.next();
}
