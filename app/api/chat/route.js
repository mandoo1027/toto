import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// 채팅 메시지 조회 (폴링)
// ?after=<id> 로 해당 id 이후 메시지만 받음
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const after = parseInt(searchParams.get("after") || "0", 10);

  let messages;
  if (after > 0) {
    messages = await prisma.chatMessage.findMany({
      where: { id: { gt: after } },
      orderBy: { id: "asc" },
      take: 100,
    });
  } else {
    // 최초 로드: 최근 50개를 시간순으로
    const recent = await prisma.chatMessage.findMany({
      orderBy: { id: "desc" },
      take: 50,
    });
    messages = recent.reverse();
  }

  const data = messages.map((m) => ({
    id: m.id,
    nickname: m.nickname,
    message: m.message,
    createdAt: m.createdAt.toISOString(),
  }));

  return NextResponse.json({ messages: data });
}

// 채팅 메시지 전송
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { message } = await req.json();
  const text = (message || "").trim();

  if (!text) {
    return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }
  if (text.length > 200) {
    return NextResponse.json({ error: "메시지는 200자 이하로 입력해주세요." }, { status: 400 });
  }

  const created = await prisma.chatMessage.create({
    data: { nickname: user.nickname, message: text },
  });

  return NextResponse.json({
    ok: true,
    chat: {
      id: created.id,
      nickname: created.nickname,
      message: created.message,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
