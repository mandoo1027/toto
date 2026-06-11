import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 경기별 베팅 현황 (누가 어디에 베팅했는지)
// ?matchId=<id> 지정 시 해당 경기만, 없으면 전체 경기
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const matchIdParam = searchParams.get("matchId");

  const where = {};
  if (matchIdParam) {
    const mid = parseInt(matchIdParam, 10);
    if (!Number.isNaN(mid)) where.matchId = mid;
  }

  const bets = await prisma.bet.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: { user: { select: { nickname: true } } },
  });

  // matchId별로 그룹화
  const byMatch = {};
  for (const b of bets) {
    if (!byMatch[b.matchId]) {
      byMatch[b.matchId] = { HOME: [], DRAW: [], AWAY: [] };
    }
    byMatch[b.matchId][b.pick].push({
      nickname: b.user.nickname,
      amount: b.amount,
    });
  }

  return NextResponse.json({ byMatch });
}
