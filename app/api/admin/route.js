import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_RESULTS = ["HOME", "DRAW", "AWAY"];

function checkAdmin(req) {
  const pw = req.headers.get("x-admin-password");
  return pw && pw === process.env.ADMIN_PASSWORD;
}

// 관리자: 경기 목록 + 베팅 통계
export async function GET(req) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }
  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    include: { _count: { select: { bets: true } } },
  });
  return NextResponse.json({ matches });
}

// 관리자: 경기 등록
export async function POST(req) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }
  const body = await req.json();
  const {
    homeTeam, awayTeam, homeFlag, awayFlag, venue, stage,
    kickoff, oddsHome, oddsDraw, oddsAway,
  } = body;

  if (!homeTeam || !awayTeam || !kickoff) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const match = await prisma.match.create({
    data: {
      homeTeam, awayTeam,
      homeFlag: homeFlag || "",
      awayFlag: awayFlag || "",
      venue: venue || "",
      stage: stage || "",
      kickoff: new Date(kickoff),
      oddsHome: parseFloat(oddsHome) || 2.0,
      oddsDraw: parseFloat(oddsDraw) || 3.0,
      oddsAway: parseFloat(oddsAway) || 2.0,
    },
  });
  return NextResponse.json({ ok: true, match });
}

// 관리자: 결과 입력 + 정산
export async function PATCH(req) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }
  const { matchId, result, homeScore, awayScore } = await req.json();

  if (!VALID_RESULTS.includes(result)) {
    return NextResponse.json({ error: "잘못된 결과값" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "경기 없음" }, { status: 404 });
  }
  if (match.status === "FINISHED") {
    return NextResponse.json({ error: "이미 정산된 경기" }, { status: 400 });
  }

  // 해당 경기 모든 베팅 정산
  const bets = await prisma.bet.findMany({
    where: { matchId, status: "PENDING" },
  });

  // 적중 여부 기록만 남기고 포인트 증액은 하지 않음 (랭킹은 적중 기록 기반)
  const ops = [];
  for (const bet of bets) {
    const won = bet.pick === result;
    ops.push(
      prisma.bet.update({
        where: { id: bet.id },
        data: { status: won ? "WON" : "LOST", payout: 0 },
      })
    );
  }

  ops.push(
    prisma.match.update({
      where: { id: matchId },
      data: {
        status: "FINISHED",
        result,
        homeScore: homeScore != null ? parseInt(homeScore, 10) : null,
        awayScore: awayScore != null ? parseInt(awayScore, 10) : null,
      },
    })
  );

  await prisma.$transaction(ops);

  return NextResponse.json({ ok: true, settled: bets.length });
}
