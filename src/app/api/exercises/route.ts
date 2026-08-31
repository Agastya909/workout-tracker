import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { rows } = await pool.query(
      `SELECT id, name, muscle_group, type, is_global, user_id
       FROM exercises WHERE is_global = true OR user_id = $1
       ORDER BY name ASC`,
      [userId]
    );
    return NextResponse.json(rows);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO exercises (name, muscle_group, type, is_global, user_id)
       VALUES ($1, $2, $3, false, $4) RETURNING id`,
      [body.name, body.muscle_group, body.type, userId]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
