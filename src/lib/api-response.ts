import { NextResponse } from "next/server";
import { UnauthorizedError } from "./api-auth";

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  console.error(err);
  return NextResponse.json({ error: "internal error" }, { status: 500 });
}
