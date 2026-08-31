import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUserId } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const userId = await requireUserId();
    const { rows } = await pool.query(
      `SELECT id, name, date, notes, split_id, created_at
       FROM workouts WHERE user_id = $1
       ORDER BY date DESC LIMIT 50`,
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
    const date = body.date ? new Date(body.date) : new Date();
    const { rows } = await pool.query(
      `INSERT INTO workouts (user_id, name, date, notes, split_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, body.name, date, body.notes ?? "", body.split_id ?? null]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
