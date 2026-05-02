import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
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
let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
        // Fallback or explicit error
        throw new Error("GEMINI_API_KEY is not defined. Please add it to your environment variables.");
    }
    // @ts-ignore
    genAI = new GoogleGenAI(apiKey);
  }
  return genAI;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

// API Proxy Route for Gemini AI
app.post("/api/generate", async (req, res) => {
  try {
    const { model: modelName, parts } = req.body;
    const ai = getGenAI();
    
    // Use gemini-1.5-flash as the standard stable model
    const finalModelName = (modelName === "gemini-flash-latest" || !modelName) 
      ? "gemini-1.5-flash" 
      : modelName;
    
    // @ts-ignore
    const model = ai.getGenerativeModel({ model: finalModelName });

    const resultPacket = await model.generateContent(parts);
    const response = await resultPacket.response;
    const text = response.text();

    if (!text) throw new Error("Empty response from AI");

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
      if (req.url.startsWith("/api/")) return;
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

async function startServer() {
  await setupServer();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();

export default app;
