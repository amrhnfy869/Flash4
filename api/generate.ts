import type { VercelRequest, VercelResponse } from "@vercel/node";

async function getGeminiResponse(parts: any[], modelName: string) {
  const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCScbL2jQ8a5PBmuF63C1rw4wuT15Qq5nI";
  const finalModelName = modelName === "gemini-flash-latest" || !modelName ? "gemini-1.5-flash" : modelName;

  const url = `https://generativelanguage.googleapis.com/v1/models/${finalModelName}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: parts.map(p => {
          if (p.inlineData) {
            return {
              inline_data: {
                mime_type: p.inlineData.mimeType,
                data: p.inlineData.data
              }
            };
          }
          return p;
        })
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("لم يتم استلام رد من الذكاء الاصطناعي");
  return text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { model: modelName, parts } = req.body;
    const text = await getGeminiResponse(parts, modelName);
    res.json({ text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let message = error.message || "فشل الاتصال بـ Gemini API";
    
    if (message.includes("API key not valid")) {
      message = "خطأ: مفتاح API غير صالح. يرجى التحقق من الإعدادات.";
    }
    
    res.status(500).json({ error: message });
  }
}
