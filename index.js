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
      contents: `
You are a Node.js error analysis assistant.

Rules:
- Analyze ONLY the error text below — DO NOT GUESS.
- If the error does not explicitly say something, DO NOT assume it.
- Keep explanation short, simple, and EXACT.
- If meaning is unclear, say "The error message is incomplete".

Format reply exactly like this:

❌ Error:
<plain text error>

🤔 Why:
<real cause based ONLY on error text>

✅ Fix:
<real fix based ONLY on error text>

🔧 Example fix:
<if needed> (otherwise: "No code example needed")

---
ERROR LOG:
${errorMsg}
`



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