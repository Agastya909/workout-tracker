import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT ws.id, ws.exercise_id, e.name as exercise_name, ws.set_number, ws.reps, ws.weight, ws.rpe, ws.is_bodyweight
       FROM workout_sets ws
       JOIN exercises e ON e.id = ws.exercise_id
       JOIN workouts w ON w.id = ws.workout_id
       WHERE ws.workout_id = $1 AND w.user_id = $2
       ORDER BY ws.set_number ASC`,
      [id, userId]
    );
    return NextResponse.json({ sets: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const result = await pool.query(
      `DELETE FROM workouts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
