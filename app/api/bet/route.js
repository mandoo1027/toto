import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const VALID_PICKS = ["HOME", "DRAW", "AWAY"];
// 한 게임당 베팅 금액 고정
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

  const odds =
    pick === "HOME" ? match.oddsHome : pick === "DRAW" ? match.oddsDraw : match.oddsAway;

  // 기존 베팅이 있으면 선택 변경 (환급 후 재차감), 없으면 신규 베팅
  const existing = await prisma.bet.findFirst({
    where: { userId: user.id, matchId },
  });

  if (existing) {
    // 이미 같은 선택이면 변경 불필요
    if (existing.pick === pick) {
      return NextResponse.json({ ok: true, betId: existing.id, unchanged: true });
    }
    // 환급(+5000) 후 재차감(-5000) → 실질 변동 없으므로 선택/배당만 갱신
    const bet = await prisma.bet.update({
      where: { id: existing.id },
      data: { pick, amount: amt, oddsAtBet: odds },
    });
    return NextResponse.json({ ok: true, betId: bet.id, changed: true });
  }

  // 신규 베팅: 포인트 차감 + 생성 (트랜잭션)
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

// 베팅 취소 (킥오프 전, 본인 베팅만 / 포인트 환급)
export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { matchId } = await req.json();
  const mid = parseInt(matchId, 10);
  if (Number.isNaN(mid)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: mid } });
  if (!match) {
    return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
  }
  // 마감/종료된 경기는 취소 불가
  if (match.status !== "SCHEDULED" || new Date(match.kickoff).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "베팅이 마감되어 취소할 수 없습니다." },
      { status: 400 }
    );
  }

  // 본인 베팅 조회
  const bet = await prisma.bet.findFirst({
    where: { userId: user.id, matchId: mid },
  });
  if (!bet) {
    return NextResponse.json({ error: "취소할 베팅이 없습니다." }, { status: 404 });
  }

  // 포인트 환급 + 베팅 삭제 (트랜잭션)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: bet.amount } },
    }),
    prisma.bet.delete({ where: { id: bet.id } }),
  ]);

  return NextResponse.json({ ok: true, refunded: bet.amount });
}
