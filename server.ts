import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json({ limit: "20mb" }));

  // Helper for lazy loading Gemini client
  let genAI: GoogleGenAI | null = null;
  
  function getGenAI() {
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY || "AIzaSyATOY16mBdvpYRVuXwvGNp6k3OgFS5N4Jg";
      if (!apiKey || apiKey === "undefined") {
        throw new Error("GEMINI_API_KEY is not defined. Please add it to the Secrets panel.");
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
    console.log("Processing Generation Request...");
    try {
      const { model: modelName, parts } = req.body;
      const ai = getGenAI();
      
      // Map 'gemini-flash-latest' to 'gemini-1.5-flash'
      const finalModelName = (modelName === "gemini-flash-latest") ? "gemini-1.5-flash" : (modelName || "gemini-1.5-flash");
      
      // @ts-ignore
      const model = ai.getGenerativeModel({ model: finalModelName });

      const resultPacket = await model.generateContent(parts);
      const response = await resultPacket.response;
      const text = response.text();

      res.json({ text });
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      let message = error.message || "فشل الاتصال بـ Gemini API عبر الخادم";
      
      if (message.includes("leaked")) {
        message = "عذراً، مفتاح API هذا تم الإبلاغ عن تسريبه وهو غير صالح الآن. يرجى إنشاء مفتاح جديد من Google AI Studio ووضعه في إعدادات البيئة (Secrets).";
      }
      
      res.status(500).json({ error: message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
