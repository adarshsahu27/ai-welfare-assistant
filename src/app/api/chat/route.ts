import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { triageMessage } from "@/lib/triage";
import { triageWithAI } from "@/lib/ai";
import { KNOWLEDGE_BASE } from "@/lib/resources";

export async function POST(request: NextRequest) {
  try {
    const { conversationId, message, history } = await request.json();

    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: message,
      },
    });

    const deterministicTriage = triageMessage(message);

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

    if (deterministicTriage.reason === "Spam/abuse - ignore") {
      return NextResponse.json({
        response: "I'm here to help with genuine student support enquiries.",
        escalated: false,
        resourceLinks: [],
      });
    }

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

    // Map resourceIds to full resource objects
    const resourceLinks = aiResponse.resourceIds
      .map((id: string) => {
        const resource = KNOWLEDGE_BASE[id as keyof typeof KNOWLEDGE_BASE];
        return resource ? { id, title: resource.title, url: resource.link } : null;
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
