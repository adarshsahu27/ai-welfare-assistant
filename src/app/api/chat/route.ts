import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { triageMessage } from "@/lib/triage";
import { triageWithAI } from "@/lib/ai";

const KNOWLEDGE_BASE = {
  "hardship-fund": { title: "University Hardship Fund", url: "/resources/hardship-fund" },
  "student-visa": { title: "Student Visa and CAS", url: "https://www.gov.uk/student-visa" },
  "deposit-guide": { title: "Tenancy Deposit Guide", url: "/resources/deposit-guide" },
  "library": { title: "Academic Resources", url: "/resources/library" },
  "extenuating-circumstances": { title: "Extenuating Circumstances", url: "/resources/extenuating-circumstances" },
  "it-help": { title: "IT and Account Support", url: "/resources/it-help" },
  "disability-support": { title: "Disability and Additional Learning Support", url: "/resources/disability-support" },
  "fees": { title: "Fees and Payment Plans", url: "/resources/fees" },
  "careers": { title: "Careers and Part-Time Work", url: "/resources/careers" },
  "wellbeing": { title: "Wellbeing and Counselling Service", url: "/resources/wellbeing" },
  "report-and-support": { title: "Reporting Harassment or Sexual Misconduct", url: "/resources/report-and-support" },
};

export async function POST(request: NextRequest) {
  try {
    const { conversationId, message, history } = await request.json();

    // Save user message
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: message,
      },
    });

    // Run deterministic triage
    const deterministicTriage = triageMessage(message);

    // If crisis or dangerous, escalate immediately
    if (deterministicTriage.safeguarding || deterministicTriage.status === "escalated") {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: "escalated",
          priority: deterministicTriage.priority,
          safeguarding: deterministicTriage.safeguarding,
          escalationReason: deterministicTriage.reason,
          category: deterministicTriage.category,
        },
      });

      const response = `Thank you for reaching out. Your request needs immediate attention from our team. They will follow up with you shortly.`;

      await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: response,
          triageResult: deterministicTriage,
        },
      });

      return NextResponse.json({
        response,
        escalated: true,
        escalationReason: deterministicTriage.reason,
        resourceLinks: [],
      });
    }

    // If spam
    if (deterministicTriage.reason === "Spam/abuse - ignore") {
      return NextResponse.json({
        response: "I'm here to help with genuine student support enquiries.",
        escalated: false,
        resourceLinks: [],
      });
    }

    // If vague, ask clarifying question
    if (deterministicTriage.disposition === "ask") {
      const clarifyingQuestion = "Could you tell me a bit more about what you need help with?";

      await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: clarifyingQuestion,
          triageResult: deterministicTriage,
        },
      });

      return NextResponse.json({
        response: clarifyingQuestion,
        escalated: false,
        resourceLinks: [],
      });
    }

    // Call AI
    const aiResponse = await triageWithAI(message, history);

    if (aiResponse.needsHuman) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: "escalated",
          priority: aiResponse.priority,
          escalationReason: aiResponse.reason,
          category: deterministicTriage.category,
        },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          priority: aiResponse.priority,
          category: deterministicTriage.category,
        },
      });
    }

    await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: aiResponse.message,
        resourceIds: aiResponse.resourceIds,
        triageResult: { ...deterministicTriage, priority: aiResponse.priority },
      },
    });

    const resourceLinks = aiResponse.resourceIds
      .map((id: string) => {
        const kb = KNOWLEDGE_BASE[id as keyof typeof KNOWLEDGE_BASE];
        return kb ? { id, title: kb.title, url: kb.url } : null;
      })
      .filter(Boolean);

    return NextResponse.json({
      response: aiResponse.message,
      resourceLinks,
      escalated: aiResponse.needsHuman,
      escalationReason: aiResponse.reason,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
