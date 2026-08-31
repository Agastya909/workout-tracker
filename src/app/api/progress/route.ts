import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") ?? "30", 10);

    const { rows } = await pool.query(
      `SELECT DISTINCT e.id, e.name
       FROM workout_sets ws
       JOIN workouts w ON w.id = ws.workout_id
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE w.user_id = $1 AND w.date >= now() - ($2 || ' days')::interval
       ORDER BY e.name ASC`,
      [userId, days]
    );
    return NextResponse.json(rows);
  } catch (err) {
    return handleApiError(err);
  }
}
