// Crea (o resetea la contraseña de) una cuenta del equipo en Supabase Auth.
// Es el "Paso 2 — Cuentas del equipo" de SUPABASE.md, pero por línea de comando e idempotente.
//
// Requiere el SERVICE ROLE KEY (secreto server-side, NO se commitea):
//   Supabase Dashboard → Project Settings → API → service_role secret.
//
// Uso (no guardes el comando en tu historial con la clave a la vista):
//   SUPABASE_URL=https://qpjsqbgwoaqbktjqioyb.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/create-user.mjs test@medicus.com.ar 'Medicus2026'
//
// Crea el usuario con email_confirm:true → puede loguear sin mail de verificación.
// Si ya existe, le actualiza la contraseña (idempotente: podés re-correrlo sin miedo).
// Valida el dominio igual que el login de la app (@medicus.com.ar).

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2] || process.env.NEW_USER_EMAIL;
const password = process.argv[3] || process.env.NEW_USER_PASSWORD;

const die = (m) => { console.error('✗ ' + m); process.exit(1); };

if (!url) die('Falta SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL).');
if (!serviceKey) die('Falta SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API → service_role secret).');
if (!email || !password) die("Uso: node scripts/create-user.mjs <email> '<password>'");
if (!email.toLowerCase().endsWith('@medicus.com.ar')) die('Solo correos @medicus.com.ar (misma regla que el login de la app).');

const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: created, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });

if (!error) {
  console.log(`✓ Usuario creado y confirmado: ${email} (id ${created.user.id})`);
  process.exit(0);
}

// Si ya existe, buscarlo y resetear la contraseña (idempotente).
if (!/already.*(registered|exists)|duplicate|been registered/i.test(error.message)) {
  die('No se pudo crear: ' + error.message);
}

let page = 1, found = null;
for (;;) {
  const { data, error: e2 } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
  if (e2) die('listUsers: ' + e2.message);
  found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found || data.users.length < 1000) break;
  page++;
}
if (!found) die('El usuario existe pero no lo encontré para actualizarlo.');

const { error: e3 } = await sb.auth.admin.updateUserById(found.id, { password, email_confirm: true });
if (e3) die('updateUserById: ' + e3.message);
console.log(`✓ El usuario ya existía; contraseña actualizada y email confirmado: ${email} (id ${found.id})`);
