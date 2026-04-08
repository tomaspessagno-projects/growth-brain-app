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

-- 2. Tabla de Métricas (Snapshots)
CREATE TABLE IF NOT EXISTS public.metricas_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    experimento_id UUID REFERENCES public.experimentos(id) ON DELETE CASCADE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nombre_metrica VARCHAR(255) NOT NULL,
    valor NUMERIC NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en Métricas
ALTER TABLE public.metricas_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Métricas legibles por todos" ON public.metricas_snapshots FOR SELECT USING (true);


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
