import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ExtractedFields {
  cif?: string;
  loanNumber?: string;
  account?: string;
  fullName?: string;
  dpi?: string;
  loanAmount?: string;
  fieldsFound: string[];
  fieldsNotFound: string[];
  confidence: Record<string, number>;
}

export async function extractDataFromImage(base64Image: string): Promise<ExtractedFields> {
  try {
    const systemPrompt = `Eres un experto en análisis de documentos financieros. Tu tarea es extraer información específica de documentos de préstamos en español.

Analiza la imagen y extrae los siguientes campos si están presentes:
1. CIF (Código de Identificación Fiscal)
2. Nro. Préstamo (Número de Préstamo)
3. Cuenta (Número de Cuenta)
4. Nombre Apellido (Nombre completo del cliente)
5. Nro. DPI (Número de Documento Personal de Identificación)
6. Monto del préstamo (Cantidad del préstamo)

Instrucciones:
- Solo extrae información que esté claramente visible en el documento
- Si un campo no está presente o no es legible, déjalo como null
- Proporciona un nivel de confianza (0-100) para cada campo extraído
- Lista los campos encontrados y no encontrados

Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto:
{
  "cif": "valor o null",
  "loanNumber": "valor o null", 
  "account": "valor o null",
  "fullName": "valor o null",
  "dpi": "valor o null",
  "loanAmount": "valor o null",
  "fieldsFound": ["lista de campos encontrados"],
  "fieldsNotFound": ["lista de campos no encontrados"],
  "confidence": {
    "cif": 95,
    "loanNumber": 88
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analiza este documento y extrae los campos solicitados."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and clean the response
    const extractedData: ExtractedFields = {
      cif: result.cif || undefined,
      loanNumber: result.loanNumber || undefined,
      account: result.account || undefined,
      fullName: result.fullName || undefined,
      dpi: result.dpi || undefined,
      loanAmount: result.loanAmount || undefined,
      fieldsFound: Array.isArray(result.fieldsFound) ? result.fieldsFound : [],
      fieldsNotFound: Array.isArray(result.fieldsNotFound) ? result.fieldsNotFound : [],
      confidence: result.confidence || {},
    };

    return extractedData;
  } catch (error) {
    console.error('Error extracting data from image:', error);
    throw new Error(`Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
