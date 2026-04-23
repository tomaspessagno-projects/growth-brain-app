-- Growth Brain AI: Esquema inicial de base de datos para Supabase

-- 1. Tabla de Experimentos
CREATE TABLE IF NOT EXISTS public.experimentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'planeado' CHECK (estado IN ('planeado', 'en curso', 'finalizado')),
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en Experimentos (Opcional, pero recomendado por defecto en Supabase)
ALTER TABLE public.experimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Experimentos legibles por todos" ON public.experimentos FOR SELECT USING (true);

-- 2. Tabla de MÃ©tricas (Snapshots)
CREATE TABLE IF NOT EXISTS public.metricas_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    experimento_id UUID REFERENCES public.experimentos(id) ON DELETE CASCADE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nombre_metrica VARCHAR(255) NOT NULL,
    valor NUMERIC NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en MÃ©tricas
ALTER TABLE public.metricas_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MÃ©tricas legibles por todos" ON public.metricas_snapshots FOR SELECT USING (true);


-- 3. Tabla de Aprendizajes
CREATE TABLE IF NOT EXISTS public.aprendizajes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    experimento_id UUID REFERENCES public.experimentos(id) ON DELETE CASCADE,
    hipotesis TEXT NOT NULL,
    resultado TEXT NOT NULL,
    insights TEXT,
    validado BOOLEAN DEFAULT false,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en Aprendizajes
ALTER TABLE public.aprendizajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aprendizajes legibles por todos" ON public.aprendizajes FOR SELECT USING (true);

-- Indexes para mejorar performance en las foreign keys
CREATE INDEX IF NOT EXISTS idx_metricas_experimento ON public.metricas_snapshots(experimento_id);
CREATE INDEX IF NOT EXISTS idx_aprendizajes_experimento ON public.aprendizajes(experimento_id);
-- Fix para permitir la inserciÃ³n, ediciÃ³n y eliminaciÃ³n de registros 
-- ya que la PolÃ­tica inicial solo permitÃ­a la "Lectura" (SELECT)

-- PolÃ­ticas para 'experimentos'
CREATE POLICY "Permitir escritura en experimentos" ON public.experimentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion en experimentos" ON public.experimentos FOR UPDATE USING (true);
CREATE POLICY "Permitir borrado en experimentos" ON public.experimentos FOR DELETE USING (true);

-- PolÃ­ticas para 'metricas_snapshots'
CREATE POLICY "Permitir escritura en metricas" ON public.metricas_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion en metricas" ON public.metricas_snapshots FOR UPDATE USING (true);
CREATE POLICY "Permitir borrado en metricas" ON public.metricas_snapshots FOR DELETE USING (true);

-- PolÃ­ticas para 'aprendizajes'
CREATE POLICY "Permitir escritura en aprendizajes" ON public.aprendizajes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion en aprendizajes" ON public.aprendizajes FOR UPDATE USING (true);
CREATE POLICY "Permitir borrado en aprendizajes" ON public.aprendizajes FOR DELETE USING (true);
-- Activar la polÃ­tica "Solo Usuarios Autenticados" en vez de a TODO el mundo.

-- 1. Eliminamos las politicas temporales viejas del archivo 00002_rls_policies.sql
DROP POLICY IF EXISTS "Permitir escritura en experimentos" ON public.experimentos;
DROP POLICY IF EXISTS "Permitir actualizacion en experimentos" ON public.experimentos;
DROP POLICY IF EXISTS "Permitir borrado en experimentos" ON public.experimentos;
DROP POLICY IF EXISTS "Experimentos legibles por todos" ON public.experimentos;

DROP POLICY IF EXISTS "Permitir escritura en metricas" ON public.metricas_snapshots;
DROP POLICY IF EXISTS "Permitir actualizacion en metricas" ON public.metricas_snapshots;
DROP POLICY IF EXISTS "Permitir borrado en metricas" ON public.metricas_snapshots;
DROP POLICY IF EXISTS "MÃ©tricas legibles por todos" ON public.metricas_snapshots;

DROP POLICY IF EXISTS "Permitir escritura en aprendizajes" ON public.aprendizajes;
DROP POLICY IF EXISTS "Permitir actualizacion en aprendizajes" ON public.aprendizajes;
DROP POLICY IF EXISTS "Permitir borrado en aprendizajes" ON public.aprendizajes;
DROP POLICY IF EXISTS "Aprendizajes legibles por todos" ON public.aprendizajes;


-- 2. Creamos PolÃ­ticas Inteligentes Globales (Solo Autenticados)
-- A. Experimentos
CREATE POLICY "Auth Lectura Experimentos" ON public.experimentos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Insertar Experimentos" ON public.experimentos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Actualizar Experimentos" ON public.experimentos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Eliminar Experimentos" ON public.experimentos FOR DELETE USING (auth.uid() IS NOT NULL);

-- B. Metricas
CREATE POLICY "Auth Lectura Metricas" ON public.metricas_snapshots FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Insertar Metricas" ON public.metricas_snapshots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Actualizar Metricas" ON public.metricas_snapshots FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Eliminar Metricas" ON public.metricas_snapshots FOR DELETE USING (auth.uid() IS NOT NULL);

-- C. Aprendizajes
CREATE POLICY "Auth Lectura Aprendizajes" ON public.aprendizajes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Insertar Aprendizajes" ON public.aprendizajes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Actualizar Aprendizajes" ON public.aprendizajes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Eliminar Aprendizajes" ON public.aprendizajes FOR DELETE USING (auth.uid() IS NOT NULL);
-- ====================================================================================
-- GROWTH BRAIN AI - TEST SEED DATA (CORREGIDO)
-- Instrucciones:
-- 1. Ve a https://supabase.com/dashboard > tu proyecto
-- 2. SQL Editor > New Query
-- 3. Pega este cÃ³digo completo y dale "Run"
-- ====================================================================================

DO $$
DECLARE
  exp_landing UUID;
  exp_social  UUID;
  exp_push    UUID;
  exp_precio  UUID;
BEGIN

  -- -------------------------------------------------------
  -- 1. EXPERIMENTOS
  -- Estados vÃ¡lidos: 'planeado' | 'en curso' | 'finalizado'
  -- -------------------------------------------------------

  INSERT INTO public.experimentos (nombre, descripcion, estado, fecha_inicio, fecha_fin)
  VALUES (
    'RediseÃ±o del Hero Section de la Landing',
    'Cambiamos la imagen estÃ¡tica del hero por un video corto de 15s para aumentar el CTR hacia Pricing.',
    'finalizado',
    NOW() - interval '30 days',
    NOW() - interval '15 days'
  ) RETURNING id INTO exp_landing;

  INSERT INTO public.experimentos (nombre, descripcion, estado, fecha_inicio, fecha_fin)
  VALUES (
    'FricciÃ³n en Onboarding (Social Login)',
    'ImplementaciÃ³n de autenticaciÃ³n Social mediante Google y Microsoft para saltar la verificaciÃ³n por email.',
    'en curso',
    NOW() - interval '5 days',
    NOW() + interval '9 days'
  ) RETURNING id INTO exp_social;

  INSERT INTO public.experimentos (nombre, descripcion, estado, fecha_inicio, fecha_fin)
  VALUES (
    'Notificaciones Push de RetenciÃ³n',
    'Configurar Firebase Cloud Messaging para avisar a usuarios inactivos tras 3 dÃ­as sobre promociones.',
    'planeado',
    NOW() + interval '2 days',
    NOW() + interval '12 days'
  ) RETURNING id INTO exp_push;

  INSERT INTO public.experimentos (nombre, descripcion, estado, fecha_inicio, fecha_fin)
  VALUES (
    'Prueba Precio Anual vs Mensual Default',
    'Modificar el switch de pricing para mostrar Plan Anual con descuento por defecto en lugar de Mensual.',
    'finalizado',
    NOW() - interval '45 days',
    NOW() - interval '30 days'
  ) RETURNING id INTO exp_precio;

  -- -------------------------------------------------------
  -- 2. MÃ‰TRICAS SNAPSHOTS
  -- -------------------------------------------------------

  -- Landing Page Hero (Finalizado) - CTR subiendo
  INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro) VALUES
  (exp_landing, 'CTR Pricing (%)', 5.2,  NOW() - interval '30 days'),
  (exp_landing, 'CTR Pricing (%)', 6.1,  NOW() - interval '25 days'),
  (exp_landing, 'CTR Pricing (%)', 7.4,  NOW() - interval '20 days'),
  (exp_landing, 'CTR Pricing (%)', 8.9,  NOW() - interval '15 days');

  -- Social Login (En Curso) - Drop-off bajando (mejorando)
  INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro) VALUES
  (exp_social, 'Drop-off Rate (%)', 42.0, NOW() - interval '5 days'),
  (exp_social, 'Drop-off Rate (%)', 35.5, NOW() - interval '3 days'),
  (exp_social, 'Drop-off Rate (%)', 28.1, NOW() - interval '1 days');

  -- Precio Anual (Finalizado) - ARPU creciendo
  INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro) VALUES
  (exp_precio, 'ARPU (USD)',  15.0, NOW() - interval '45 days'),
  (exp_precio, 'ARPU (USD)',  18.5, NOW() - interval '38 days'),
  (exp_precio, 'ARPU (USD)',  22.4, NOW() - interval '30 days');

  -- -------------------------------------------------------
  -- 3. APRENDIZAJES
  -- -------------------------------------------------------

  INSERT INTO public.aprendizajes (experimento_id, hipotesis, resultado, insights, validado, creado_en) VALUES
  (
    exp_landing,
    'El video de 15s aumentarÃ¡ el CTR al Pricing un 20%.',
    'El CTR pasÃ³ del 5.2% al 8.9% â€” un aumento relativo del 70%. El video fue reproducido por el 40% de las visitas Ãºnicas.',
    'Los usuarios tienen pereza de leer copy largo. Video animado de demostraciÃ³n impacta drÃ¡sticamente la conversiÃ³n B2B.',
    true,
    NOW() - interval '14 days'
  );

  INSERT INTO public.aprendizajes (experimento_id, hipotesis, resultado, insights, validado, creado_en) VALUES
  (
    exp_precio,
    'Mostrar el plan Anual por defecto no afectarÃ¡ el volumen total de altas.',
    'El volumen de suscripciones BAJÃ“ un 15%, pero los ingresos (MRR) subieron un 40% gracias a los pagos anuales anticipados.',
    'El ticket mÃ¡s alto aleja leads de baja intenciÃ³n, pero filtra usuarios de alto LTV. Trade-off positivo a largo plazo.',
    false,
    NOW() - interval '29 days'
  );

END $$;
-- ============================================================
-- GROWTH BRAIN AI â€” Migration: Funnel Step en Experimentos
-- Instrucciones:
-- 1. Ve a Supabase > SQL Editor > New Query
-- 2. Pega este cÃ³digo y dale Run
-- ============================================================

-- Agregar columna funnel_step a experimentos
ALTER TABLE public.experimentos
ADD COLUMN IF NOT EXISTS funnel_step VARCHAR(50);

-- Los valores vÃ¡lidos son:
-- 'visitas' | 'datos_personales' | 'cotizaron' |
-- 'intencion_alta' | 'inicio_alta' | 'ingreso_portal' | 'cliente'
-- NULL = experimento no asociado a ningÃºn paso del funnel
-- ====================================================================================
-- GROWTH BRAIN AI - MEGA SEED DATA (30 EXPERIMENTOS + FUNNEL + MÃ‰TRICAS)
-- Instrucciones:
-- 1. Ve a https://supabase.com/dashboard > tu proyecto
-- 2. SQL Editor > New Query
-- 3. Pega este cÃ³digo completo y dale "Run"
-- ====================================================================================

-- Limpiar datos previos si lo deseas (opcional, comentar si no quieres borrar todo)
-- TRUNCATE public.experimentos CASCADE;

DO $$
DECLARE
  new_id UUID;
  i INT;
BEGIN

  -- 1. VISITAS A ARMATUPLAN (Paso 1)
  FOR i IN 1..5 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'OptimizaciÃ³n SEO Palabras Clave ' || i,
      'Prueba de meta-tags y contenido para mejorar el trÃ¡fico orgÃ¡nico desde Google en el sector seguros.',
      CASE WHEN i % 2 = 0 THEN 'en curso' ELSE 'finalizado' END,
      'visitas',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'Visitas a armatuplan', 14000 + (i * 200), NOW());
  END LOOP;

  -- 2. COMPLETÃ“ DATOS PERSONALES (Paso 2)
  FOR i IN 1..4 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'SimplificaciÃ³n Formulario Registro ' || i,
      'Eliminamos el campo de telÃ©fono opcional para reducir la fricciÃ³n inicial.',
      CASE WHEN i % 2 = 0 THEN 'en curso' ELSE 'planeado' END,
      'datos_personales',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'CompletÃ³ datos personales', 8000 + (i * 100), NOW());
  END LOOP;

  -- 3. COTIZARON (Paso 3)
  FOR i IN 1..5 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'Comparativa de Precios Visual ' || i,
      'Uso de tarjetas comparativas en lugar de lista para facilitar la cotizaciÃ³n rÃ¡pida.',
      CASE WHEN i % 3 = 0 THEN 'finalizado' WHEN i % 3 = 1 THEN 'en curso' ELSE 'planeado' END,
      'cotizaron',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'Cotizaron', 4000 + (i * 50), NOW());

    IF i % 2 = 0 THEN
      INSERT INTO public.aprendizajes (experimento_id, hipotesis, resultado, insights, validado)
      VALUES (new_id, 'El diseÃ±o en tarjetas es mÃ¡s intuitivo.', 'CTR subiÃ³ 12%', 'Los usuarios prefieren grid sobre list.', true);
    END IF;
  END LOOP;

  -- 4. INTENCIÃ“N DE ALTA (Paso 4)
  FOR i IN 1..4 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'BotÃ³n "Contratar Ahora" Sticky ' || i,
      'Mantener el CTA siempre visible en el scroll para fomentar la intenciÃ³n.',
      'en curso',
      'intencion_alta',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'IntenciÃ³n de Alta', 1800 + (i * 20), NOW());
  END LOOP;

  -- 5. INICIO DE ALTA (Paso 5)
  for i IN 1..4 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'EliminaciÃ³n de Pasos en Onboarding ' || i,
      'Unificar pantallas de carga de documentos para acelerar el inicio de alta.',
      CASE WHEN i % 2 = 0 THEN 'finalizado' ELSE 'planeado' END,
      'inicio_alta',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'Inicio de Alta', 900 + (i * 10), NOW());
  END LOOP;

  -- 6. INGRESO AL PORTAL (Paso 6)
  FOR i IN 1..4 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'Email de Bienvenida Automatizado ' || i,
      'EnvÃ­o automÃ¡tico de credenciales para reducir el tiempo hasta el primer ingreso.',
      'en curso',
      'ingreso_portal',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'Ingreso al portal', 620 + (i * 5), NOW());
  END LOOP;

  -- 7. CLIENTE (Paso 7)
  FOR i IN 1..4 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'PromociÃ³n Referral Program ' || i,
      'Incentivar a nuevos clientes a referir amigos con un mes gratis.',
      CASE WHEN i % 2 = 0 THEN 'finalizado' ELSE 'en curso' END,
      'cliente',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'Cliente', 400 + (i * 5), NOW());
    
    IF i = 1 THEN
      INSERT INTO public.aprendizajes (experimento_id, hipotesis, resultado, insights, validado)
      VALUES (new_id, 'Incentivar referral bajarÃ¡ el CAC.', 'CAC bajÃ³ $10', 'Funciona mejor en usuarios con > 2 meses.', true);
    END IF;
  END LOOP;

END $$;
