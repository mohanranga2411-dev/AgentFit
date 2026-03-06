import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { CohereClient } from "cohere-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

app.post("/generate-workout", async (req, res) => {
  try {
    const { age, weight, height, goal, adjustment } = req.body;

    let adjustmentText = "";
    if (adjustment === "increase") {
      adjustmentText = "User said workout was TOO EASY. Safely increase intensity by 1 level.";
    } else if (adjustment === "decrease") {
      adjustmentText = "User said workout was TOO HARD. Safely decrease intensity by 1 level.";
    }

    const prompt = `
You are AgentFit AI gym trainer.

User Data:
Age: ${age}
Weight: ${weight} kg
Height: ${height} cm
Goal: ${goal}

Tasks:
1. Calculate BMI.
2. Calculate BMR using Mifflin-St Jeor formula (assume male).
3. Estimate TDEE (activity multiplier 1.55).
4. Decide safe training intensity (1-10).
5. Generate exactly 4 exercises with sets and reps.
${adjustmentText}

IMPORTANT:
Return ONLY valid JSON.
No explanation.
No markdown.

Format:
{
  "bmi": number,
  "bmr": number,
  "tdee": number,
  "intensity": number,
  "workout": [
    {
      "name": "Exercise name",
      "sets": number,
      "reps": "string"
    }
  ]
}
`;

    const response = await cohere.chat({
      model: "command-a-03-2025",
      message: prompt,
      temperature: 0.3,
    });

const content = response.text;

// Extract JSON safely
const jsonMatch = content.match(/\{[\s\S]*\}/);

if (!jsonMatch) {
  throw new Error("No JSON found in response");
}

const parsed = JSON.parse(jsonMatch[0]);

res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate workout" });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});