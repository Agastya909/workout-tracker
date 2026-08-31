import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

type FinishedSet = {
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  notes: string;
};

type NewRoutineSet = {
  set_number: number;
  default_reps: number | null;
  default_weight: number | null;
};

type NewRoutineExercise = {
  exercise_id: string;
  sets: NewRoutineSet[];
};

type ModifiedExerciseSets = {
  routine_exercise_id: string;
  new_set_count: number;
  sets_to_add: NewRoutineSet[];
};

type RoutineUpdate = {
  new_exercises?: NewRoutineExercise[];
  modified_sets?: ModifiedExerciseSets[];
};

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const userId = await requireUserId();
    const body: {
      name: string;
      notes: string;
      routine_id?: string | null;
      sets: FinishedSet[];
      routine_update?: RoutineUpdate | null;
    } = await req.json();

    await client.query("BEGIN");

    const workoutResult = await client.query(
      `INSERT INTO workouts (user_id, name, notes) VALUES ($1, $2, $3) RETURNING id`,
      [userId, body.name, body.notes ?? ""]
    );
    const workoutId = workoutResult.rows[0].id;

    for (const s of body.sets ?? []) {
      await client.query(
        `INSERT INTO workout_sets (workout_id, exercise_id, set_number, reps, weight, rpe, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [workoutId, s.exercise_id, s.set_number, s.reps ?? null, s.weight ?? null, s.rpe ?? null, s.notes ?? ""]
      );
    }

    if (body.routine_update && body.routine_id) {
      for (const ex of body.routine_update.new_exercises ?? []) {
        let reId: string;
        try {
          const reResult = await client.query(
            `INSERT INTO routine_exercises (routine_id, exercise_id, position)
             VALUES ($1, $2, (SELECT COALESCE(MAX(position)+1, 0) FROM routine_exercises WHERE routine_id = $1))
             RETURNING id`,
            [body.routine_id, ex.exercise_id]
          );
          reId = reResult.rows[0].id;
        } catch {
          continue;
        }
        for (const s of ex.sets ?? []) {
          try {
            await client.query(
              `INSERT INTO routine_sets (routine_exercise_id, set_number, default_reps, default_weight)
               VALUES ($1, $2, $3, $4)`,
              [reId, s.set_number, s.default_reps ?? null, s.default_weight ?? null]
            );
          } catch {
            // best-effort, matches original handler
          }
        }
      }

      for (const ex of body.routine_update.modified_sets ?? []) {
        try {
          await client.query(
            `DELETE FROM routine_sets WHERE routine_exercise_id = $1 AND set_number > $2`,
            [ex.routine_exercise_id, ex.new_set_count]
          );
        } catch {
          // best-effort
        }
        for (const s of ex.sets_to_add ?? []) {
          try {
            await client.query(
              `INSERT INTO routine_sets (routine_exercise_id, set_number, default_reps, default_weight)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING`,
              [ex.routine_exercise_id, s.set_number, s.default_reps ?? null, s.default_weight ?? null]
            );
          } catch {
            // best-effort
          }
        }
      }
    }

    await client.query(`DELETE FROM active_sessions WHERE user_id = $1`, [userId]);

    await client.query("COMMIT");
    return NextResponse.json({ workout_id: workoutId });
  } catch (err) {
    await client.query("ROLLBACK");
    return handleApiError(err);
  } finally {
    client.release();
  }
}
