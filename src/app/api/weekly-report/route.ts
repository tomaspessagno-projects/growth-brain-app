import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta GEMINI_API_KEY en .env.local' }, { status: 500 });
    }

    const { experiments } = await req.json();

    if (!experiments || experiments.length === 0) {
      return NextResponse.json({ summary: "No hubo experimentos activos reportados en los últimos 7 días." });
    }

    const experimentsText = experiments.map((exp: any) => 
      `Experimento: ${exp.nombre} | Estado: ${exp.estado}
       Hipótesis: ${exp.descripcion}
       Métricas registradas esta semana: ${exp.metricas_snapshots?.length || 0}
       Aprendizajes totales: ${exp.aprendizajes?.length || 0}`
    ).join('\n---\n');

    const prompt = `Actúa como un Consultor Estratégico de Crecimiento (Growth Consultant). 
Aquí tienes un resumen en bruto de los experimentos realizados por el equipo en los últimos 7 días:

${experimentsText}

TAREA: Redacta un "Resumen Ejecutivo" formal en idioma Español dirigido a Inversores o Nivel C (Gerentes).
Debe tener máximo 3 párrafos. Destaca qué estuvimos testeando esta semana, cómo afectó en nuestras métricas y si logramos algún aprendizaje valioso. Sé profesional, directo y alentador. 
No repitas nombres de variables técnicas. Simplemente redacta el texto sin símbolos raros ni markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({
      summary: response.text || "Resumen ejecutivo no disponible."
    });

  } catch (error: any) {
    console.error("Gemini Weekly Error:", error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud a la IA', details: error.message },
      { status: 500 }
    );
  }
}
