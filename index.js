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

  const controller = new AbortController()

  req.on('close', () => {
    console.log('aborting ai request')
    controller.abort()
  })

  if (!errorMsg) {
    return res.status(400).json({ error: "errorMsg is required" });
  }

  console.log('...wait analyzing the error.')
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash-lite",
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

`,
      signal: controller.signal

    });

    const candidateText =
      response.text ||
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    const cleanedText = cleanGeminiResponse(candidateText);
    console.log("\n🤖 Gemini Explanation:");

    if (res.headersSent) {
      console.log('Response was already sent or client disconnected.');
      return;
    }

    res.json({ text: cleanedText });
  } catch (e) {
    if (e.name === 'AbortError') {
      console.log('AI request was successfully aborted.');
      // Don't send a response, the client is already gone.
      return;
    }
    console.error("FATAL SERVER ERROR:", e);


    const friendlyErrorText = `❌ Error: The AI analysis server failed.

🤔 Why: An unexpected error occurred on the server: ${e.message}

✅ Fix: Please try again. If it continues, the server may be down or experiencing high traffic.`;

    // Send the error in the format your client expects
    res.status(500).json({ text: friendlyErrorText });
  }
}
)

app.get('/', (req, res) => {
  res.send('Download error-ai-cli fron npm😁!');
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const shutdown = () => {
  console.log('Shutdown signal received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0); // Exit the process
  });
};

// Listen for signals that nodemon/Ctrl+C use
process.on('SIGINT', shutdown); // Ctrl+C in terminal
process.on('SIGTERM', shutdown); // 'kill' command or nodemon restart






