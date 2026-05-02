import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("برجاء إضافة مفتاح الـ API في لوحة الـ Secrets باسم GEMINI_API_KEY");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
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
    const ai = getGenAI();
    
    const finalModelName = (modelName === "gemini-flash-latest" || !modelName) 
      ? "gemini-1.5-flash-latest" 
      : modelName;
    
    const model = ai.getGenerativeModel({ model: finalModelName });

    const resultPacket = await model.generateContent(parts);
    const response = await resultPacket.response;
    const text = response.text();

    if (!text) throw new Error("Empty response from AI");

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
