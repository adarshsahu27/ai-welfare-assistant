import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}
