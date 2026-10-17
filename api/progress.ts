/**
 * Reading progress for the web edition: which chapters a reader has ticked in the sidebar.
 *
 * A reader is their email, with no verification — anyone who types an address sees that
 * address's ticks. That is accepted: the data is a reading list, not an account. The sign-in
 * form says the name and email are stored.
 *
 *   readers          set   every email that has signed in (SMEMBERS readers lists them)
 *   reader:{email}   hash  { name, createdAt }
 *   done:{email}     set   chapter slugs, "/book/part-1/closures" — locale-free, so the
 *                          English and Bangla editions share one record
 *
 * Reached at /handbook/api/progress through the /handbook/:path* rewrite in vercel.json.
 */
import { Redis } from "@upstash/redis";

// The Vercel Marketplace integration names the variables KV_REST_API_*; a database made in
// Upstash's own console names them UPSTASH_REDIS_REST_*.
const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const SLUG = /^\/book\/[a-z0-9/-]{1,150}$/;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function emailOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL.test(email) ? email : null;
}

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json();
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Sign in: `{ name, email }` → `{ name, done }`. Signing in again keeps the first name. */
export async function POST(request: Request): Promise<Response> {
  const input = await body(request);
  const email = emailOf(input.email);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!email || !name || name.length > 80) return json({ error: "invalid" }, 400);

  await redis.hsetnx(`reader:${email}`, "name", name);
  await redis.hsetnx(`reader:${email}`, "createdAt", new Date().toISOString());
  await redis.sadd("readers", email);

  const [stored, done] = await Promise.all([
    redis.hget<string>(`reader:${email}`, "name"),
    redis.smembers(`done:${email}`),
  ]);
  return json({ name: stored ?? name, done });
}

/** `?email=` → `{ done }`. */
export async function GET(request: Request): Promise<Response> {
  const email = emailOf(new URL(request.url).searchParams.get("email"));
  if (!email) return json({ error: "invalid" }, 400);
  return json({ done: await redis.smembers(`done:${email}`) });
}

/** Tick or untick one chapter: `{ email, slug, done }`. */
export async function PUT(request: Request): Promise<Response> {
  const input = await body(request);
  const email = emailOf(input.email);
  const { slug, done } = input;
  if (!email || typeof slug !== "string" || !SLUG.test(slug) || typeof done !== "boolean") {
    return json({ error: "invalid" }, 400);
  }
  // Only a signed-in reader gets a record, so a typo'd address cannot start one here.
  if (!(await redis.sismember("readers", email))) return json({ error: "unknown" }, 404);

  if (done) await redis.sadd(`done:${email}`, slug);
  else await redis.srem(`done:${email}`, slug);
  return json({ ok: true });
}
