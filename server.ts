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
        throw new Error("GEMINI_API_KEY is not defined in environment secrets.");
      }
      // @ts-ignore - The SDK types can be tricky depending on the environment
      genAI = new GoogleGenAI(apiKey);
    }
    return genAI;
  }

  // API Proxy Route for Gemini AI
  app.post("/api/generate", async (req, res) => {
    try {
      const { model: modelName, parts } = req.body;
      const ai = getGenAI();
      // @ts-ignore
      const model = ai.getGenerativeModel({ model: modelName || "gemini-1.5-flash" });

      const resultPacket = await model.generateContent(parts);
      const response = await resultPacket.response;
      const text = response.text();

      res.json({ text });
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      res.status(500).json({ error: error.message || "فشل الاتصال بـ Gemini API عبر الخادم" });
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
