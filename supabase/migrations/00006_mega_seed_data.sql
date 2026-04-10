-- ====================================================================================
-- GROWTH BRAIN AI - MEGA SEED DATA (30 EXPERIMENTOS + FUNNEL + MÉTRICAS)
-- Instrucciones:
-- 1. Ve a https://supabase.com/dashboard > tu proyecto
-- 2. SQL Editor > New Query
-- 3. Pega este código completo y dale "Run"
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
      'Optimización SEO Palabras Clave ' || i,
      'Prueba de meta-tags y contenido para mejorar el tráfico orgánico desde Google en el sector seguros.',
      CASE WHEN i % 2 = 0 THEN 'en curso' ELSE 'finalizado' END,
      'visitas',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'Visitas a armatuplan', 14000 + (i * 200), NOW());
  END LOOP;

  -- 2. COMPLETÓ DATOS PERSONALES (Paso 2)
  FOR i IN 1..4 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'Simplificación Formulario Registro ' || i,
      'Eliminamos el campo de teléfono opcional para reducir la fricción inicial.',
      CASE WHEN i % 2 = 0 THEN 'en curso' ELSE 'planeado' END,
      'datos_personales',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'Completó datos personales', 8000 + (i * 100), NOW());
  END LOOP;

  -- 3. COTIZARON (Paso 3)
  FOR i IN 1..5 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'Comparativa de Precios Visual ' || i,
      'Uso de tarjetas comparativas en lugar de lista para facilitar la cotización rápida.',
      CASE WHEN i % 3 = 0 THEN 'finalizado' WHEN i % 3 = 1 THEN 'en curso' ELSE 'planeado' END,
      'cotizaron',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'Cotizaron', 4000 + (i * 50), NOW());

    IF i % 2 = 0 THEN
      INSERT INTO public.aprendizajes (experimento_id, hipotesis, resultado, insights, validado)
      VALUES (new_id, 'El diseño en tarjetas es más intuitivo.', 'CTR subió 12%', 'Los usuarios prefieren grid sobre list.', true);
    END IF;
  END LOOP;

  -- 4. INTENCIÓN DE ALTA (Paso 4)
  FOR i IN 1..4 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'Botón "Contratar Ahora" Sticky ' || i,
      'Mantener el CTA siempre visible en el scroll para fomentar la intención.',
      'en curso',
      'intencion_alta',
      NOW() - (i || ' days')::interval,
      NOW() + (i || ' days')::interval
    ) RETURNING id INTO new_id;

    INSERT INTO public.metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro)
    VALUES (new_id, 'Intención de Alta', 1800 + (i * 20), NOW());
  END LOOP;

  -- 5. INICIO DE ALTA (Paso 5)
  for i IN 1..4 LOOP
    INSERT INTO public.experimentos (nombre, descripcion, estado, funnel_step, fecha_inicio, fecha_fin)
    VALUES (
      'Eliminación de Pasos en Onboarding ' || i,
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
      'Envío automático de credenciales para reducir el tiempo hasta el primer ingreso.',
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
      'Promoción Referral Program ' || i,
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
      VALUES (new_id, 'Incentivar referral bajará el CAC.', 'CAC bajó $10', 'Funciona mejor en usuarios con > 2 meses.', true);
    END IF;
  END LOOP;

END $$;
