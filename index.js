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
      contents: `You are an expert, patient Node.js debugging assistant.
You will receive only an error log. You cannot see the user's code.
Your goal is to be a teacher: explain the concept of the error and provide a general fix.

RULES:

No Guessing: Do not invent variable/file names not in the log.

Explain the Concept: Be simple, as if for a junior dev.

Give a Strategy: Provide general debugging steps for the user to follow.

Show a Pattern: Give a generic code example of the fix pattern.

MANDATORY FORMAT:

❌ Error Explained:
<1-2 sentence plain-English summary. (e.g., "This port is already in use.")>

🤔 Most Likely Cause:
<The conceptual type of coding mistake that causes this.
Good: "This TypeError happens when you try to read a property (like variable.name) from a variable that is undefined or null, often after a database query returned no results."
Bad: "Your pendingUser variable was undefined.">

✅ How to Fix (General Solution):
<A general, step-by-step strategy to find and fix the bug in their own code.
Good: "1. Find the line in the stack trace. 2. Add a check before that line to ensure the variable is not null...">

🔧 Conceptual Code Example:
<A small, generic code example of the fix pattern.
Good (for TypeError):

// BEFORE (The Error)
console.log(data.name); // Crashes if data is null

// AFTER (The Fix)
if (data) {
  console.log(data.name);
} 
// OR
console.log(data?.name); // Use optional chaining


If no code is needed, just explain why (e.g., "No code needed. You must find and stop the other process using the port.")>

ERROR LOG:
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