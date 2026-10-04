import { createHmac, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE = "pc_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

const sign = (value: string, key: string) => createHmac("sha256", key).update(value).digest("hex");

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function adminKey(): string | null {
  return process.env.ADMIN_KEY?.trim() || null;
}

export function checkPassword(input: string): boolean {
  const key = adminKey();
  return !!key && safeEqual(sign(input.trim(), "pc-pw"), sign(key, "pc-pw"));
}

export function startSession() {
  const key = adminKey();
  if (!key) throw new Error("ADMIN_KEY is not configured.");
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  setCookie(COOKIE, `${exp}.${sign(exp, key)}`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function endSession() {
  deleteCookie(COOKIE, { path: "/" });
}

export function isAdmin(): boolean {
  const key = adminKey();
  const raw = getCookie(COOKIE);
  if (!key || !raw) return false;
  const [exp, mac] = raw.split(".");
  if (!exp || !mac || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(mac, sign(exp, key));
}

export function requireAdmin() {
  if (!isAdmin()) throw new Error("Your admin session expired. Sign in again.");
}
