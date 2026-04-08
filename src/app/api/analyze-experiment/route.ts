import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Instanciar el SDK de Gemini. Usa proces.env.GEMINI_API_KEY por defecto si no le pasamos api_key explicitamente.
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Falta configurar GEMINI_API_KEY en el archivo .env.local' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { experiment, metrics } = body;

    // Validación básica
    if (!experiment) {
      return NextResponse.json({ error: 'Faltan datos del experimento' }, { status: 400 });
    }

    // Diseñamos el Prompt "Experto" para la IA
    const prompt = `Actúa como un Analista de Crecimiento (Growth Data Scientist) Senior.
Hoy voy a darte los datos de un experimento de producto y las métricas que recolectamos.

OBJETIVO:
Tu tarea es leer la descripción del experimento y los valores de las métricas registradas, y devolver una conclusión estructurada. 
Si ves métricas que mejoran, indica éxito y explica por qué. Si ves métricas bajas, sugiere razones y próximos pasos.

DATOS DEL EXPERIMENTO:
- Nombre: ${experiment.nombre}
- Hipótesis/Descripción planificada: ${experiment.descripcion || 'Sin descripción provista.'}
- Estado actual: ${experiment.estado}

MÉTRICAS REPORTADAS:
${metrics.length === 0 
  ? 'No hay métricas reportadas aún. Por favor extrae posibles casos de éxito/fracaso basandote solo en la lógica del experimento.' 
  : metrics.map((m: any) => `- Fecha: ${m.fecha_registro.split('T')[0]}, Métrica: ${m.nombre_metrica}, Valor: ${m.valor}`).join('\n')}

Por favor, devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura y llaves exactas:
{
  "hipotesisSugerida": "Una breve reformulación a una línea de la hipótesis central que tenía este experimento.",
  "resultadoObservado": "Tu análisis de lo que sucedió exactamente basado matemáticamente en las métricas (o que no hay suficientes). Usa porcentajes y tendencias si hay.",
  "insightsClave": "Tu conclusión directiva sobre 'por qué' pasó esto y qué debería hacer yo al respecto en el producto.",
  "hipotesisAparentementeValidada": boolean (true/false)
}
No devuelvas Markdown (\`\`\`json) ni texto fuera del JSON, solo el objeto parseable directo.
`;

    // Realizar la llamada a Gemini 2.5 Pro usando el nuevo SDK @google/genai
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash es increíblemente rápido y suficiente para análisis básicos, se puede cambiar a gemini-2.5-pro
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const aiText = response.text || "{}";
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiText);
    } catch (err) {
      // Si la IA rompió el JSON, intentar parsearlo limpiando posibles backticks
      const cleaned = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResponse = JSON.parse(cleaned);
    }

    return NextResponse.json({
      success: true,
      analysis: parsedResponse
    });

  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud a la IA', details: error.message },
      { status: 500 }
    );
  }
}
