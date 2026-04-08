-- Fix para permitir la inserción, edición y eliminación de registros 
-- ya que la Política inicial solo permitía la "Lectura" (SELECT)

-- Políticas para 'experimentos'
CREATE POLICY "Permitir escritura en experimentos" ON public.experimentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion en experimentos" ON public.experimentos FOR UPDATE USING (true);
CREATE POLICY "Permitir borrado en experimentos" ON public.experimentos FOR DELETE USING (true);

-- Políticas para 'metricas_snapshots'
CREATE POLICY "Permitir escritura en metricas" ON public.metricas_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion en metricas" ON public.metricas_snapshots FOR UPDATE USING (true);
CREATE POLICY "Permitir borrado en metricas" ON public.metricas_snapshots FOR DELETE USING (true);

-- Políticas para 'aprendizajes'
CREATE POLICY "Permitir escritura en aprendizajes" ON public.aprendizajes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion en aprendizajes" ON public.aprendizajes FOR UPDATE USING (true);
CREATE POLICY "Permitir borrado en aprendizajes" ON public.aprendizajes FOR DELETE USING (true);
