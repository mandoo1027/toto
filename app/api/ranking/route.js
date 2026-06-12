import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 승률 랭킹
// 정산 완료된 베팅(WON/LOST) 기준으로 승률 계산
// 동률 시 보유 포인트 순으로 정렬
export async function GET() {
  const users = await prisma.user.findMany({
    include: {
      bets: {
        where: { status: { in: ["WON", "LOST"] } },
        select: { status: true },
      },
    },
  });

  const ranking = users
    .map((u) => {
      const settled = u.bets.length;
      const won = u.bets.filter((b) => b.status === "WON").length;
      const winRate = settled > 0 ? won / settled : 0;
      return {
        nickname: u.nickname,
        points: u.points,
        won,
        lost: settled - won,
        settled,
        winRate,
      };
    })
    // 정산된 베팅이 1건 이상인 유저만 랭킹에 포함
    .filter((u) => u.settled > 0)
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.won !== a.won) return b.won - a.won;
      return b.settled - a.settled;
    });

  return NextResponse.json({ ranking });
}
