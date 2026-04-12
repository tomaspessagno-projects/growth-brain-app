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
      `Experimento: ${exp.nombre}
       Crecimiento esta semana: ${exp.delta_porcentaje}% (${exp.metrica_inicial} -> ${exp.metrica_actual})
       Resultado: ${exp.es_exito ? 'Éxito (Validado)' : 'En curso / Iterando'}
       Aprendizaje: ${exp.conclusion}`
    ).join('\n---\n');

    const prompt = `Actúa como un Consultor Estratégico de Crecimiento (Growth Consultant). 
Aquí tienes los resultados de la semana:

${experimentsText}

TAREA: Redacta un "Resumen Ejecutivo" formal y EXTREMADAMENTE CONCISO (máximo 120 palabras). 
Enfócate en la velocidad de experimentación ("Learning Velocity") y el impacto porcentual total en el funnel. 
Sé directo. Usa un tono ejecutivo de alto nivel. Sin markdown.`;

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
