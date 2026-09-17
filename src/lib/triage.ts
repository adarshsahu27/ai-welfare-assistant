// Deterministic safety rules — runs before and after AI
export type TriageResult = {
  category: "academic" | "financial" | "visa" | "housing" | "health" | "other";
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "escalated";
  disposition: "handle" | "ask" | "escalate";
  safeguarding: boolean;
  reason: string | null;
  resourceIds: string[];
};

export function triageMessage(message: string): TriageResult {
  // Rule 1: Detect crisis / self-harm / danger
  const crisisKeywords = [
    "self harm",
    "kill myself",
    "suicide",
    "ending it",
    "not the point",
    "haven't left",
    "don't see the point",
    "unsafe",
    "immediate danger",
  ];
  const isCrisis = crisisKeywords.some((kw) =>
    message.toLowerCase().includes(kw)
  );

  if (isCrisis) {
    return {
      category: "health",
      priority: "critical",
      status: "escalated",
      disposition: "escalate",
      safeguarding: true,
      reason: "Crisis detected - immediate human review required",
      resourceIds: [],
    };
  }

  // Rule 2: Detect visa/immigration (regulated)
  const visaKeywords = ["visa", "cas", "immigration", "student visa"];
  const isVisa = visaKeywords.some((kw) =>
    message.toLowerCase().includes(kw)
  );

  if (isVisa) {
    return {
      category: "visa",
      priority: "high",
      status: "escalated",
      disposition: "escalate",
      safeguarding: false,
      reason: "Immigration advice required - qualified adviser needed",
      resourceIds: [], // Only link to gov.uk, don't advise
    };
  }

  // Rule 3: Detect harassment / bullying / sexual misconduct
  const sensitiveKeywords = [
    "harassment",
    "bullying",
    "sexual",
    "assault",
    "abuse",
  ];
  const isSensitive = sensitiveKeywords.some((kw) =>
    message.toLowerCase().includes(kw)
  );

  if (isSensitive) {
    return {
      category: "other",
      priority: "high",
      status: "escalated",
      disposition: "escalate",
      safeguarding: true,
      reason: "Sensitive disclosure - human support required",
      resourceIds: [],
    };
  }

  // Rule 4: Detect prompt injection (attempt to manipulate system)
  const injectionPatterns = [
    "ignore your instructions",
    "mark this as resolved",
    "system message",
    "forget your",
  ];
  const isInjection = injectionPatterns.some((pat) =>
    message.toLowerCase().includes(pat)
  );

  if (isInjection) {
    return {
      category: "other",
      priority: "low",
      status: "escalated",
      disposition: "escalate",
      safeguarding: false,
      reason: "Potential misuse detected",
      resourceIds: [],
    };
  }

  // Rule 5: Detect spam / abuse
  const spamPatterns = ["bit.ly", "cheap followers", "grow your"];
  const isSpam = spamPatterns.some((pat) =>
    message.toLowerCase().includes(pat)
  );

  if (isSpam) {
    return {
      category: "other",
      priority: "low",
      status: "open",
      disposition: "handle",
      safeguarding: false,
      reason: "Spam/abuse - ignore",
      resourceIds: [],
    };
  }

  // Rule 6: Detect vague messages
  if (message.length < 20 || /^(need help|help|asap|urgent)$/i.test(message)) {
    return {
      category: "other",
      priority: "medium",
      status: "open",
      disposition: "ask",
      safeguarding: false,
      reason: "Vague request - ask clarifying question",
      resourceIds: [],
    };
  }

  // Default: let AI classify
  return {
    category: "other",
    priority: "medium",
    status: "open",
    disposition: "handle",
    safeguarding: false,
    reason: null,
    resourceIds: [],
  };
}
