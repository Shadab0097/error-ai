const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenAI } = require("@google/genai");
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
app.use(express.json());
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

function cleanGeminiResponse(text) {
  return text
    // Remove starting fences like ```json or ``` (with optional spaces/newlines)
    .replace(/^```(?:json)?\s*/i, "")
    // Remove trailing ```
    .replace(/```$/i, "")
    .trim();
}

app.post('/analyze', async (req, res) => {
  const { errorMsg } = req.body;

  if (!errorMsg) {
    return res.status(400).json({ error: "errorMsg is required" });
  }

  console.log('...wait analyzing the error.')
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `You are a friendly coding assistant. I will give you an error from Node.js. 

Your job:
1. Explain what the error means in very simple language (like explaining to a beginner)
2. Tell why this error happened
3. Show how to fix it with a small example
4. Keep the explanation short and easy to understand

Here is the error:
${errorMsg}`

    });

    const candidateText =
      response.text ||
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    const cleanedText = cleanGeminiResponse(candidateText);
    console.log("\n🤖 Gemini Explanation:");


    res.json({ text: cleanedText });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
)

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});