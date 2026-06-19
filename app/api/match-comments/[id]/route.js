import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// 본인 댓글 수정
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { message } = await req.json();
  const text = (message || "").trim();
  if (!text) {
    return NextResponse.json({ error: "댓글을 입력해주세요." }, { status: 400 });
  }
  if (text.length > 200) {
    return NextResponse.json({ error: "댓글은 200자 이하로 입력해주세요." }, { status: 400 });
  }

  const comment = await prisma.matchComment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "존재하지 않는 댓글입니다." }, { status: 404 });
  }
  // 본인 댓글만 수정 가능 (닉네임은 User.nickname @unique)
  if (comment.nickname !== user.nickname) {
    return NextResponse.json({ error: "본인 댓글만 수정할 수 있습니다." }, { status: 403 });
  }

  const updated = await prisma.matchComment.update({
    where: { id },
    data: { message: text },
  });

  return NextResponse.json({
    ok: true,
    comment: {
      id: updated.id,
      nickname: updated.nickname,
      message: updated.message,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

// 본인 댓글 삭제
export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const comment = await prisma.matchComment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "존재하지 않는 댓글입니다." }, { status: 404 });
  }
  // 본인 댓글만 삭제 가능
  if (comment.nickname !== user.nickname) {
    return NextResponse.json({ error: "본인 댓글만 삭제할 수 있습니다." }, { status: 403 });
  }

  await prisma.matchComment.delete({ where: { id } });

  return NextResponse.json({ ok: true, id });
}
