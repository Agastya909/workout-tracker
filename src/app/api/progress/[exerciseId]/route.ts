import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

function estimated1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { exerciseId } = await params;
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") ?? "30", 10);

    const { rows } = await pool.query(
      `SELECT w.date, ws.set_number, ws.weight, ws.reps, ws.is_bodyweight
       FROM workout_sets ws
       JOIN workouts w ON w.id = ws.workout_id
       WHERE ws.exercise_id = $1 AND w.user_id = $2
         AND w.date >= now() - ($3 || ' days')::interval
       ORDER BY w.date ASC, ws.set_number ASC`,
      [exerciseId, userId, days]
    );

    const byDate = new Map<
      string,
      { date: string; best1RM: number; bestReps: number; isBodyweight: boolean }
    >();

    // dateKey -> setNumber -> { 1RM, reps }
    const bySet = new Map<string, Map<number, { value1RM: number; reps: number; isBodyweight: boolean }>>();

    for (const row of rows) {
      const dateKey = new Date(row.date).toISOString().slice(0, 10);
      const isBodyweight = row.is_bodyweight;
      const reps = row.reps ?? 0;
      const value1RM = isBodyweight ? 0 : estimated1RM(Number(row.weight ?? 0), reps);

      const existing = byDate.get(dateKey);
      if (!existing) {
        byDate.set(dateKey, { date: dateKey, best1RM: value1RM, bestReps: reps, isBodyweight });
      } else {
        if (isBodyweight) {
          existing.bestReps = Math.max(existing.bestReps, reps);
        } else if (value1RM > existing.best1RM) {
          existing.best1RM = value1RM;
          existing.bestReps = reps;
        }
        existing.isBodyweight = existing.isBodyweight || isBodyweight;
      }

      if (!bySet.has(dateKey)) bySet.set(dateKey, new Map());
      // if a set_number repeats within the same session (shouldn't normally), keep the higher 1RM
      const setMap = bySet.get(dateKey)!;
      const existingSet = setMap.get(row.set_number);
      if (!existingSet || value1RM > existingSet.value1RM || isBodyweight) {
        setMap.set(row.set_number, { value1RM, reps, isBodyweight });
      }
    }

    const points = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

    const maxSetNumber = rows.reduce((max, r) => Math.max(max, r.set_number), 0);
    const dates = Array.from(bySet.keys()).sort((a, b) => a.localeCompare(b));
    const setSeries = Array.from({ length: maxSetNumber }, (_, i) => i + 1).map((setNumber) => ({
      setNumber,
      points: dates
        .map((date) => {
          const entry = bySet.get(date)?.get(setNumber);
          if (!entry) return null;
          return {
            date,
            value: entry.isBodyweight ? entry.reps : Math.round(entry.value1RM * 10) / 10,
            isBodyweight: entry.isBodyweight,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null),
    }));

    return NextResponse.json({ points, setSeries });
  } catch (err) {
    return handleApiError(err);
  }
}
