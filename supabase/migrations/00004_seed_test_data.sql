-- ====================================================================================
-- GROWTH BRAIN AI - TEST SEED DATA (CORREGIDO)
-- Instrucciones:
-- 1. Ve a https://supabase.com/dashboard > tu proyecto
-- 2. SQL Editor > New Query
-- 3. Pega este código completo y dale "Run"
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
  -- Estados válidos: 'planeado' | 'en curso' | 'finalizado'
  -- -------------------------------------------------------

  INSERT INTO public.experimentos (nombre, descripcion, estado, fecha_inicio, fecha_fin)
  VALUES (
    'Rediseño del Hero Section de la Landing',
    'Cambiamos la imagen estática del hero por un video corto de 15s para aumentar el CTR hacia Pricing.',
    'finalizado',
    NOW() - interval '30 days',
    NOW() - interval '15 days'
  ) RETURNING id INTO exp_landing;

  INSERT INTO public.experimentos (nombre, descripcion, estado, fecha_inicio, fecha_fin)
  VALUES (
    'Fricción en Onboarding (Social Login)',
    'Implementación de autenticación Social mediante Google y Microsoft para saltar la verificación por email.',
    'en curso',
    NOW() - interval '5 days',
    NOW() + interval '9 days'
  ) RETURNING id INTO exp_social;

  INSERT INTO public.experimentos (nombre, descripcion, estado, fecha_inicio, fecha_fin)
  VALUES (
    'Notificaciones Push de Retención',
    'Configurar Firebase Cloud Messaging para avisar a usuarios inactivos tras 3 días sobre promociones.',
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
  -- 2. MÉTRICAS SNAPSHOTS
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
    'El video de 15s aumentará el CTR al Pricing un 20%.',
    'El CTR pasó del 5.2% al 8.9% — un aumento relativo del 70%. El video fue reproducido por el 40% de las visitas únicas.',
    'Los usuarios tienen pereza de leer copy largo. Video animado de demostración impacta drásticamente la conversión B2B.',
    true,
    NOW() - interval '14 days'
  );

  INSERT INTO public.aprendizajes (experimento_id, hipotesis, resultado, insights, validado, creado_en) VALUES
  (
    exp_precio,
    'Mostrar el plan Anual por defecto no afectará el volumen total de altas.',
    'El volumen de suscripciones BAJÓ un 15%, pero los ingresos (MRR) subieron un 40% gracias a los pagos anuales anticipados.',
    'El ticket más alto aleja leads de baja intención, pero filtra usuarios de alto LTV. Trade-off positivo a largo plazo.',
    false,
    NOW() - interval '29 days'
  );

END $$;
