import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const state = body.state ?? {};

    const { rows } = await pool.query(
      `INSERT INTO active_sessions (user_id, routine_id, state)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [userId, body.routine_id ?? null, JSON.stringify(state)]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
