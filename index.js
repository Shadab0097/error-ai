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
  const { errorMsg, code } = req.body;

  if (!errorMsg) {
    return res.status(400).json({ error: "errorMsg is required" });
  }

  console.log('...wait analyzing the error.')
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `You are a senior Node.js debugging assistant.

You will be given:
- ERROR LOG: text of the error
- FILE: (optional) code snippet from the file where the error happened
- PATH: file path and line number if available

Your job: explain the issue clearly, without guessing when unknown.

PRINCIPLES
- No assumptions. Only use info visible in the error/log/code.
- If code is NOT provided, do NOT invent variable/function/file names.
- If code IS provided, you may reference it.
- Keep language simple, like teaching a junior developer.
- Focus on education + actionable steps.
- Keep tokens low, answer only in required structure.

OUTPUT FORMAT (MANDATORY)

❌ Error Explained:
<Simple 1–2 sentence beginner-friendly summary.>

📂 Where It Happened:
<Path + line if given, else say "Not enough info to locate exact line">

🤔 Why It Happened:
<Root conceptual cause. If code shown, point to exact line. No guessing.>

✅ Fix Strategy:
<Short, realistic step-by-step debugging plan.>

🔧 Example Pattern:
<Generic fix pattern. If code shown, rewrite only the bugged line.>
<If code not needed say: “General fix pattern shown above.”>

📁 Context Check:
<1 sentence reminder about async, DB results, null checks etc.>

If uncertain, say:
"Not enough info to determine exact fix — follow strategy above to locate issue."

---

ERROR LOG:
${errorMsg}

FILE SNIPPET (if any):
${code}

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