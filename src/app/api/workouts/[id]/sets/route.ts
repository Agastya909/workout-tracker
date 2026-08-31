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
    const { id: workoutId } = await params;
    const body = await req.json();

    const owner = await pool.query(
      `SELECT user_id FROM workouts WHERE id = $1`,
      [workoutId]
    );
    if (owner.rows.length === 0 || owner.rows[0].user_id !== userId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const { rows } = await pool.query(
      `INSERT INTO workout_sets (workout_id, exercise_id, set_number, reps, weight, rpe, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        workoutId,
        body.exercise_id,
        body.set_number,
        body.reps ?? null,
        body.weight ?? null,
        body.rpe ?? null,
        body.notes ?? "",
      ]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
