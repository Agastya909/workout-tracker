import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ exId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { exId: reId } = await params;

    const owner = await pool.query(
      `SELECT rt.user_id FROM routine_exercises re JOIN routines rt ON rt.id = re.routine_id WHERE re.id = $1`,
      [reId]
    );
    if (owner.rows.length === 0 || owner.rows[0].user_id !== userId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const body = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO routine_sets (routine_exercise_id, set_number, default_reps, default_weight)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [reId, body.set_number, body.default_reps ?? null, body.default_weight ?? null]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
