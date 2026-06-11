import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "toto_uid";

// 쿠키에 저장된 user id로 현재 사용자 조회 (없으면 null)
export async function getCurrentUser() {
  const uid = cookies().get(COOKIE)?.value;
  if (!uid) return null;
  const id = parseInt(uid, 10);
  if (Number.isNaN(id)) return null;
  return prisma.user.findUnique({ where: { id } });
}

export function setUserCookie(userId) {
  cookies().set(COOKIE, String(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/toto",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearUserCookie() {
  cookies().delete(COOKIE);
}
