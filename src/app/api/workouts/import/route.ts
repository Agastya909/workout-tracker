import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

type ImportSet = {
  set_number: number;
  weight: number | null;
  reps: number;
  is_bodyweight: boolean;
};

type ImportExercise = {
  exercise_name: string;
  sets: ImportSet[];
};

type ImportSession = {
  date: string;
  workout_name: string;
  exercises: ImportExercise[];
};

function inferMuscleGroup(name: string): string {
  const n = name.toLowerCase();
  if (/chest|pec|bench|fly|press.*incline|incline.*press/.test(n)) return "Chest";
  if (/row|pulldown|pull.?up|lat|deadlift|sdl/.test(n)) return "Back";
  if (/shoulder|lateral raise|ohp|overhead press|delt/.test(n)) return "Shoulders";
  if (/squat|leg|calf|ham|quad|hip/.test(n)) return "Legs";
  if (/curl|tricep|bicep/.test(n)) return "Arms";
  return "Other";
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const userId = await requireUserId();
    const body: { sessions: ImportSession[] } = await req.json();
    const sessions = body.sessions ?? [];

    if (sessions.length === 0) {
      return NextResponse.json({ error: "no sessions to import" }, { status: 400 });
    }

    await client.query("BEGIN");

    const exerciseIdCache = new Map<string, string>();

    async function resolveExerciseId(name: string): Promise<string> {
      const key = name.trim().toLowerCase();
      const cached = exerciseIdCache.get(key);
      if (cached) return cached;

      const existing = await client.query(
        `SELECT id FROM exercises WHERE lower(name) = $1 AND (is_global = true OR user_id = $2) LIMIT 1`,
        [key, userId]
      );
      if (existing.rows.length > 0) {
        exerciseIdCache.set(key, existing.rows[0].id);
        return existing.rows[0].id;
      }

      const created = await client.query(
        `INSERT INTO exercises (name, muscle_group, type, is_global, user_id)
         VALUES ($1, $2, 'strength', false, $3) RETURNING id`,
        [name.trim(), inferMuscleGroup(name), userId]
      );
      exerciseIdCache.set(key, created.rows[0].id);
      return created.rows[0].id;
    }

    let workoutsCreated = 0;
    let setsCreated = 0;

    for (const session of sessions) {
      const workoutResult = await client.query(
        `INSERT INTO workouts (user_id, name, date, notes) VALUES ($1, $2, $3, '') RETURNING id`,
        [userId, session.workout_name, new Date(session.date)]
      );
      const workoutId = workoutResult.rows[0].id;
      workoutsCreated++;

      for (const exercise of session.exercises) {
        const exerciseId = await resolveExerciseId(exercise.exercise_name);
        for (const set of exercise.sets) {
          await client.query(
            `INSERT INTO workout_sets (workout_id, exercise_id, set_number, reps, weight, is_bodyweight, notes)
             VALUES ($1, $2, $3, $4, $5, $6, '')`,
            [
              workoutId,
              exerciseId,
              set.set_number,
              set.reps,
              set.is_bodyweight ? null : set.weight,
              set.is_bodyweight,
            ]
          );
          setsCreated++;
        }
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ workouts_created: workoutsCreated, sets_created: setsCreated }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    return handleApiError(err);
  } finally {
    client.release();
  }
}
