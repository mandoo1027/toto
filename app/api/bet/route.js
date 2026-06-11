import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const VALID_PICKS = ["HOME", "DRAW", "AWAY"];
// 한 게임당 베팅 금액 고정 (변경 불가)
const BET_AMOUNT = 5000;

// 베팅 등록
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { matchId, pick } = await req.json();
  const amt = BET_AMOUNT;

  if (!VALID_PICKS.includes(pick)) {
    return NextResponse.json({ error: "잘못된 선택입니다." }, { status: 400 });
  }
  if (amt > user.points) {
    return NextResponse.json({ error: "보유 포인트가 부족합니다." }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
  }
  if (match.status !== "SCHEDULED") {
    return NextResponse.json({ error: "베팅이 마감된 경기입니다." }, { status: 400 });
  }
  if (new Date(match.kickoff).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "베팅이 마감되었습니다. (킥오프 시각 마감)" },
      { status: 400 }
    );
  }

  // 동일 경기 중복 베팅 방지
  const existing = await prisma.bet.findFirst({
    where: { userId: user.id, matchId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 이 경기에 베팅하셨습니다." },
      { status: 400 }
    );
  }

  const odds =
    pick === "HOME" ? match.oddsHome : pick === "DRAW" ? match.oddsDraw : match.oddsAway;

  // 포인트 차감 + 베팅 생성 (트랜잭션)
  const [, bet] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { points: { decrement: amt } },
    }),
    prisma.bet.create({
      data: {
        userId: user.id,
        matchId,
        pick,
        amount: amt,
        oddsAtBet: odds,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, betId: bet.id });
}

// 내 베팅 내역 조회
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const bets = await prisma.bet.findMany({
    where: { userId: user.id },
    include: { match: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ bets });
}
