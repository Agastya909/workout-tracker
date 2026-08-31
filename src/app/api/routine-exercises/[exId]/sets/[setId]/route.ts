import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ exId: string; setId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { exId: reId, setId } = await params;
    const result = await pool.query(
      `DELETE FROM routine_sets rs
       USING routine_exercises re
       JOIN routines rt ON rt.id = re.routine_id
       WHERE rs.id = $1 AND rs.routine_exercise_id = $2 AND re.id = $2 AND rt.user_id = $3`,
      [setId, reId, userId]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
