import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { studentName, studentEmail } = await request.json();

    const conversation = await prisma.conversation.create({
      data: {
        studentName,
        studentEmail,
        status: "open",
        priority: "low",
      },
    });

    return NextResponse.json({ id: conversation.id });
  } catch (error) {
    console.error("POST /api/conversations error:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      include: { messages: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
