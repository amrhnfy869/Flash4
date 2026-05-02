/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface GeminiContents {
  parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }>;
}

export const translateWithAI = async (model: string, contents: GeminiContents) => {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, contents }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "خطأ في الاتصال بالخادم.");
  }
  
  return await response.json();
};
