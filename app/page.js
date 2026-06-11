import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
  });

  let myBets = [];
  if (user) {
    myBets = await prisma.bet.findMany({
      where: { userId: user.id },
      include: { match: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // Date 객체를 직렬화 가능한 형태로 변환
  const matchesData = matches.map((m) => ({
    ...m,
    kickoff: m.kickoff.toISOString(),
    createdAt: m.createdAt.toISOString(),
  }));
  const betsData = myBets.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    match: {
      ...b.match,
      kickoff: b.match.kickoff.toISOString(),
      createdAt: b.match.createdAt.toISOString(),
    },
  }));

  const userData = user
    ? { id: user.id, nickname: user.nickname, points: user.points }
    : null;

  return (
    <HomeClient
      initialUser={userData}
      matches={matchesData}
      initialBets={betsData}
    />
  );
}
