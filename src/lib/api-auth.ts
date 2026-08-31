import { createClient } from "./supabase/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}
