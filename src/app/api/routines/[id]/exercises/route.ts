import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: routineId } = await params;

    const owner = await pool.query(
      `SELECT user_id FROM routines WHERE id = $1`,
      [routineId]
    );
    if (owner.rows.length === 0 || owner.rows[0].user_id !== userId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const body = await req.json();
    if (!body.exercise_id) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO routine_exercises (routine_id, exercise_id, position)
       VALUES ($1, $2, (SELECT COALESCE(MAX(position)+1, 0) FROM routine_exercises WHERE routine_id = $1))
       RETURNING id`,
      [routineId, body.exercise_id]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
