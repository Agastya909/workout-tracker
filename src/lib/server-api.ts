import { headers, cookies } from "next/headers";

export async function serverFetch<T>(path: string): Promise<T | null> {
  const h = await headers();
  const host = h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const cookieStore = await cookies();

  const res = await fetch(`${protocol}://${host}/api${path}`, {
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}
