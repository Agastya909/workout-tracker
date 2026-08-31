import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; setId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: workoutId, setId } = await params;
    const result = await pool.query(
      `DELETE FROM workout_sets ws
       USING workouts wk
       WHERE ws.id = $1 AND ws.workout_id = $2 AND wk.id = ws.workout_id AND wk.user_id = $3`,
      [setId, workoutId, userId]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
