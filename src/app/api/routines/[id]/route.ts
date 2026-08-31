import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

type SetRow = {
  id: string;
  set_number: number;
  default_reps: number | null;
  default_weight: number | null;
};

type ExerciseRow = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  position: number;
  sets: SetRow[];
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const routineResult = await pool.query(
      `SELECT id, name, description FROM routines WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (routineResult.rows.length === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const routine = routineResult.rows[0];

    const exerciseResult = await pool.query(
      `SELECT re.id, re.exercise_id, e.name as exercise_name, e.muscle_group, re.position
       FROM routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.routine_id = $1
       ORDER BY re.position ASC`,
      [id]
    );

    const exMap = new Map<string, ExerciseRow>();
    const exOrder: string[] = [];
    for (const row of exerciseResult.rows) {
      exMap.set(row.id, { ...row, sets: [] });
      exOrder.push(row.id);
    }

    if (exOrder.length > 0) {
      const setResult = await pool.query(
        `SELECT rs.id, rs.routine_exercise_id, rs.set_number, rs.default_reps, rs.default_weight
         FROM routine_sets rs
         JOIN routine_exercises re ON re.id = rs.routine_exercise_id
         WHERE re.routine_id = $1
         ORDER BY rs.set_number ASC`,
        [id]
      );
      for (const row of setResult.rows) {
        const ex = exMap.get(row.routine_exercise_id);
        if (ex) {
          ex.sets.push({
            id: row.id,
            set_number: row.set_number,
            default_reps: row.default_reps,
            default_weight: row.default_weight,
          });
        }
      }
    }

    return NextResponse.json({
      id: routine.id,
      name: routine.name,
      description: routine.description,
      exercises: exOrder.map((exId) => exMap.get(exId)),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await req.json();
    await pool.query(
      `UPDATE routines SET
         name        = COALESCE($1, name),
         description = COALESCE($2, description),
         updated_at  = now()
       WHERE id = $3 AND user_id = $4`,
      [body.name ?? null, body.description ?? null, id, userId]
    );
    return new NextResponse(null, { status: 204 });
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
      `DELETE FROM routines WHERE id = $1 AND user_id = $2`,
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
