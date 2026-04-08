import { createClient } from "@supabase/supabase-js";

// Creamos un único cliente de Supabase para su uso en el lado del cliente (Frontend)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("Advertencia: Las credenciales de Supabase no están configuradas en las variables de entorno.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
