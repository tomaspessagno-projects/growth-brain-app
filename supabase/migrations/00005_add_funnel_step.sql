-- ============================================================
-- GROWTH BRAIN AI — Migration: Funnel Step en Experimentos
-- Instrucciones:
-- 1. Ve a Supabase > SQL Editor > New Query
-- 2. Pega este código y dale Run
-- ============================================================

-- Agregar columna funnel_step a experimentos
ALTER TABLE public.experimentos
ADD COLUMN IF NOT EXISTS funnel_step VARCHAR(50);

-- Los valores válidos son:
-- 'visitas' | 'datos_personales' | 'cotizaron' |
-- 'intencion_alta' | 'inicio_alta' | 'ingreso_portal' | 'cliente'
-- NULL = experimento no asociado a ningún paso del funnel
