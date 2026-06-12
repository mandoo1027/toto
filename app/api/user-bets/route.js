import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 특정 유저(닉네임)의 베팅 내역 조회 (랭킹 클릭 시 결과 팝업용)
export async function GET(req) {
  const nickname = new URL(req.url).searchParams.get("nickname");
  if (!nickname) {
    return NextResponse.json({ error: "닉네임이 필요합니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { nickname },
    include: {
      bets: {
        // 메인 경기 목록과 동일하게 킥오프 시간 순서로 정렬
        orderBy: { match: { kickoff: "asc" } },
        include: {
          match: {
            select: {
              homeTeam: true,
              awayTeam: true,
              homeFlag: true,
              awayFlag: true,
              kickoff: true,
              status: true,
              result: true,
              homeScore: true,
              awayScore: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "유저를 찾을 수 없습니다." }, { status: 404 });
  }

  const bets = user.bets.map((b) => ({
    id: b.id,
    pick: b.pick,
    status: b.status,
    homeTeam: b.match.homeTeam,
    awayTeam: b.match.awayTeam,
    homeFlag: b.match.homeFlag,
    awayFlag: b.match.awayFlag,
    kickoff: b.match.kickoff,
    matchStatus: b.match.status,
    result: b.match.result,
    homeScore: b.match.homeScore,
    awayScore: b.match.awayScore,
  }));

  const settled = bets.filter((b) => b.status === "WON" || b.status === "LOST");
  const won = settled.filter((b) => b.status === "WON").length;

  return NextResponse.json({
    nickname: user.nickname,
    won,
    lost: settled.length - won,
    settled: settled.length,
    bets,
  });
}
