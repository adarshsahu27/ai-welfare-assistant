import { z } from "zod";

const ResponseSchema = z.object({
  message: z.string(),
  resourceIds: z.array(z.string()).default([]),
  needsHuman: z.boolean(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  reason: z.string().nullable(),
  followUpQuestion: z.string().nullable(),
});

export type AIResponse = z.infer<typeof ResponseSchema>;

const KNOWLEDGE_BASE = {
  "hardship-fund": {
    title: "University Hardship Fund",
    link: "/resources/hardship-fund",
  },
  "student-visa": {
    title: "Student Visa and CAS",
    link: "https://www.gov.uk/student-visa",
  },
  "deposit-guide": {
    title: "Tenancy Deposit Guide",
    link: "/resources/deposit-guide",
  },
  library: { title: "Academic Resources", link: "/resources/library" },
  "extenuating-circumstances": {
    title: "Extenuating Circumstances",
    link: "/resources/extenuating-circumstances",
  },
  "it-help": { title: "IT and Account Support", link: "/resources/it-help" },
  "disability-support": {
    title: "Disability and Additional Learning Support",
    link: "/resources/disability-support",
  },
  fees: { title: "Fees and Payment Plans", link: "/resources/fees" },
  careers: { title: "Careers and Part-Time Work", link: "/resources/careers" },
  wellbeing: {
    title: "Wellbeing and Counselling Service",
    link: "/resources/wellbeing",
  },
  "report-and-support": {
    title: "Reporting Harassment or Sexual Misconduct",
    link: "/resources/report-and-support",
  },
};

const systemPrompt = `You are a calm, helpful university welfare assistant.

Answer questions using ONLY these approved resources:

${Object.entries(KNOWLEDGE_BASE)
  .map(([id, r]) => `- ${id}: ${r.title}`)
  .join("\n")}

Rules:
1. Answer ONLY from approved resources.
2. Never invent facts or links.
3. Be warm, concise, and plain.
4. If you cannot answer from the approved resources, set needsHuman to true.
5. For visa questions, set needsHuman to true.
6. For crisis involving self-harm or suicide, set needsHuman to true and priority to "critical".
7. priority MUST be exactly one of: "low", "medium", "high", "critical".
8. resourceIds MUST contain only IDs from the approved resources.
9. reason can be null when escalation is not required.
10. followUpQuestion can be null when no follow-up is needed.

Return the response using the required JSON schema.`;

// PRIMARY: Gemini
async function callGemini(
  messages: Array<{ role: string; content: string }>
): Promise<AIResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
    apiKey;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                systemPrompt +
                "\n\n" +
                messages
                  .map((m) => `${m.role}: ${m.content}`)
                  .join("\n"),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini failed: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  const textContent =
    data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error("No Gemini response");
  }

 const parsed = JSON.parse(textContent);

console.log("Gemini raw response:");
console.dir(parsed, { depth: null });

return ResponseSchema.parse(parsed);
}


// FALLBACK: Groq
async function callGroq(
  messages: Array<{ role: string; content: string }>
): Promise<AIResponse> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY not set");
  }

  const url =
    "https://api.groq.com/openai/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },

    body: JSON.stringify({
      model: "openai/gpt-oss-120b",

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages,
      ],

      temperature: 0.7,

      max_tokens: 1000,

      response_format: {
        type: "json_schema",

        json_schema: {
          name: "welfare_assistant_response",

          strict: true,

          schema: {
            type: "object",

            properties: {
              message: {
                type: "string",
              },

              resourceIds: {
                type: "array",
                items: {
                  type: "string",
                },
              },

              needsHuman: {
                type: "boolean",
              },

              priority: {
                type: "string",
                enum: [
                  "low",
                  "medium",
                  "high",
                  "critical",
                ],
              },

              reason: {
                type: ["string", "null"],
              },

              followUpQuestion: {
                type: ["string", "null"],
              },
            },

            required: [
              "message",
              "resourceIds",
              "needsHuman",
              "priority",
              "reason",
              "followUpQuestion",
            ],

            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Groq failed: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  const textContent =
    data.choices?.[0]?.message?.content;

  if (!textContent) {
    throw new Error("No Groq response");
  }

  const parsed = JSON.parse(textContent);

  return ResponseSchema.parse(parsed);
}

export async function triageWithAI(
  studentMessage: string,
  conversationHistory: Array<{
    role: string;
    content: string;
  }>
): Promise<AIResponse> {
  const messages = [
    ...conversationHistory,
    {
      role: "user",
      content: studentMessage,
    },
  ];

  console.log("Attempting Gemini...");

  try {
    const result = await callGemini(messages);

    console.log("Gemini succeeded");

    return result;
  } catch (gError) {
    console.error("Gemini failed:", gError);

    console.log("Attempting Groq fallback...");

    try {
      const result = await callGroq(messages);

      console.log("Groq succeeded");

      return result;
    } catch (groqError) {
      console.error("Groq failed:", groqError);

      return {
        message:
          "I'm having trouble processing your request right now. A team member will follow up with you shortly.",
        resourceIds: [],
        needsHuman: true,
        priority: "medium",
        reason:
          "AI service unavailable - safe fallback escalation",
        followUpQuestion: null,
      };
    }
  }
}
