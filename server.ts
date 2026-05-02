import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Helper for lazy loading Gemini client
async function getGeminiResponse(parts: any[], modelName: string) {
  const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCScbL2jQ8a5PBmuF63C1rw4wuT15Qq5nI";
  const finalModelName = modelName === "gemini-flash-latest" || !modelName ? "gemini-1.5-flash" : modelName;

  // Use v1 instead of v1beta as requested
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

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

// API Proxy Route for Gemini AI
app.post("/api/generate", async (req, res) => {
  try {
    const { model: modelName, parts } = req.body;
    const text = await getGeminiResponse(parts, modelName);
    res.json({ text });
  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    let message = error.message || "فشل الاتصال بـ Gemini API";
    
    if (message.includes("API key not valid")) {
      message = "خطأ: مفتاح API غير صالح. يرجى التحقق من الإعدادات.";
    }
    
    res.status(500).json({ error: message });
  }
});

// Setup logic for serving frontend
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // If it's an API route that reached here, return 404 instead of index.html
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "API Route not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

// Check if we are in a serverless environment (like Vercel)
const isServerless = !!process.env.VERCEL;

if (!isServerless) {
  setupServer().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  });
} else {
  // On Vercel, setup middleware synchronously
  setupServer();
}

export default app;
