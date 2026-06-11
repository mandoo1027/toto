import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 2026 FIFA 월드컵 본선 A조 - 대한민국 경기 일정 (한국시간 기준)
// 출처: FIFA / 언론 보도 (모든 경기 멕시코 개최)
const matches = [
  {
    homeTeam: "대한민국",
    awayTeam: "체코",
    homeFlag: "🇰🇷",
    awayFlag: "🇨🇿",
    venue: "에스타디오 아크론 (과달라하라)",
    stage: "A조 1차전",
    kickoff: new Date("2026-06-12T11:00:00+09:00"),
    oddsHome: 2.6,
    oddsDraw: 3.2,
    oddsAway: 2.5,
  },
  {
    homeTeam: "멕시코",
    awayTeam: "대한민국",
    homeFlag: "🇲🇽",
    awayFlag: "🇰🇷",
    venue: "에스타디오 아크론 (과달라하라)",
    stage: "A조 2차전",
    kickoff: new Date("2026-06-19T10:00:00+09:00"),
    oddsHome: 1.9,
    oddsDraw: 3.3,
    oddsAway: 3.6,
  },
  {
    homeTeam: "대한민국",
    awayTeam: "남아프리카공화국",
    homeFlag: "🇰🇷",
    awayFlag: "🇿🇦",
    venue: "에스타디오 BBVA (몬테레이)",
    stage: "A조 3차전",
    kickoff: new Date("2026-06-25T10:00:00+09:00"),
    oddsHome: 1.7,
    oddsDraw: 3.5,
    oddsAway: 4.5,
  },
];

async function main() {
  console.log("기존 데이터 정리...");
  await prisma.bet.deleteMany();
  await prisma.match.deleteMany();

  console.log("경기 데이터 삽입...");
  for (const m of matches) {
    await prisma.match.create({ data: m });
    console.log(`  + ${m.homeTeam} vs ${m.awayTeam} (${m.stage})`);
  }

  console.log("완료!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
