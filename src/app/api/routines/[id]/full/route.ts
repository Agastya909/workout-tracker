import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

type IncomingSet = {
  set_number: number;
  default_reps: number | null;
  default_weight: number | null;
};

type IncomingExercise = {
  exercise_id: string;
  sets: IncomingSet[];
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const userId = await requireUserId();
    const { id: routineId } = await params;
    const body: { exercises: IncomingExercise[] } = await req.json();

    const owner = await pool.query(
      `SELECT user_id FROM routines WHERE id = $1`,
      [routineId]
    );
    if (owner.rows.length === 0 || owner.rows[0].user_id !== userId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    await client.query("BEGIN");

    await client.query(`DELETE FROM routine_exercises WHERE routine_id = $1`, [
      routineId,
    ]);

    for (let pos = 0; pos < (body.exercises ?? []).length; pos++) {
      const ex = body.exercises[pos];
      const { rows } = await client.query(
        `INSERT INTO routine_exercises (routine_id, exercise_id, position) VALUES ($1, $2, $3) RETURNING id`,
        [routineId, ex.exercise_id, pos]
      );
      const reId = rows[0].id;
      for (const s of ex.sets ?? []) {
        await client.query(
          `INSERT INTO routine_sets (routine_exercise_id, set_number, default_reps, default_weight) VALUES ($1, $2, $3, $4)`,
          [reId, s.set_number, s.default_reps ?? null, s.default_weight ?? null]
        );
      }
    }

    await client.query(`UPDATE routines SET updated_at = now() WHERE id = $1`, [
      routineId,
    ]);

    await client.query("COMMIT");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    await client.query("ROLLBACK");
    return handleApiError(err);
  } finally {
    client.release();
  }
}
