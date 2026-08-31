import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { rows } = await pool.query(
      `SELECT id, routine_id, started_at, state FROM active_sessions WHERE user_id = $1`,
      [userId]
    );
    if (rows.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    if (body.state === undefined || body.state === null) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    const result = await pool.query(
      `UPDATE active_sessions SET state = $1, updated_at = now() WHERE user_id = $2`,
      [JSON.stringify(body.state), userId]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "no active session" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    await pool.query(`DELETE FROM active_sessions WHERE user_id = $1`, [userId]);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
