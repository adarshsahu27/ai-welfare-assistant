import { z } from "zod";

export const ResponseSchema = z.object({
  message: z.string(),
  resourceIds: z.array(z.string()).default([]),
  needsHuman: z.boolean(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  reason: z.string().nullable(),
  followUpQuestion: z.string().nullable(),
});

export type AIResponse = z.infer<typeof ResponseSchema>;

export const TriageSchema = z.object({
  category: z.enum(["academic", "financial", "visa", "housing", "health", "other"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "escalated"]),
  disposition: z.enum(["handle", "ask", "escalate"]),
  safeguarding: z.boolean(),
  reason: z.string().nullable(),
  resourceIds: z.array(z.string()).default([]),
});

export type TriageResult = z.infer<typeof TriageSchema>;
