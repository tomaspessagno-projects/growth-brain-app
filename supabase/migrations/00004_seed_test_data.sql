-- ====================================================================================
-- GROWTH BRAIN AI - TEST SEED DATA
-- Instrucciones de uso:
-- 1. Ve a tu panel de Supabase (https://supabase.com/dashboard)
-- 2. Entra a tu proyecto "Growth Brain App"
-- 3. Ve a la pestaña "SQL Editor" en la barra lateral izquierda
-- 4. Abre una "New Query" (Nueva Consulta), pega todo este código y dale "Run".
-- ====================================================================================

-- 1. Crear Experimentos Ficticios
INSERT INTO experimentos (nombre, descripcion, hipotesis_inicial, estado, fecha_inicio, fecha_fin)
VALUES 
('Rediseño del Hero Section de la Landing', 
 'Cambiamos la imagen estática del hero por un video corto explicando el SaaS en 15 segundos para aumentar el CTR hacia Pricing.', 
 'Si reemplazamos la imagen genérica por un micro-video de 15s de demostración, entonces la tasa de conversión a la pantalla de "Pricing" aumentará un 20% porque el usuario comprenderá el valor inmediatamente.', 
 'Finalizado', 
 current_date - interval '30 days', 
 current_date - interval '15 days'),

('Fricción en Onboarding (Social Login)', 
 'Implementación de autenticación Social mediante Google y Microsoft para saltar el proceso de verificación por email.', 
 'Si habilitamos Social Login (Google/Microsoft), la tasa de abandono durante la pantalla de registro bajará un 30% al reducir los campos obligatorios de 4 a 1.', 
 'En Curso', 
 current_date - interval '5 days', 
 current_date + interval '9 days'),

('Notificaciones Push de Retención', 
 'Configurar Firebase Cloud Messaging para avisar a los usuarios inactivos tras 3 días sobre promociones especiales.', 
 'Si enviamos un correo/notificación transaccional al 3er día de inactividad, reactivaremos al 10% de la cohorte.', 
 'Planeado', 
 current_date + interval '2 days', 
 current_date + interval '12 days'),

('Prueba Precio Anual vs Mensual Default', 
 'Modificar el switch de precios para que por defecto esté seleccionado "Plan Anual" con descuento en lugar de "Mensual".', 
 'Si mostramos el plan Anual por defecto rebajando un 20%, el Life Time Value (LTV) promedio aumentará sin afectar el número total de suscripciones nuevas.', 
 'Finalizado', 
 current_date - interval '45 days', 
 current_date - interval '30 days');

-- NOTA: Para insertar dependencias, necesitamos capturar los IDs de los experimentos creados recién.
-- Como son generados por Supabase (UUID o BigInt), vamos a crear un bloque DO anónimo temporal
-- para asignar las métricas y los aprendizajes correctamente.

DO $$
DECLARE
  exp_landing bigint;
  exp_social bigint;
  exp_precio bigint;
BEGIN
  -- Obtener los IDs guardándolos en variables
  SELECT id INTO exp_landing FROM experimentos WHERE nombre = 'Rediseño del Hero Section de la Landing' LIMIT 1;
  SELECT id INTO exp_social FROM experimentos WHERE nombre = 'Fricción en Onboarding (Social Login)' LIMIT 1;
  SELECT id INTO exp_precio FROM experimentos WHERE nombre = 'Prueba Precio Anual vs Mensual Default' LIMIT 1;

  -- 2. Insertar Métricas (Snapshots de línea de tiempo)
  
  -- Métricas de Landing Page (Finalizado)
  INSERT INTO metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro) VALUES 
  (exp_landing, 'CTR Pricing', 5.2, current_date - interval '30 days'),
  (exp_landing, 'CTR Pricing', 6.1, current_date - interval '25 days'),
  (exp_landing, 'CTR Pricing', 7.4, current_date - interval '20 days'),
  (exp_landing, 'CTR Pricing', 8.9, current_date - interval '15 days');
  
  -- Métricas Social Login (En Curso)
  INSERT INTO metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro) VALUES 
  (exp_social, 'Drop-off Rate', 42.0, current_date - interval '5 days'),
  (exp_social, 'Drop-off Rate', 35.5, current_date - interval '3 days'),
  (exp_social, 'Drop-off Rate', 28.1, current_date - interval '1 days');

  -- Métricas Precio Anual (Finalizado)
  INSERT INTO metricas_snapshots (experimento_id, nombre_metrica, valor, fecha_registro) VALUES 
  (exp_precio, 'ARPU (USD)', 15.0, current_date - interval '45 days'),
  (exp_precio, 'ARPU (USD)', 18.5, current_date - interval '38 days'),
  (exp_precio, 'ARPU (USD)', 22.4, current_date - interval '30 days');

  -- 3. Insertar Aprendizajes

  INSERT INTO aprendizajes (experimento_id, hipotesis, resultado, insights, validado, creado_en) VALUES
  (exp_landing, 
   'El video de 15s aumentará el CTR al Pricing un 20%.', 
   'El CTR pasó del 5.2% al 8.9% absoluto (un aumento relativo del 70%). El video fue reproducido por el 40% de las visitas únicas.', 
   'Los usuarios realmente tienen pereza de leer. Sustituir copy largo por video animado impacta drásticamente la conversión B2B.', 
   true, 
   current_date - interval '14 days');

  INSERT INTO aprendizajes (experimento_id, hipotesis, resultado, insights, validado, creado_en) VALUES
  (exp_precio, 
   'Mostrar el plan Anual por defecto no afectará el volumen de altas.', 
   'El volumen de suscripciones totales BAJÓ un 15%, pero los ingresos totales (MRR contraído) subieron un 40% gracias a los pagos anuales anticipados.', 
   'El ticket inicial asusta a los leads de baja intención de compra (fricción), pero filtra efectivamente a usuarios retenidos de alto LTV.', 
   false, 
   current_date - interval '29 days');

END $$;
