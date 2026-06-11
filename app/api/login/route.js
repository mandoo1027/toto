import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setUserCookie } from "@/lib/session";

// 닉네임으로 로그인/가입 (간단 인증 - 비밀번호 없음, 가상 포인트 게임)
export async function POST(req) {
  const { nickname } = await req.json();
  const name = (nickname || "").trim();

  if (!name || name.length < 2 || name.length > 12) {
    return NextResponse.json(
      { error: "닉네임은 2~12자로 입력해주세요." },
      { status: 400 }
    );
  }

  let user = await prisma.user.findUnique({ where: { nickname: name } });
  if (!user) {
    user = await prisma.user.create({ data: { nickname: name } });
  }

  setUserCookie(user.id);
  return NextResponse.json({
    id: user.id,
    nickname: user.nickname,
    points: user.points,
  });
}
