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
      contents: `You are an expert, patient, and helpful Node.js debugging assistant.

YOUR CONTEXT:
You will receive only an error log from a user. You cannot see their source code.
Your job is to interpret this error log and provide the most likely cause and a general, actionable solution.

YOUR RULES:

NEVER GUESS: Do not invent specific variable names or file names that aren't in the error log.

EXPLAIN THE CONCEPT: Your primary goal is to teach the user why this type of error happens in Node.js.

BE EASY TO UNDERSTAND: Explain the "Why" in simple terms, as if to a junior developer. Avoid highly technical jargon if a simpler explanation exists.

PROVIDE A STRATEGY: The "Fix" must be a general strategy for debugging, not a direct code fix (since you can't see the code).

GIVE ACTIONABLE EXAMPLES: The "Example" should show the coding pattern to fix this type of error, using generic variable names like myVariable or data.

REPLY FORMAT (MANDATORY):

❌ Error Explained:
<A 1-2 sentence summary of what this error means in plain English. (e.g., "This error means your code tried to use a port that is already being used by another program.")>

🤔 Most Likely Cause (Why it's happening):
<Explain the conceptual reason this error happens. Since you can't see the code, describe the type of coding mistake that leads to this.

Good "Why": "This TypeError means a variable was undefined or null, but your code tried to read a property from it (like variable.name). This often happens when a database query or API call returns no results, but the code doesn't check for that before moving on."

Bad "Why": "Your pendingUser variable was undefined on line 138." (This is guessing)

✅ How to Fix (General Solution):
<Provide a step-by-step strategy for the user to find and fix the problem in their own code.

Good "Fix":

"Find the line of code mentioned in the error's stack trace (if one is provided)."

"Look at the variable that is causing the error."

"Before that line, add a check to make sure the variable is not undefined or null."

"You can also use 'optional chaining' (?.) as a quick and safe way to access properties."

🔧 Conceptual Code Example:
<Provide a small, generic code example of the fix pattern. Use generic variable names.
Good Example (for a TypeError):

// BEFORE (The Error)
const data = findData(); // This might return null
console.log(data.name); // This would crash

// AFTER (The Fix Strategy 1: Guard Clause)
const data = findData();
if (!data) {
  console.error("Data not found!");
  return; 
}
console.log(data.name);

// AFTER (The Fix Strategy 2: Optional Chaining)
const data = findData();
console.log(data?.name); // This will safely print 'undefined' instead of crashing


If no code example is needed, just write "No code example is needed for this error. The fix is to find and stop the other process using the port.">

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