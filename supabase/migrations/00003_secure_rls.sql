-- Activar la política "Solo Usuarios Autenticados" en vez de a TODO el mundo.

-- 1. Eliminamos las politicas temporales viejas del archivo 00002_rls_policies.sql
DROP POLICY IF EXISTS "Permitir escritura en experimentos" ON public.experimentos;
DROP POLICY IF EXISTS "Permitir actualizacion en experimentos" ON public.experimentos;
DROP POLICY IF EXISTS "Permitir borrado en experimentos" ON public.experimentos;
DROP POLICY IF EXISTS "Experimentos legibles por todos" ON public.experimentos;

DROP POLICY IF EXISTS "Permitir escritura en metricas" ON public.metricas_snapshots;
DROP POLICY IF EXISTS "Permitir actualizacion en metricas" ON public.metricas_snapshots;
DROP POLICY IF EXISTS "Permitir borrado en metricas" ON public.metricas_snapshots;
DROP POLICY IF EXISTS "Métricas legibles por todos" ON public.metricas_snapshots;

DROP POLICY IF EXISTS "Permitir escritura en aprendizajes" ON public.aprendizajes;
DROP POLICY IF EXISTS "Permitir actualizacion en aprendizajes" ON public.aprendizajes;
DROP POLICY IF EXISTS "Permitir borrado en aprendizajes" ON public.aprendizajes;
DROP POLICY IF EXISTS "Aprendizajes legibles por todos" ON public.aprendizajes;


-- 2. Creamos Políticas Inteligentes Globales (Solo Autenticados)
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
