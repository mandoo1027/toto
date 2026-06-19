import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// 경기별 댓글 조회 (폴링)
// ?matchId=<id> 필수
// ?after=<id> 지정 시 해당 id 이후 댓글만 (증분 폴링)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const matchId = parseInt(searchParams.get("matchId") || "", 10);
  const after = parseInt(searchParams.get("after") || "0", 10);

  if (Number.isNaN(matchId)) {
    return NextResponse.json({ error: "matchId가 필요합니다." }, { status: 400 });
  }

  let comments;
  if (after > 0) {
    comments = await prisma.matchComment.findMany({
      where: { matchId, id: { gt: after } },
      orderBy: { id: "asc" },
      take: 100,
    });
  } else {
    // 최초 로드: 최근 50개를 시간순으로
    const recent = await prisma.matchComment.findMany({
      where: { matchId },
      orderBy: { id: "desc" },
      take: 50,
    });
    comments = recent.reverse();
  }

  const data = comments.map((c) => ({
    id: c.id,
    nickname: c.nickname,
    message: c.message,
    createdAt: c.createdAt.toISOString(),
  }));

  return NextResponse.json({ comments: data });
}

// 경기 댓글 작성
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { matchId, message } = await req.json();
  const mid = parseInt(matchId, 10);
  const text = (message || "").trim();

  if (Number.isNaN(mid)) {
    return NextResponse.json({ error: "matchId가 필요합니다." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "댓글을 입력해주세요." }, { status: 400 });
  }
  if (text.length > 200) {
    return NextResponse.json({ error: "댓글은 200자 이하로 입력해주세요." }, { status: 400 });
  }

  // 존재하는 경기인지 확인
  const match = await prisma.match.findUnique({ where: { id: mid } });
  if (!match) {
    return NextResponse.json({ error: "존재하지 않는 경기입니다." }, { status: 404 });
  }

  const created = await prisma.matchComment.create({
    data: { matchId: mid, nickname: user.nickname, message: text },
  });

  return NextResponse.json({
    ok: true,
    comment: {
      id: created.id,
      nickname: created.nickname,
      message: created.message,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
