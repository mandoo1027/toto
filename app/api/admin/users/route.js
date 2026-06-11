import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function checkAdmin(req) {
  const pw = req.headers.get("x-admin-password");
  return pw && pw === process.env.ADMIN_PASSWORD;
}

// 관리자: 계정 목록 (베팅 수 포함)
export async function GET(req) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { bets: true } } },
  });
  return NextResponse.json({ users });
}

// 관리자: 계정 삭제 (해당 계정의 베팅도 모두 삭제)
export async function DELETE(req) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const userId = parseInt(searchParams.get("userId"), 10);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "잘못된 userId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
  }

  // 베팅 먼저 삭제 후 계정 삭제 (트랜잭션)
  const [delBets] = await prisma.$transaction([
    prisma.bet.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ ok: true, deletedBets: delBets.count });
}
