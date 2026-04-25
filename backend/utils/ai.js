import { createAgent, gemini } from "@inngest/agent-kit";

const analyzeTicket = async (ticket) => {
  const agent = createAgent({
    model: gemini({
      model: "gemini-1.5-flash-8b",
      apiKey: process.env.GEMINI_API_KEY,
    }),
    name: "Ticket Triage Assistant",
    system: `
You are an AI that analyzes support tickets.

Return ONLY valid raw JSON (no markdown, no extra text).

Format:
{
  "summary": "string",
  "priority": "low | medium | high",
  "helpfulNotes": "string",
  "relatedSkills": ["string"]
}
`,
  });

  const response = await agent.run(`
Analyze this ticket:

Title: ${ticket.title}
Description: ${ticket.description}
`);

  // safer extraction
  const raw = response?.output?.[0]?.content || "";

  let parsed;

  try {
    parsed = JSON.parse(raw.trim());
  } catch (e) {
    console.error("AI JSON parse failed:", raw);

    // fallback safe output
    return {
      summary: ticket.title,
      priority: "medium",
      helpfulNotes: "AI parsing failed. Manual review required.",
      relatedSkills: []
    };
  }

  // validation layer
  const validPriorities = ["low", "medium", "high"];

  return {
    summary: parsed.summary || ticket.title,

    priority: validPriorities.includes(parsed.priority)
      ? parsed.priority
      : "medium",

    helpfulNotes: parsed.helpfulNotes || "",

    relatedSkills: Array.isArray(parsed.relatedSkills)
      ? parsed.relatedSkills.map(s => s.toLowerCase().trim())
      : []
  };
};

export default analyzeTicket;