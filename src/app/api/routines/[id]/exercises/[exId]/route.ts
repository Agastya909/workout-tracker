import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; exId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: routineId, exId } = await params;
    const result = await pool.query(
      `DELETE FROM routine_exercises re
       USING routines rt
       WHERE re.id = $1 AND re.routine_id = $2 AND rt.id = re.routine_id AND rt.user_id = $3`,
      [exId, routineId, userId]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
